import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // 👈 Ajuste o caminho se seu arquivo do Prisma estiver em outro lugar
import * as cheerio from 'cheerio';

// Helper para tratar e converter os números da SEFAZ
function extrairNumero(texto) {
  if (!texto) return 0;
  let limpo = texto.replace(/[^\d.,]/g, '').trim();
  if (!limpo) return 0;

  if (limpo.includes(',')) {
    limpo = limpo.replace(/\./g, '').replace(',', '.');
  }
  const num = parseFloat(limpo);
  return isNaN(num) ? 0 : num;
}

// GET: Busca os cupons gravados no banco PostgreSQL
export async function GET() {
  try {
    const cupons = await prisma.cupom.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(cupons, { status: 200 });
  } catch (error) {
    console.error('Erro ao buscar cupons no Postgres:', error);
    return NextResponse.json({ error: 'Erro ao buscar cupons do banco de dados.' }, { status: 500 });
  }
}

// POST: Realiza o scraping e SALVA NO POSTGRESQL
export async function POST(request) {
  try {
    const body = await request.json();
    const qrUrl = body.url;

    let produtosExtraidos = [];
    let nomeMercadoSefaz = body.mercado;

    // 1. Scraping do HTML da SEFAZ
    if (qrUrl && qrUrl.startsWith('http')) {
      try {
        const response = await fetch(qrUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'pt-BR,pt;q=0.9'
          }
        });

        if (response.ok) {
          const html = await response.text();
          const $ = cheerio.load(html);

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
      } catch (errScraping) {
        console.error('Erro na leitura da SEFAZ:', errScraping);
      }
    }

    // 2. GRAVAÇÃO DIRETA NO POSTGRESQL VIA PRISMA
    const novoCupom = await prisma.cupom.create({
      data: {
        mercado: nomeMercadoSefaz || 'MERCADO VIA CUPOM',
        url: qrUrl || '',
        data: body.data || new Date().toLocaleDateString('pt-BR'),
        hora: body.hora || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        itens: produtosExtraidos // No PostgreSQL (Prisma), o campo `itens` pode ser do tipo Json
      }
    });

    return NextResponse.json(novoCupom, { status: 201 });
  } catch (error) {
    console.error('Erro no POST /api/cupons:', error);
    return NextResponse.json(
      { error: 'Falha interna ao gravar o cupom no PostgreSQL.' },
      { status: 500 }
    );
  }
}

// DELETE: Deleta o cupom no PostgreSQL
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID não informado.' }, { status: 400 });

    await prisma.cupom.delete({
      where: { id: String(id) }
    });

    return NextResponse.json({ message: 'Cupom removido do PostgreSQL.' }, { status: 200 });
  } catch (error) {
    console.error('Erro no DELETE /api/cupons:', error);
    return NextResponse.json({ error: 'Erro ao excluir cupom do banco.' }, { status: 500 });
  }
}