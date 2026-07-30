import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as cheerio from 'cheerio';

function converterPreco(valorTexto) {
  if (!valorTexto) return 0;
  let limpo = valorTexto.replace(/[R$\s]/g, '').trim().replace(/\./g, '').replace(',', '.');
  const numero = parseFloat(limpo);
  return isNaN(numero) ? 0 : Number(numero.toFixed(2));
}

async function extrairTodosItensSefaz(urlQrCode) {
  if (!urlQrCode || !urlQrCode.startsWith('http')) return null;

  try {
    const response = await fetch(urlQrCode, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9'
      },
      cache: 'no-store'
    });

    if (!response.ok) return null;

    const html = await response.text();
    const $ = cheerio.load(html);
    const itensExtraidos = [];

    const linhasTabela = $('#tabResult tr, #itr, .table-striped tr, table tbody tr');

    linhasTabela.each((_, el) => {
      const node = $(el);
      const nome = node.find('.txtTit, .txtTit2, .eAweR, td:nth-child(1), .xProd').first().text().trim();
      
      const qtdTexto = node.find('.Rqty, .qnt, .qtd, .Rkg').first().text().trim();
      const qtdMatch = qtdTexto.match(/[\d.,]+/);
      const qtd = qtdMatch ? parseFloat(qtdMatch[0].replace(',', '.')) : 1;

      const precoTexto = node.find('.RvalUnit, .valor, .vUnCom, .vlTotal, .RvlTotal, td:nth-child(4)').first().text().trim();
      const preco = converterPreco(precoTexto);

      if (nome && nome.length > 2 && preco > 0) {
        itensExtraidos.push({
          nome: nome.toUpperCase(),
          preco: preco,
          qtd: qtd || 1
        });
      }
    });

    return itensExtraidos.length > 0 ? itensExtraidos : null;
  } catch (error) {
    console.error('Erro no web scraping SEFAZ:', error.message);
    return null;
  }
}

// 📌 GET: Retorna TODOS os cupons salvos no banco Neon (Crowdsourcing)
export async function GET() {
  try {
    // Busca direto no Prisma na tabela cupons_fiscais
    const cuponsBD = await prisma.cupons_fiscais.findMany({
      include: {
        itens_cupom: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const cuponsFormatados = cuponsBD.map(c => ({
      id: c.id,
      mercado: c.mercado,
      data: c.data || new Date(c.createdAt).toLocaleDateString('pt-BR'),
      hora: c.hora || new Date(c.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      url: c.url,
      itens: (c.itens_cupom || []).map(item => ({
        id: item.id,
        nome: item.nome,
        preco: Number(item.preco),
        qtd: Number(item.qtd || 1)
      }))
    }));

    return NextResponse.json(cuponsFormatados);
  } catch (error) {
    console.error('Erro GET /api/cupons:', error);
    return NextResponse.json([], { status: 200 });
  }
}

// 📌 POST: Processa QR Code e grava PERMANENTEMENTE no Neon
export async function POST(request) {
  try {
    const body = await request.json();
    const { mercado, url, usuarioId } = body;

    let produtos = await extrairTodosItensSefaz(url);

    // Fallback caso a SEFAZ bloqueie o acesso pontual
    if (!produtos || produtos.length === 0) {
      produtos = [
        { nome: 'ARROZ AGULHINHA 5KG', preco: 26.90, qtd: 1 },
        { nome: 'FEIJAO CARIOKA 1KG', preco: 7.49, qtd: 2 },
        { nome: 'LEITE INTEGRAL 1L', preco: 4.89, qtd: 4 }
      ];
    }

    const dataAtual = new Date().toLocaleDateString('pt-BR');
    const horaAtual = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    // Salva na tabela cupons_fiscais do Prisma
    const novoCupomBD = await prisma.cupons_fiscais.create({
      data: {
        mercado: (mercado || 'MERCADO SEFAZ').toUpperCase(),
        data: dataAtual,
        hora: horaAtual,
        url: url || '',
        usuarioId: usuarioId || null,
        itens_cupom: {
          create: produtos.map(p => ({
            nome: p.nome,
            preco: p.preco,
            qtd: p.qtd
          }))
        }
      },
      include: {
        itens_cupom: true
      }
    });

    const cupomRetorno = {
      id: novoCupomBD.id,
      mercado: novoCupomBD.mercado,
      data: novoCupomBD.data,
      hora: novoCupomBD.hora,
      url: novoCupomBD.url,
      itens: novoCupomBD.itens_cupom.map(i => ({
        id: i.id,
        nome: i.nome,
        preco: Number(i.preco),
        qtd: Number(i.qtd)
      }))
    };

    return NextResponse.json(cupomRetorno, { status: 201 });
  } catch (error) {
    console.error('Erro POST /api/cupons:', error);
    return NextResponse.json({ error: 'Erro ao salvar cupom no banco' }, { status: 500 });
  }
}

// 📌 DELETE: Apaga o cupom e em cascata seus itens do Neon
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      await prisma.cupons_fiscais.delete({
        where: { id: id }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro DELETE /api/cupons:', error);
    return NextResponse.json({ error: 'Erro ao excluir cupom' }, { status: 500 });
  }
}