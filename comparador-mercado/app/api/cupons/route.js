import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 🛡️ Helper à prova de falhas para resolver e validar o ID do Usuário (Evita FK Error)
async function obterUsuarioId(usuarioIdentificador: any): Promise<number | null> {
  if (!usuarioIdentificador) return null;

  const termo = String(usuarioIdentificador).trim();
  if (!termo) return null;

  try {
    // 1. Tenta buscar primeiro por ID numérico
    const idNumerico = Number(termo);
    if (!isNaN(idNumerico) && Number.isInteger(idNumerico) && idNumerico > 0) {
      const usuarioPorId = await prisma.usuario.findUnique({
        where: { id: idNumerico }
      });
      if (usuarioPorId) return usuarioPorId.id;
    }

    // 2. Busca por nome ou e-mail na tabela Usuario
    let usr = await prisma.usuario.findFirst({
      where: {
        OR: [
          { nome: termo },
          { email: termo }
        ]
      }
    });

    // 3. Se não existir, cria o usuário para ter a chave estrangeira válida
    if (!usr) {
      usr = await prisma.usuario.create({
        data: { nome: termo }
      });
    }

    return usr ? usr.id : null;
  } catch (err) {
    console.error('Erro ao resolver usuarioId no cupons:', err);
    return null;
  }
}

// 🧠 Helper simples para extrair dados via Regex caso haja HTML da SEFAZ
function extrairDadosSefaz(html: string) {
  const itens: any[] = [];
  let mercado = '';

  try {
    // Tenta capturar Razão Social / Nome do Estabelecimento no HTML
    const matchMercado = html.match(/class=["']txtTopo["'][^>]*>([^<]+)/i) || 
                         html.match(/id=["']txtNomeEmpresa["'][^>]*>([^<]+)/i);
    if (matchMercado && matchMercado[1]) {
      mercado = matchMercado[1].trim();
    }

    // Exemplo de Regex para extrair itens (adapta conforme layout da SEFAZ do seu estado)
    const regexLinhaItem = /<tr[^>]*id=["']Item\s*\d+["'][^>]*>([\s\S]*?)<\/tr>/gi;
    let match;

    while ((match = regexLinhaItem.exec(html)) !== null) {
      const blocoTr = match[1];
      const matchNome = blocoTr.match(/class=["']txtTxt["'][^>]*>([^<]+)/i);
      const matchQtd = blocoTr.match(/R\$[\s\S]*?<b>\s*([\d.,]+)\s*<\/b>/i);
      const matchPreco = blocoTr.match(/class=["']valor["'][^>]*>([^<]+)/i);

      if (matchNome) {
        itens.push({
          nome: matchNome[1].trim().toUpperCase(),
          qtd: matchQtd ? parseFloat(matchQtd[1].replace(',', '.')) : 1,
          preco: matchPreco ? parseFloat(matchPreco[1].replace(',', '.')) : 0
        });
      }
    }
  } catch (e) {
    console.error('Erro ao processar HTML da SEFAZ via regex:', e);
  }

  return { mercado, itens };
}

// 🟢 GET: Busca cupons salvos do usuário
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const usuarioParam = searchParams.get('usuario');

  if (!usuarioParam) {
    return NextResponse.json({ error: 'Usuário não informado' }, { status: 400 });
  }

  try {
    const usrId = await obterUsuarioId(usuarioParam);

    if (!usrId) {
      return NextResponse.json([]);
    }

    const cupons = await prisma.cupom.findMany({
      where: { usuarioId: usrId },
      orderBy: { criadoEm: 'desc' }
    });

    // Converte o campo 'itens' de string JSON de volta para Array para o frontend
    const cuponsFormatados = cupons.map((c: any) => {
      let itensParsed = [];
      try {
        itensParsed = typeof c.itens === 'string' ? JSON.parse(c.itens) : c.itens;
      } catch (e) {
        itensParsed = [];
      }
      return {
        ...c,
        itens: itensParsed
      };
    });

    return NextResponse.json(cuponsFormatados);
  } catch (error: any) {
    console.error('Erro no GET /api/cupons:', error);
    return NextResponse.json({ error: 'Erro ao buscar cupons' }, { status: 500 });
  }
}

// 🟢 POST: Processa e salva o cupom fiscal com PRIORIDADE para o Nome Fantasia
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { usuario, mercado: mercadoDigitado, url, html, data, hora } = body;

    if (!usuario) {
      return NextResponse.json({ error: 'Usuário é obrigatório' }, { status: 400 });
    }

    let dadosExtraidos: any = { itens: [], mercado: '' };

    // 1. Se veio HTML da SEFAZ via frontend, extrai os itens
    if (html) {
      dadosExtraidos = extrairDadosSefaz(html);
    } 
    // 2. Se veio apenas URL, tenta buscar o HTML no servidor
    else if (url && url.startsWith('http')) {
      try {
        const resUrl = await fetch(url);
        if (resUrl.ok) {
          const htmlTexto = await resUrl.text();
          dadosExtraidos = extrairDadosSefaz(htmlTexto);
        }
      } catch (e) {
        console.error('Erro ao fazer fetch da URL da SEFAZ:', e);
      }
    }

    // 🎯 REGRA DE OURO DO NOME FANTASIA:
    // Prioriza 100% o nome digitado pelo usuário no formulário/modal!
    const nomeMercadoFinal = (mercadoDigitado && String(mercadoDigitado).trim() !== '') 
      ? String(mercadoDigitado).trim().toUpperCase() 
      : (dadosExtraidos.mercado || 'MERCADO VIA QR CODE').toUpperCase();

    // Obtém ou cria a FK do usuário
    const usrId = await obterUsuarioId(usuario);

    if (!usrId) {
      return NextResponse.json({ error: 'Não foi possível associar a um usuário válido' }, { status: 400 });
    }

    // Salva no banco de dados
    const cupomSalvo = await prisma.cupom.create({
      data: {
        mercado: nomeMercadoFinal,
        url: url || '',
        data: data || new Date().toLocaleDateString('pt-BR'),
        hora: hora || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        itens: JSON.stringify(dadosExtraidos.itens || []),
        usuarioId: usrId
      }
    });

    return NextResponse.json({
      ...cupomSalvo,
      itens: dadosExtraidos.itens || []
    }, { status: 201 });

  } catch (error: any) {
    console.error('Erro no POST /api/cupons:', error);
    return NextResponse.json({ error: error?.message || 'Erro ao salvar cupom no banco' }, { status: 500 });
  }
}

// 🟢 DELETE: Remove um cupom salvo
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const idParam = searchParams.get('id');

  if (!idParam) {
    return NextResponse.json({ error: 'ID do cupom não informado' }, { status: 400 });
  }

  try {
    await prisma.cupom.delete({
      where: { id: parseInt(String(idParam), 10) }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro no DELETE /api/cupons:', error);
    return NextResponse.json({ error: 'Erro ao deletar cupom' }, { status: 500 });
  }
}