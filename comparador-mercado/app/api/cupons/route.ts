import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Função para extrair itens do HTML da SEFAZ
function extrairItensSefaz(htmlText: string) {
  const $ = cheerio.load(htmlText);
  const itens: Array<{ nome: string; preco: number; qtd: number }> = [];

  // Padrão comum da SEFAZ (tabela id #tabResult ou classe .txtTit)
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
  const usuario = searchParams.get('usuario');

  if (!usuario) {
    return NextResponse.json({ error: 'Usuário é obrigatório' }, { status: 400 });
  }

  try {
    const cupons = await prisma.cupom.findMany({
      where: { usuario },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(cupons);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Baixar SEFAZ e Salvar Cupom
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { usuario, mercado, url, data, hora } = body;

    if (!usuario) {
      return NextResponse.json({ error: 'Usuário é obrigatório' }, { status: 400 });
    }

    let itensExtraidos: Array<{ nome: string; preco: number; qtd: number }> = [];

    // Fazer requisição HTTP no Node.js (sem bloqueio de CORS)
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

    // Salvar no banco Neon DB via Prisma
    const novoCupom = await prisma.cupom.create({
      data: {
        usuario,
        mercado,
        url: url || '',
        data: data || new Date().toLocaleDateString('pt-BR'),
        hora: hora || new Date().toLocaleTimeString('pt-BR'),
        itens: JSON.stringify(itensExtraidos),
      },
    });

    return NextResponse.json(novoCupom);
  } catch (err: any) {
    console.error('Erro no endpoint POST /api/cupons:', err);
    return NextResponse.json({ error: err.message || 'Erro interno no servidor' }, { status: 500 });
  }
}

// DELETE: Excluir cupom
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID do cupom é obrigatório' }, { status: 400 });
  }

  try {
    await prisma.cupom.delete({
      where: { id: String(id) },
    });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}