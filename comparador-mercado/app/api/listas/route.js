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

// 1. LISTAR TODAS AS LISTAS DO USUÁRIO
export async function GET(request) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const listasBD = await prisma.lista.findMany({
    where: { usuarioId: user.userId },
    include: { itens: true },
    orderBy: { createdAt: 'desc' }
  });

  // Mapeia para a estrutura esperada no frontend
  const listasFormatadas = listasBD.map(lista => ({
    id: lista.id,
    nome: lista.nome,
    isPrincipal: false,
    itens: lista.itens.map(item => ({
      id: item.id,
      nome: item.produtoNome.toUpperCase(),
      qtd: item.qtd,
      un: item.un,
      marcado: item.marcado,
      precoEstimado: item.precoEstimado,
      marca: item.marca
    }))
  }));

  return NextResponse.json(listasFormatadas);
}

// 2. CRIAR NOVA LISTA
export async function POST(request) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { nome } = await request.json();

  const novaLista = await prisma.lista.create({
    data: {
      nome: nome.toUpperCase(),
      usuarioId: user.userId
    },
    include: { itens: true }
  });

  return NextResponse.json({
    id: novaLista.id,
    nome: novaLista.nome,
    isPrincipal: false,
    itens: []
  }, { status: 201 });
}

// 3. ADICIONAR ITEM / ATUALIZAR QUANTIDADE OU CHECK
export async function PUT(request) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const body = await request.json();
  const { ação } = body;

  // Ação: Adicionar Item a uma Lista
  if (ação === 'ADICIONAR_ITEM') {
    const { listaId, nome, qtd, precoEstimado, marca } = body;
    const novoItem = await prisma.item.create({
      data: {
        listaId,
        produtoNome: nome,
        qtd: qtd || 1,
        precoEstimado: parseFloat(precoEstimado) || 0.0,
        marca: marca || 'PADRÃO'
      }
    });

    return NextResponse.json({
      id: novoItem.id,
      nome: novoItem.produtoNome,
      qtd: novoItem.qtd,
      un: novoItem.un,
      marcado: novoItem.marcado,
      precoEstimado: novoItem.precoEstimado,
      marca: novoItem.marca
    });
  }

  // Ação: Alterar Quantidade ou Check
  if (ação === 'ATUALIZAR_ITEM') {
    const { itemId, qtd, marcado } = body;
    const itemAtualizado = await prisma.item.update({
      where: { id: itemId },
      data: {
        ...(qtd !== undefined && { qtd }),
        ...(marcado !== undefined && { marcado })
      }
    });
    return NextResponse.json(itemAtualizado);
  }

  return NextResponse.json({ error: 'Ação não reconhecida' }, { status: 400 });
}

// 4. DELETAR LISTA OU ITEM
export async function DELETE(request) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const listaId = searchParams.get('listaId');
  const itemId = searchParams.get('itemId');

  if (itemId) {
    await prisma.item.delete({ where: { id: itemId } });
    return NextResponse.json({ success: true });
  }

  if (listaId) {
    await prisma.lista.delete({ where: { id: listaId } });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Parâmetro ausente' }, { status: 400 });
}