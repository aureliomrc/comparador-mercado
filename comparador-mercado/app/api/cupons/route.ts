import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Seletor de Fallback para a SEFAZ no servidor
function extrairItensSefaz(htmlText: string) {
  const $ = cheerio.load(htmlText);
  const itens: Array<{ nome: string; preco: number; qtd: number }> = [];

  $('#tabResult tr, table.tr_item, tr[id^="Item"], div[id*="item"], tr[class*="item"]').each((_, el) => {
    const nome = $(el).find('.txtTit, .txtTit2, .txtTit3, .txtBox, span[class*="nome"], td[class*="produto"]').text().trim().toUpperCase();
    const precoText = $(el).find('.R$ , .valor, .Rval, .valorTotal, span[class*="valor"]').text().replace(',', '.').replace(/[^0-9.]/g, '');
    const qtdText = $(el).find('.Rqtd, .qtd, .quantidade, span[class*="qtd"]').text().replace(',', '.').replace(/[^0-9.]/g, '');

    if (nome && nome.length > 2) {
      itens.push({
        nome: nome.replace(/\s+/g, ' '),
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

    // 1. Usuário
    let usuarioEncontrado = await prisma.usuario.findFirst({
      where: { nome: nomeUsuario },
    });

    if (!usuarioEncontrado) {
      usuarioEncontrado = await prisma.usuario.create({
        data: { nome: nomeUsuario },
      });
    }

    // 2. Mercado
    let mercadoEncontrado = await prisma.mercado.findFirst({
      where: { nome: (nomeMercado || 'MERCADO VIA QR CODE').toUpperCase() },
    });

    if (!mercadoEncontrado) {
      mercadoEncontrado = await prisma.mercado.create({
        data: { nome: (nomeMercado || 'MERCADO VIA QR CODE').toUpperCase() },
      });
    }

    // 3. Processamento dos Itens
    let itensParaSalvar: Array<{ nome: string; preco: number; qtd: number }> = [];

    // Prioridade 1: Utiliza os itens coletados diretamente no cliente
    if (Array.isArray(itensPayload) && itensPayload.length > 0) {
      itensParaSalvar = itensPayload;
    } else if (url && url.startsWith('http')) {
      // Prioridade 2: Tenta raspagem no servidor caso não venham do cliente
      try {
        const responseSefaz = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        });

        if (responseSefaz.ok) {
          const html = await responseSefaz.text();
          itensParaSalvar = extrairItensSefaz(html);
        }
      } catch (errScraping) {
        console.error('Bloqueio ou falha de raspagem no servidor:', errScraping);
      }
    }

    const valorTotalCalculado = itensParaSalvar.reduce(
      (acc, item) => acc + (Number(item.preco) * Number(item.qtd)),
      0
    );

    const chaveGerada = (url && url.trim().length > 5) ? url : `CUPOM_${Date.now()}`;

    // 4. Salva o Cupom Fiscal
    const novoCupom = await prisma.cupomFiscal.create({
      data: {
        chaveAcesso: chaveGerada,
        valorTotal: valorTotalCalculado,
        mercadoId: mercadoEncontrado.id,
        usuarioId: usuarioEncontrado.id,
      },
    });

    // 5. Vincula produtos e histórico
    const itensFormatadosParaFrontend = [];

    for (const item of itensParaSalvar) {
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