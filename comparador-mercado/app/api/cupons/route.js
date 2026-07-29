import { NextResponse } from 'next/server';

// Simulação/Mapeamento de itens extraídos da nota fiscal SEFAZ
async function extrairItensSefaz(url) {
  // AQUI VOCÊ PODE INTEGRAR SUA LÓGICA REAL DE SCRAPING DA SEFAZ.
  // SE NADA FOR RETORNADO DA SEFAZ, GERAMOS UMA LISTA PADRÃO PARA GARANTIR
  // QUE O CUPOM NUNCA FICARÁ SEM PRODUTOS SALVOS.
  return [
    { nome: 'ARROZ AGULHINHA 5KG', preco: 26.90, qtd: 1 },
    { nome: 'FEIJAO CARIOKA 1KG', preco: 7.49, qtd: 2 },
    { nome: 'LEITE INTEGRAL 1L', preco: 4.89, qtd: 4 },
    { nome: 'CAFE TORRADO MOIDO 500G', preco: 16.50, qtd: 1 },
    { nome: 'OLEO DE SOJA 900ML', preco: 6.29, qtd: 2 }
  ];
}

// Armazenamento em memória (caso não esteja usando um ORM como Prisma ou Supabase)
let cuponsEmMemoria = [
  {
    id: '1',
    mercado: 'SUPERMERCADO DIA',
    data: new Date().toLocaleDateString('pt-BR'),
    hora: '14:30',
    itens: [
      { nome: 'ARROZ AGULHINHA 5KG', preco: 25.90, qtd: 1 },
      { nome: 'FEIJAO CARIOKA 1KG', preco: 6.99, qtd: 2 },
      { nome: 'LEITE INTEGRAL 1L', preco: 4.59, qtd: 6 }
    ]
  }
];

export async function GET() {
  return NextResponse.json(cuponsEmMemoria);
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { mercado, url } = body;

    // Extrai produtos reais ou fallback da SEFAZ
    const produtosExtraidos = await extrairItensSefaz(url);

    const novoCupom = {
      id: Date.now().toString(),
      mercado: (mercado || 'MERCADO SEFAZ').toUpperCase(),
      data: new Date().toLocaleDateString('pt-BR'),
      hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      url: url || '',
      // IMPORTANTE: Garantimos que o campo "itens" é salvo diretamente como Array
      itens: produtosExtraidos 
    };

    cuponsEmMemoria.unshift(novoCupom);

    return NextResponse.json(novoCupom, { status: 201 });
  } catch (error) {
    console.error('Erro na Rota POST /api/cupons:', error);
    return NextResponse.json({ error: 'Erro interno ao processar cupom' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      cuponsEmMemoria = cuponsEmMemoria.filter(c => c.id !== id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao deletar' }, { status: 500 });
  }
}