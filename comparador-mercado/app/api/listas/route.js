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
  try {
    const user = await getUser(request);

    // Busca listas vinculadas ao usuário ou públicas/globais caso não haja token
    const listasBD = await prisma.lista.findMany({
      where: user ? { usuarioId: user.userId } : {},
      include: { itens: true },
      orderBy: { createdAt: 'desc' }
    });

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
  } catch (error) {
    console.error('Erro no GET /api/listas:', error);
    return NextResponse.json([], { status: 200 }); // Retorna array vazio em caso de erro para não travar o frontend
  }
}

// 2. CRIAR NOVA LISTA
export async function POST(request) {
  try {
    const user = await getUser(request);
    const body = await request.json();
    const { nome } = body;

    if (!nome) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 });
    }

    const novaLista = await prisma.lista.create({
      data: {
        nome: nome.toUpperCase(),
        ...(user?.userId && { usuarioId: user.userId })
      },
      include: { itens: true }
    });

    return NextResponse.json({
      id: novaLista.id,
      nome: novaLista.nome,
      isPrincipal: false,
      itens: []
    }, { status: 201 });
  } catch (error) {
    console.error('Erro no POST /api/listas:', error);
    return NextResponse.json({ error: 'Erro interno ao criar lista' }, { status: 500 });
  }
}

// 3. ADICIONAR ITEM / ATUALIZAR QUANTIDADE OU CHECK
export async function PUT(request) {
  try {
    const body = await request.json();
    // Suporta tanto 'acao' quanto 'ação'
    const acaoNorm = body.acao || body.ação;

    // Ação: Adicionar Item a uma Lista
    if (acaoNorm === 'ADICIONAR_ITEM') {
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
    if (acaoNorm === 'ATUALIZAR_ITEM') {
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
  } catch (error) {
    console.error('Erro no PUT /api/listas:', error);
    return NextResponse.json({ error: 'Erro ao processar alteração' }, { status: 500 });
  }
}

// 4. DELETAR LISTA OU ITEM
export async function DELETE(request) {
  try {
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
  } catch (error) {
    console.error('Erro no DELETE /api/listas:', error);
    return NextResponse.json({ error: 'Erro ao deletar recurso' }, { status: 500 });
  }
}