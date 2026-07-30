import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

let bancoDeDadosCupons = [];

// Funções auxiliares para tratamento e limpeza de números da SEFAZ
function extrairNumero(texto) {
  if (!texto) return 0;
  // Remove tudo que não for dígito, ponto ou vírgula
  let limpo = texto.replace(/[^\d.,]/g, '').trim();
  
  if (!limpo) return 0;

  // Trata formato brasileiro (ex: "1.250,50" -> "1250.50" ou "12,50" -> "12.50")
  if (limpo.includes(',')) {
    limpo = limpo.replace(/\./g, '').replace(',', '.');
  }
  
  const num = parseFloat(limpo);
  return isNaN(num) ? 0 : num;
}

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

          // 1. Extração do Nome do Mercado
          const nomeExtraido = 
            $('.txtTopo').first().text() || 
            $('#comprovante #header .txtCenter').first().text() ||
            $('.NFCE_aba_item_titulo').first().text() ||
            $('#titFim').text();

          if (nomeExtraido && nomeExtraido.trim()) {
            nomeMercadoSefaz = nomeExtraido.trim().toUpperCase();
          }

          // 2. Extração Precisa dos Produtos e Preços
          // Cobre seletores de quase todas as SEFAZs estaduais
          $('#tabResult tr, #tableItens tr, .txtItens, tr[id^="Item"]').each((_, el) => {
            const $linha = $(el);

            // Nome do Produto
            const nome = 
              $linha.find('.txtTit, .txtTit2, .txtItemName, .txtItem, .NfceItemDesc').text().trim() ||
              $linha.find('td:nth-child(1)').text().trim();

            // Quantidade
            const rawQtd = 
              $linha.find('.Rqtd, .Rqtt, .txtQtd, .NfceItemQtd').text() ||
              $linha.text().match(/Qtde?:?\s*([\d.,]+)/i)?.[1] || '';

            // Preço Unitário
            const rawPrecoUnit = 
              $linha.find('.RvlUnit, .txtPreco, .txtValorUnit, .NfceItemVlUnit').text() ||
              $linha.text().match(/Vl\.?\s*Unit\.?:?\s*([\d.,]+)/i)?.[1] || '';

            // Valor Total do Item
            const rawValorTotal = 
              $linha.find('.valor, .txtValorTotal, .NfceItemVlTotal, .vDeduc').text() ||
              $linha.find('td:last-child').text() || '';

            if (nome) {
              let qtd = extrairNumero(rawQtd) || 1;
              let precoUnitario = extrairNumero(rawPrecoUnit);
              let valorTotal = extrairNumero(rawValorTotal);

              // Fallback: Se o preço unitário veio 0 mas o valor total existe, calcula a divisão
              if (precoUnitario === 0 && valorTotal > 0) {
                precoUnitario = valorTotal / qtd;
              } 
              // Fallback opcional: Se veio unitário mas não veio total
              else if (valorTotal === 0 && precoUnitario > 0) {
                valorTotal = precoUnitario * qtd;
              }

              // Só adiciona se capturou um nome válido
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
      { error: 'Falha interna ao processar o cupom fiscal.' },
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