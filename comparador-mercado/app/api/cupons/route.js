import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as cheerio from 'cheerio';

function extrairNumero(texto: string | null | undefined): number {
  if (!texto) return 0;
  let limpo = texto.replace(/[^\d.,]/g, '').trim();
  if (!limpo) return 0;

  if (limpo.includes(',')) {
    limpo = limpo.replace(/\./g, '').replace(',', '.');
  }
  const num = parseFloat(limpo);
  return isNaN(num) ? 0 : num;
}

// GET: Lista todos os cupons salvos no Neon DB
export async function GET() {
  try {
    const cupons = await prisma.cupomFiscal.findMany({
      include: {
        mercado: true,
        itens: {
          include: {
            produto: true
          }
        }
      },
      orderBy: {
        criadoEm: 'desc'
      }
    });

    const cuponsFormatados = cupons.map(c => ({
      id: c.id,
      mercado: c.mercado?.nome || 'MERCADO DESCONHECIDO',
      url: c.chaveAcesso,
      data: c.dataEmissao ? new Date(c.dataEmissao).toLocaleDateString('pt-BR') : '',
      hora: c.dataEmissao ? new Date(c.dataEmissao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '',
      valorTotal: Number(c.valorTotal),
      itens: c.itens.map(item => ({
        id: item.id,
        nome: item.produto?.nome || 'PRODUTO',
        preco: Number(item.precoUnitario),
        qtd: Number(item.quantidade)
      }))
    }));

    return NextResponse.json(cuponsFormatados, { status: 200 });
  } catch (error) {
    console.error('Erro no GET /api/cupons:', error);
    return NextResponse.json({ error: 'Erro ao listar cupons.' }, { status: 500 });
  }
}

// POST: Recebe URL ou HTML extraído do celular e salva no Neon DB
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const qrUrl = body.url;
    let htmlContent = body.html || '';

    let produtosExtraidos: Array<{ nome: string; preco: number; qtd: number }> = [];
    let nomeMercadoSefaz = body.mercado || 'SUPERMERCADO';

    // Se o front-end não enviou o HTML, tenta buscar no servidor
    if (!htmlContent && qrUrl && typeof qrUrl === 'string' && qrUrl.startsWith('http')) {
      try {
        const response = await fetch(qrUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'pt-BR,pt;q=0.9'
          },
          signal: AbortSignal.timeout(6000) // Timeout de 6s para não derrubar a Vercel
        });
        if (response.ok) {
          htmlContent = await response.text();
        }
      } catch (errScraping) {
        console.warn('Aviso: Falha ao buscar direto na SEFAZ (possível bloqueio de IP da Vercel).');
      }
    }

    // Processamento do HTML com Cheerio
    if (htmlContent) {
      const $ = cheerio.load(htmlContent);

      const nomeExtraido = 
        $('.txtTopo').first().text() || 
        $('#comprovante #header .txtCenter').first().text() ||
        $('.NFCE_aba_item_titulo').first().text() ||
        $('#titFim').text();

      if (nomeExtraido && nomeExtraido.trim()) {
        nomeMercadoSefaz = nomeExtraido.trim().toUpperCase();
      }

      $('#tabResult tr, #tableItens tr, .txtItens, tr[id^="Item"]').each((_, el) => {
        const $linha = $(el);

        const nome = 
          $linha.find('.txtTit, .txtTit2, .txtItemName, .txtItem, .NfceItemDesc').text().trim() ||
          $linha.find('td:nth-child(1)').text().trim();

        const rawQtd = 
          $linha.find('.Rqtd, .Rqtt, .txtQtd, .NfceItemQtd').text() ||
          $linha.text().match(/Qtde?:?\s*([\d.,]+)/i)?.[1] || '';

        const rawPrecoUnit = 
          $linha.find('.RvlUnit, .txtPreco, .txtValorUnit, .NfceItemVlUnit').text() ||
          $linha.text().match(/Vl\.?\s*Unit\.?:?\s*([\d.,]+)/i)?.[1] || '';

        const rawValorTotal = 
          $linha.find('.valor, .txtValorTotal, .NfceItemVlTotal, .vDeduc').text() ||
          $linha.find('td:last-child').text() || '';

        if (nome) {
          let qtd = extrairNumero(rawQtd) || 1;
          let precoUnitario = extrairNumero(rawPrecoUnit);
          let valorTotal = extrairNumero(rawValorTotal);

          if (precoUnitario === 0 && valorTotal > 0) {
            precoUnitario = valorTotal / qtd;
          } else if (valorTotal === 0 && precoUnitario > 0) {
            valorTotal = precoUnitario * qtd;
          }

          if (nome.length > 1) {
            produtosExtraidos.push({
              nome: nome.toUpperCase().replace(/\s+/g, ' '),
              preco: Number(precoUnitario.toFixed(2)),
              qtd: Number(qtd)
            });
          }
        }
      });
    }

    // Evita duplicidade de chave gerando um identificador único por milissegundos
    const chaveAcessoFinal = qrUrl ? `${qrUrl}_${Date.now()}` : `CHAVE_${Date.now()}`;

    // Transação no PostgreSQL (Neon DB)
    const resultado = await prisma.$transaction(async (tx) => {
      let mercado = await tx.mercado.findFirst({
        where: { nome: nomeMercadoSefaz }
      });

      if (!mercado) {
        mercado = await tx.mercado.create({
          data: { nome: nomeMercadoSefaz }
        });
      }

      const valorTotalCupom = produtosExtraidos.reduce((acc, p) => acc + (p.preco * p.qtd), 0);
      const totalSeguro = isNaN(valorTotalCupom) || valorTotalCupom <= 0 ? 0 : valorTotalCupom;

      const novoCupom = await tx.cupomFiscal.create({
        data: {
          chaveAcesso: chaveAcessoFinal,
          mercadoId: mercado.id,
          usuarioId: null,
          dataEmissao: new Date(),
          valorTotal: totalSeguro
        }
      });

      for (const item of produtosExtraidos) {
        let produto = await tx.produto.findFirst({
          where: { nome: item.nome }
        });

        if (!produto) {
          produto = await tx.produto.create({
            data: { nome: item.nome }
          });
        }

        await tx.itemCupom.create({
          data: {
            cupomId: novoCupom.id,
            produtoId: produto.id,
            precoUnitario: item.preco,
            quantidade: item.qtd
          }
        });

        await tx.historicoPrecoPublico.create({
          data: {
            produtoId: produto.id,
            mercadoId: mercado.id,
            preco: item.preco,
            origem: 'NFC-e'
          }
        });
      }

      return {
        id: novoCupom.id,
        mercado: mercado.nome,
        url: novoCupom.chaveAcesso,
        data: new Date(novoCupom.dataEmissao).toLocaleDateString('pt-BR'),
        hora: new Date(novoCupom.dataEmissao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        valorTotal: totalSeguro,
        itens: produtosExtraidos
      };
    });

    return NextResponse.json(resultado, { status: 201 });
  } catch (error) {
    console.error('Erro no POST /api/cupons:', error);
    return NextResponse.json(
      { error: 'Erro ao gravar o cupom no banco de dados.', detalhe: String(error) },
      { status: 500 }
    );
  }
}

// DELETE: Deleta cupom do Neon DB
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID não informado.' }, { status: 400 });

    await prisma.cupomFiscal.delete({
      where: { id: Number(id) }
    });

    return NextResponse.json({ message: 'Cupom removido.' }, { status: 200 });
  } catch (error) {
    console.error('Erro no DELETE /api/cupons:', error);
    return NextResponse.json({ error: 'Erro ao excluir cupom.' }, { status: 500 });
  }
}