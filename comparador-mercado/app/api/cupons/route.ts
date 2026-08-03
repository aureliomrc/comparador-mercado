import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper para extrair itens da SEFAZ
function extrairItensSefaz(htmlText: string) {
  const $ = cheerio.load(htmlText);
  const itens: Array<{ nome: string; preco: number; qtd: number }> = [];

  $('#tabResult tr, table.tr_item').each((_, el) => {
    const nome = $(el).find('.txtTit, .txtTit2, .txtTit3').text().trim().toUpperCase();
    const precoText = $(el).find('.R$ , .valor, .Rval').text().replace(',', '.').replace(/[^0-9.]/g, '');
    const qtdText = $(el).find('.Rqtd, .qtd').text().replace(',', '.').replace(/[^0-9.]/g, '');

    if (nome) {
      itens.push({
        nome,
        preco: parseFloat(precoText) || 0,
        qtd: parseFloat(qtdText) || 1,
      });
    }
  });

  return itens;
}

// GET: Buscar cupons do usuário
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const nomeUsuario = searchParams.get('usuario');

  if (!nomeUsuario) {
    return NextResponse.json({ error: 'Usuário é obrigatório' }, { status: 400 });
  }

  try {
    // Usando o modelo correto CupomFiscal
    const cupons = await prisma.cupomFiscal.findMany({
      where: {
        usuario: {
          nome: nomeUsuario,
        },
      },
      include: {
        mercado: true,
        itens: {
          include: {
            produto: true,
          },
        },
      },
      orderBy: { criadoEm: 'desc' },
    });

    // Formata o retorno para o frontend manter o padrão esperado
    const cuponsFormatados = cupons.map((c) => ({
      id: c.id,
      mercado: c.mercado.nome,
      url: c.chaveAcesso,
      data: c.dataEmissao.toLocaleDateString('pt-BR'),
      hora: c.dataEmissao.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      itens: c.itens.map((i) => ({
        nome: i.produto.nome,
        preco: Number(i.precoUnitario),
        qtd: Number(i.quantidade),
      })),
    }));

    return NextResponse.json(cuponsFormatados);
  } catch (err: any) {
    console.error('Erro ao buscar cupons:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Salvar Cupom e Relacionamentos
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { usuario: nomeUsuario, mercado: nomeMercado, url } = body;

    if (!nomeUsuario) {
      return NextResponse.json({ error: 'Usuário é obrigatório' }, { status: 400 });
    }

    // 1. Garante que o usuário existe no banco
    let usuarioEncontrado = await prisma.usuario.findFirst({
      where: { nome: nomeUsuario },
    });

    if (!usuarioEncontrado) {
      usuarioEncontrado = await prisma.usuario.create({
        data: { nome: nomeUsuario },
      });
    }

    // 2. Garante que o mercado existe no banco
    let mercadoEncontrado = await prisma.mercado.findFirst({
      where: { nome: nomeMercado.toUpperCase() },
    });

    if (!mercadoEncontrado) {
      mercadoEncontrado = await prisma.mercado.create({
        data: { nome: nomeMercado.toUpperCase() },
      });
    }

    // 3. Efetua o scraping da SEFAZ
    let itensExtraidos: Array<{ nome: string; preco: number; qtd: number }> = [];

    if (url && url.startsWith('http')) {
      try {
        const responseSefaz = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        });

        if (responseSefaz.ok) {
          const html = await responseSefaz.text();
          itensExtraidos = extrairItensSefaz(html);
        }
      } catch (errScraping) {
        console.error('Falha ao baixar HTML da SEFAZ:', errScraping);
      }
    }

    const valorTotalCalculado = itensExtraidos.reduce(
      (acc, item) => acc + item.preco * item.qtd,
      0
    );

    // Chave de acesso temporária (caso não tenha raspado a chave real da URL)
    const chaveGerada = url || `CHAVE_${Date.now()}`;

    // 4. Cria o CupomFiscal com os itens vinculados
    const novoCupom = await prisma.cupomFiscal.create({
      data: {
        chaveAcesso: chaveGerada,
        valorTotal: valorTotalCalculado,
        mercadoId: mercadoEncontrado.id,
        usuarioId: usuarioEncontrado.id,
      },
    });

    // 5. Salva os produtos e os itens do cupom
    const itensFormatadosParaFrontend = [];

    for (const item of itensExtraidos) {
      let produto = await prisma.produto.findUnique({
        where: { nome: item.nome },
      });

      if (!produto) {
        produto = await prisma.produto.create({
          data: { nome: item.nome },
        });
      }

      await prisma.itemCupom.create({
        data: {
          cupomId: novoCupom.id,
          produtoId: produto.id,
          quantidade: item.qtd,
          precoUnitario: item.preco,
        },
      });

      // Registra no Histórico Público
      await prisma.historicoPrecoPublico.create({
        data: {
          preco: item.preco,
          produtoId: produto.id,
          mercadoId: mercadoEncontrado.id,
        },
      });

      itensFormatadosParaFrontend.push({
        nome: produto.nome,
        preco: item.preco,
        qtd: item.qtd,
      });
    }

    return NextResponse.json({
      id: novoCupom.id,
      mercado: mercadoEncontrado.nome,
      url: novoCupom.chaveAcesso,
      data: novoCupom.dataEmissao.toLocaleDateString('pt-BR'),
      hora: novoCupom.dataEmissao.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      itens: itensFormatadosParaFrontend,
    });
  } catch (err: any) {
    console.error('Erro ao salvar CupomFiscal:', err);
    return NextResponse.json({ error: err.message || 'Erro interno no servidor' }, { status: 500 });
  }
}

// DELETE: Deletar cupom
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID do cupom é obrigatório' }, { status: 400 });
  }

  try {
    await prisma.cupomFiscal.delete({
      where: { id: Number(id) },
    });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}