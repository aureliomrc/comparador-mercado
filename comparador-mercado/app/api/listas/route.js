import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // Ou onde estiver configurado o seu PrismaClient

// GET: Busca somente as listas do usuário especificado
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const usuario = searchParams.get('usuario');

  if (!usuario) {
    return NextResponse.json({ error: 'Usuário não informado' }, { status: 400 });
  }

  try {
    const listas = await prisma.lista.findMany({
      where: { usuario },
      include: { itens: true },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(listas);
  } catch (error) {
    console.error('Erro ao buscar listas:', error);
    return NextResponse.json({ error: 'Erro interno ao buscar listas' }, { status: 500 });
  }
}

// POST: Cria uma nova lista vinculada ao usuário (incluindo a cópia da lista padrão)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { usuario, nome, itens } = body;

    if (!usuario || !nome) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 });
    }

    const novaLista = await prisma.lista.create({
      data: {
        usuario,
        nome,
        itens: itens && Array.isArray(itens) ? {
          create: itens.map((item: any) => ({
            nome: item.nome,
            qtd: item.qtd || 1,
            marcado: Boolean(item.marcado),
            precoEstimado: Number(item.precoEstimado) || 0,
            marca: item.marca || ''
          }))
        } : undefined
      },
      include: { itens: true }
    });

    return NextResponse.json(novaLista, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar lista:', error);
    return NextResponse.json({ error: 'Erro interno ao criar lista' }, { status: 500 });
  }
}

// PUT: Adiciona ou atualiza um item garantindo o escopo do usuário
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { acao, listaId, itemId, nome, qtd, precoEstimado, marca, marcado } = body;

    if (acao === 'ADICIONAR_ITEM') {
      const novoItem = await prisma.item.create({
        data: {
          listaId,
          nome,
          qtd: Number(qtd) || 1,
          precoEstimado: Number(precoEstimado) || 0,
          marca: marca || '',
          marcado: false
        }
      });
      return NextResponse.json(novoItem);
    }

    if (acao === 'ATUALIZAR_ITEM') {
      const itemAtualizado = await prisma.item.update({
        where: { id: itemId },
        data: {
          ...(qtd !== undefined && { qtd: Number(qtd) }),
          ...(marcado !== undefined && { marcado: Boolean(marcado) })
        }
      });
      return NextResponse.json(itemAtualizado);
    }

    return NextResponse.json({ error: 'Ação não reconhecida' }, { status: 400 });
  } catch (error) {
    console.error('Erro ao atualizar item:', error);
    return NextResponse.json({ error: 'Erro interno ao atualizar item' }, { status: 500 });
  }
}

// DELETE: Remove um item ou uma lista inteira
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const listaId = searchParams.get('listaId');
  const itemId = searchParams.get('itemId');

  try {
    if (listaId) {
      await prisma.lista.delete({ where: { id: listaId } });
      return NextResponse.json({ success: true });
    }

    if (itemId) {
      await prisma.item.delete({ where: { id: itemId } });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'ID não fornecido' }, { status: 400 });
  } catch (error) {
    console.error('Erro ao excluir:', error);
    return NextResponse.json({ error: 'Erro ao excluir elemento' }, { status: 500 });
  }
}