import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';

async function getUser(request) {
  const token = request.cookies.get('token')?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET || 'secreto'));
    return payload;
  } catch {
    return null;
  }
}

// Listar Listas do Usuário
export async function GET(request) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const listas = await prisma.lista.findMany({
    where: { usuarioId: user.userId },
    include: { itens: true }
  });
  return NextResponse.json(listas);
}

// Criar Nova Lista com Itens
export async function POST(request) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { nome, itens } = await request.json(); // itens = ["Leite", "Arroz", "Feijão"]

  const novaLista = await prisma.lista.create({
    data: {
      nome,
      usuarioId: user.userId,
      itens: {
        create: itens.map(item => ({ produtoNome: item.toLowerCase().trim() }))
      }
    },
    include: { itens: true }
  });

  return NextResponse.json(novaLista, { status: 201 });
}