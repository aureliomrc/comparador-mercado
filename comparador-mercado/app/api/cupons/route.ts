import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 🛡️ Helper à prova de falhas para resolver e validar o ID do Usuário
async function obterUsuarioId(usuarioIdentificador) {
  if (!usuarioIdentificador) return null;

  const termo = String(usuarioIdentificador || '').trim();
  if (!termo) return null;

  try {
    const idNumerico = Number(termo);
    if (!isNaN(idNumerico) && Number.isInteger(idNumerico) && idNumerico > 0) {
      const usuarioPorId = await prisma.usuario.findUnique({
        where: { id: idNumerico }
      });
      if (usuarioPorId) return usuarioPorId.id;
    }

    let usr = await prisma.usuario.findFirst({
      where: {
        OR: [
          { nome: termo },
          { email: termo }
        ]
      }
    });

    if (!usr) {
      usr = await prisma.usuario.create({
        data: { nome: termo }
      });
    }

    return usr ? usr.id : null;
  } catch (err) {
    console.error('Erro ao resolver usuarioId:', err);
    return null;
  }
}

// 🧠 Helper simples para extrair dados via Regex caso haja HTML da SEFAZ
function extrairDadosSefaz(html) {
  const itens = [];
  let mercado = '';

  if (!html || typeof html !== 'string') {
    return { mercado: '', itens: [] };
  }

  try {
    const matchMercado = html.match(/class=["']txtTopo["'][^>]*>([^<]+)/i) || 
                         html.match(/id=["']txtNomeEmpresa["'][^>]*>([^<]+)/i);
    if (matchMercado && matchMercado[1]) {
      mercado = matchMercado[1].trim();
    }

    const regexLinhaItem = /<tr[^>]*id=["']Item\s*\d+["'][^>]*>([\s\S]*?)<\/tr>/gi;
    let match;

    while ((match = regexLinhaItem.exec(html)) !== null) {
      const blocoTr = match[1] || '';
      const matchNome = blocoTr.match(/class=["']txtTxt["'][^>]*>([^<]+)/i);
      const matchQtd = blocoTr.match(/R\$[\s\S]*?<b>\s*([\d.,]+)\s*<\/b>/i);
      const matchPreco = blocoTr.match(/class=["']valor["'][^>]*>([^<]+)/i);

      if (matchNome && matchNome[1]) {
        itens.push({
          nome: String(matchNome[1]).trim().toUpperCase(),
          qtd: matchQtd && matchQtd[1] ? parseFloat(matchQtd[1].replace(',', '.')) : 1,
          preco: matchPreco && matchPreco[1] ? parseFloat(matchPreco[1].replace(',', '.')) : 0
        });
      }
    }
  } catch (e) {
    console.error('Erro ao processar HTML da SEFAZ:', e);
  }

  return { mercado, itens };
}

// 🟢 GET: Busca cupons salvos do usuário
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const usuarioParam = searchParams.get('usuario');

    if (!usuarioParam) {
      return NextResponse.json({ error: 'Usuário não informado' }, { status: 400 });
    }

    const usrId = await obterUsuarioId(usuarioParam);

    if (!usrId) {
      return NextResponse.json([]);
    }

    const cupons = await prisma.cupom.findMany({
      where: { usuarioId: usrId },
      orderBy: { criadoEm: 'desc' }
    });

    const cuponsFormatados = (cupons || []).map((c) => {
      let itensParsed = [];
      try {
        itensParsed = typeof c?.itens === 'string' ? JSON.parse(c.itens) : (c?.itens || []);
      } catch (e) {
        itensParsed = [];
      }
      return {
        ...c,
        itens: itensParsed
      };
    });

    return NextResponse.json(cuponsFormatados);
  } catch (error) {
    console.error('Erro no GET /api/cupons:', error);
    return NextResponse.json({ error: 'Erro ao buscar cupons' }, { status: 500 });
  }
}

// 🟢 POST: Processa e salva o cupom fiscal (Protegido contra Undefined)
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    
    // Tratamento seguro dos campos
    const usuario = body?.usuario;
    const mercadoDigitado = body?.mercado;
    const url = body?.url || '';
    const html = body?.html || '';
    const data = body?.data || new Date().toLocaleDateString('pt-BR');
    const hora = body?.hora || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    if (!usuario) {
      return NextResponse.json({ error: 'Usuário é obrigatório' }, { status: 400 });
    }

    let dadosExtraidos = { itens: [], mercado: '' };

    if (html) {
      dadosExtraidos = extrairDadosSefaz(html);
    } else if (url && typeof url === 'string' && url.startsWith('http')) {
      try {
        const resUrl = await fetch(url);
        if (resUrl?.ok) {
          const htmlTexto = await resUrl.text();
          dadosExtraidos = extrairDadosSefaz(htmlTexto);
        }
      } catch (e) {
        console.error('Erro ao buscar URL da SEFAZ:', e);
      }
    }

    // Prioriza o nome digitado no formulário
    const nomeMercadoFinal = (mercadoDigitado && String(mercadoDigitado).trim() !== '') 
      ? String(mercadoDigitado).trim().toUpperCase() 
      : (dadosExtraidos.mercado || 'MERCADO VIA QR CODE').toUpperCase();

    const usrId = await obterUsuarioId(usuario);

    if (!usrId) {
      return NextResponse.json({ error: 'Não foi possível associar a um usuário válido' }, { status: 400 });
    }

    const cupomSalvo = await prisma.cupom.create({
      data: {
        mercado: nomeMercadoFinal,
        url: url,
        data: data,
        hora: hora,
        itens: JSON.stringify(dadosExtraidos?.itens || []),
        usuarioId: usrId
      }
    });

    return NextResponse.json({
      ...cupomSalvo,
      itens: dadosExtraidos?.itens || []
    }, { status: 201 });

  } catch (error) {
    console.error('Erro detalhado no POST /api/cupons:', error);
    return NextResponse.json({ error: error?.message || 'Erro ao salvar cupom no banco' }, { status: 500 });
  }
}

// 🟢 DELETE: Remove um cupom salvo
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get('id');

    if (!idParam) {
      return NextResponse.json({ error: 'ID do cupom não informado' }, { status: 400 });
    }

    await prisma.cupom.delete({
      where: { id: parseInt(String(idParam), 10) }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro no DELETE /api/cupons:', error);
    return NextResponse.json({ error: 'Erro ao deletar cupom' }, { status: 500 });
  }
}