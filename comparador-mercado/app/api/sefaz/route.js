import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import axios from 'axios';
import * as cheerio from 'cheerio';

export async function POST(request) {
  const { urlQrCode, nomeFantasiaManual } = await request.json();

  try {
    // Busca o HTML da nota fiscal na SEFAZ
    const { data: html } = await axios.get(urlQrCode, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });

    const $ = cheerio.load(html);
    
    // Tenta capturar Nome do Estabelecimento e CNPJ (Ajuste os seletores conforme padrão da SEFAZ do seu estado)
    const nomeFantasia = nomeFantasiaManual || $('#txtTopo').text().trim() || 'Mercado Comunitário';
    const cnpj = $('.txtCenter').text().replace(/\D/g, '').slice(0, 14) || '00000000000000';

    const produtosInseridos = [];

    // Exemplo de Varredura genérica da tabela da nota
    $('tr[id^="Item"]').each((i, el) => {
      const nome = $(el).find('.txtTit').text().trim().toLowerCase();
      const precoTexto = $(el).find('.R$').text().replace(',', '.').trim();
      const preco = parseFloat(precoTexto);

      if (nome && !isNaN(preco)) {
        produtosInseridos.push({
          cnpjEstabelecimento: cnpj,
          nomeFantasia: nomeFantasia,
          produtoNome: nome,
          preco: preco
        });
      }
    });

    if (produtosInseridos.length === 0) {
      return NextResponse.json({ error: 'Não foi possível extrair produtos dessa URL.' }, { status: 400 });
    }

    // Grava todos no Banco
    await prisma.precoSefaz.createMany({
      data: produtosInseridos
    });

    return NextResponse.json({ 
      message: `${produtosInseridos.length} produtos importados com sucesso para o ${nomeFantasia}!`,
      produtos: produtosInseridos 
    });

  } catch (error) {
    return NextResponse.json({ error: 'Erro ao processar URL do QR Code da Sefaz.' }, { status: 500 });
  }
}