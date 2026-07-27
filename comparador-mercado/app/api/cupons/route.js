import { NextResponse } from 'next/server';

// Simulação de tabela no banco de dados (substitua pela query do seu banco se usar Prisma/PostgreSQL/MongoDB)
let cuponsBanco = [];

// GET: Buscar todos os cupons salvos no banco
export async function GET() {
  return NextResponse.json(cuponsBanco);
}

// POST: Salvar um novo cupom no banco
export async function POST(request) {
  try {
    const body = await request.json();
    const novoCupom = {
      id: Date.now(),
      data: new Date().toLocaleDateString('pt-BR'),
      hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      mercado: body.mercado || 'MERCADO VIA QR CODE',
      fatorPreco: body.fatorPreco || 0.95,
      url: body.url || '',
      tag: '🧾 CUPOM BIPADO',
      corTag: 'bg-purple-100 text-purple-800'
    };

    cuponsBanco.unshift(novoCupom);
    return NextResponse.json(novoCupom, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao salvar cupom' }, { status: 500 });
  }
}

// DELETE: Remover um cupom do banco
export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get('id'));

  if (id) {
    cuponsBanco = cuponsBanco.filter(c => c.id !== id);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'ID não informado' }, { status: 400 });
}