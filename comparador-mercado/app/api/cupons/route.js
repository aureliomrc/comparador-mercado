import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

let bancoDeDadosCupons = [];

export async function GET() {
  try {
    return NextResponse.json(bancoDeDadosCupons, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar cupons.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const qrUrl = body.url;

    let produtosExtraidos = [];
    let nomeMercadoSefaz = body.mercado;

    // 🕵️ SE HOUVER URL DO QR CODE, FAZ O SCRAPING REAL NA SEFAZ
    if (qrUrl && qrUrl.startsWith('http')) {
      try {
        const response = await fetch(qrUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36'
          }
        });

        if (response.ok) {
          const html = await response.text();
          const $ = cheerio.load(html);

          // 1. Tenta extrair o Nome do Estabelecimento da Nota
          const nomeExtraido = $('.txtTopo').first().text().trim() || $('#comprovante #header .txtCenter').first().text().trim();
          if (nomeExtraido) {
            nomeMercadoSefaz = nomeExtraido.toUpperCase();
          }

          // 2. Extrai TODOS os produtos da tabela do Cupom (Padrão SEFAZ NFC-e)
          $('#tabResult tr, #tableItens tr, .txtItens').each((_, el) => {
            const nome = $(el).find('.txtTit, .txtTit2, .txtItemName').text().trim();
            const qtdTexto = $(el).find('.Rqtd, .Rqtt, .txtQtd').text().replace(/[^0-9,. ]/g, '').trim();
            const precoTexto = $(el).find('.RvlUnit, .txtPreco, .txtValorUnit').text().replace(/[^0-9,.]/g, '').replace(',', '.').trim();
            const valorTotalTexto = $(el).find('.valor, .txtValorTotal').text().replace(/[^0-9,.]/g, '').replace(',', '.').trim();

            if (nome) {
              const precoFinal = parseFloat(precoTexto || valorTotalTexto) || 0;
              const qtdFinal = parseFloat(qtdTexto.replace(',', '.')) || 1;

              produtosExtraidos.push({
                nome: nome.toUpperCase(),
                preco: precoFinal,
                qtd: qtdFinal
              });
            }
          });
        }
      } catch (errScraping) {
        console.error('Falha ao ler HTML da SEFAZ:', errScraping);
      }
    }

    // Se o scraping não encontrar itens (ex: erro de bloqueio da SEFAZ), 
    // grava o cupom com os produtos que conseguiu ler ou um aviso
    const novoCupom = {
      id: Date.now().toString(),
      mercado: nomeMercadoSefaz || 'MERCADO VIA CUPOM',
      url: qrUrl || '',
      data: body.data || new Date().toLocaleDateString('pt-BR'),
      hora: body.hora || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      itens: produtosExtraidos
    };

    bancoDeDadosCupons.unshift(novoCupom);

    return NextResponse.json(novoCupom, { status: 201 });
  } catch (error) {
    console.error('Erro no POST /api/cupons:', error);
    return NextResponse.json(
      { error: 'Falha interna ao processar dados do cupom fiscal.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID não informado.' }, { status: 400 });

    bancoDeDadosCupons = bancoDeDadosCupons.filter(c => c.id !== id);
    return NextResponse.json({ message: 'Cupom removido.' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao excluir cupom.' }, { status: 500 });
  }
}