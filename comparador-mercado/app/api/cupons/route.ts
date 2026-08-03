import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper completo com múltiplos seletores de SEFAZ estaduais
function extrairItensSefaz(htmlText: string) {
  const $ = cheerio.load(htmlText);
  const itens: Array<{ nome: string; preco: number; qtd: number }> = [];

  // Seletor 1: Padrão SP / RS / PR (Tabela tabResult ou tr_item)
  $('#tabResult tr, table.tr_item, tr[id^="Item"]').each((_, el) => {
    const nome = $(el).find('.txtTit, .txtTit2, .txtTit3, .txtBox, span[class*="nome"], td[class*="produto"]').text().trim().toUpperCase();
    const precoText = $(el).find('.R$ , .valor, .Rval, .valorTotal, span[class*="valor"]').text().replace(',', '.').replace(/[^0-9.]/g, '');
    const qtdText = $(el).find('.Rqtd, .qtd, .quantidade, span[class*="qtd"]').text().replace(',', '.').replace(/[^0-9.]/g, '');

    if (nome && nome.length > 2) {
      const preco = parseFloat(precoText);
      const qtd = parseFloat(qtdText);

      itens.push({
        nome: nome.replace(/\s+/g, ' '),
        preco: !isNaN(preco) && preco > 0 ? preco : 0,
        qtd: !isNaN(qtd) && qtd > 0 ? qtd : 1,
      });
    }
  });

  // Seletor 2: Caso o HTML venha em formato de Lista (ul/li) ou divs flex (padrão NFC-e modernizado)
  if (itens.length === 0) {
    $('div[id*="item"], div[class*="item"], li[class*="item"]').each((_, el) => {
      const nome = $(el).find('.txtTit, .nome, span[id*="nome"]').text().trim().toUpperCase();
      const precoText = $(el).find('.valor, .vUnit, .R$').text().replace(',', '.').replace(/[^0-9.]/g, '');
      const qtdText = $(el).find('.qtd, .qnt').text().replace(',', '.').replace(/[^0-9.]/g, '');

      if (nome && nome.length > 2) {
        itens.push({
          nome: nome.replace(/\s+/g, ' '),
          preco: parseFloat(precoText) || 0,
          qtd: parseFloat(qtdText) || 1,
        });
      }
    });
  }

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
    const { usuario: nomeUsuario, mercado: nomeMercado, url, itens: itensPayload } = body;

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
      where: { nome: (nomeMercado || 'MERCADO').toUpperCase() },
    });

    if (!mercadoEncontrado) {
      mercadoEncontrado = await prisma.mercado.create({
        data: { nome: (nomeMercado || 'MERCADO').toUpperCase() },
      });
    }

    // 3. Tenta fazer Scraping via URL se fornecida
    let itensExtraidos: Array<{ nome: string; preco: number; qtd: number }> = [];

    if (url && url.startsWith('http')) {
      try {
        const responseSefaz = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
          },
        });

        if (responseSefaz.ok) {
          const html = await responseSefaz.text();
          itensExtraidos = extrairItensSefaz(html);
        }
      } catch (errScraping) {
        console.error('Falha ao raspar a SEFAZ:', errScraping);
      }
    }

    // Se o scraping não achar itens ou a URL for vazia, usa os itens se forem enviados no payload
    if (itensExtraidos.length === 0 && Array.isArray(itensPayload) && itensPayload.length > 0) {
      itensExtraidos = itensPayload;
    }

    const valorTotalCalculado = itensExtraidos.reduce(
      (acc, item) => acc + (Number(item.preco) * Number(item.qtd)),
      0
    );

    const chaveGerada = (url && url.trim().length > 5) ? url : `CUPOM_${Date.now()}`;

    // 4. Cria o CupomFiscal
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
      const nomeLimpo = (item.nome || 'PRODUTO').trim().toUpperCase();
      
      let produto = await prisma.produto.findUnique({
        where: { nome: nomeLimpo },
      });

      if (!produto) {
        produto = await prisma.produto.create({
          data: { nome: nomeLimpo },
        });
      }

      await prisma.itemCupom.create({
        data: {
          cupomId: novoCupom.id,
          produtoId: produto.id,
          quantidade: item.qtd || 1,
          precoUnitario: item.preco || 0,
        },
      });

      // Registra Histórico de Preços
      await prisma.historicoPrecoPublico.create({
        data: {
          preco: item.preco || 0,
          produtoId: produto.id,
          mercadoId: mercadoEncontrado.id,
        },
      });

      itensFormatadosParaFrontend.push({
        nome: produto.nome,
        preco: Number(item.preco || 0),
        qtd: Number(item.qtd || 1),
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