import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';

// Identifica o usuário via JWT (Cookie)
async function getUser(request) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) return null;
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'secreto');
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch {
    return null;
  }
}

// 1. GET: LISTAR OU CRIAR LISTA PADRÃO NO BANCO
export async function GET(request) {
  try {
    const user = await getUser(request);
    const whereCondition = user?.userId ? { usuarioId: user.userId } : {};

    let listasBD = await prisma.lista.findMany({
      where: whereCondition,
      include: { itens: true },
      orderBy: { createdAt: 'desc' }
    });

    // Se o banco estiver vazio, cria a Lista Padrão no banco automaticamente
    if (listasBD.length === 0) {
      const novaListaPadrao = await prisma.lista.create({
        data: {
          nome: 'LISTA DE COMPRAS PADRÃO',
          ...(user?.userId && { usuarioId: user.userId }),
          itens: {
            create: [
              { produtoNome: 'ARROZ 5KG', qtd: 1, precoEstimado: 25.90, marca: 'CAMIL' },
              { produtoNome: 'FEIJAO CARIOCA 1KG', qtd: 2, precoEstimado: 7.50, marca: 'KICALDO' },
              { produtoNome: 'LEITE INTEGRAL 1L', qtd: 4, precoEstimado: 4.80, marca: 'NINHO' },
              { produtoNome: 'CAFÉ TORRADO 500G', qtd: 1, precoEstimado: 16.90, marca: 'PILÃO' }
            ]
          }
        },
        include: { itens: true }
      });
      listasBD = [novaListaPadrao];
    }

    const listasFormatadas = listasBD.map(lista => ({
      id: lista.id,
      nome: lista.nome,
      isPrincipal: (lista.nome || '').toUpperCase().includes('PADRÃO') || (lista.nome || '').toUpperCase().includes('PADRAO'),
      itens: (lista.itens || []).map(item => ({
        id: item.id,
        nome: (item.produtoNome || '').toUpperCase(),
        qtd: item.qtd || 1,
        un: item.un || 'UN',
        marcado: Boolean(item.marcado),
        precoEstimado: item.precoEstimado || 0.0,
        marca: item.marca || 'PADRÃO'
      }))
    }));

    return NextResponse.json(listasFormatadas);
  } catch (error) {
    console.error('Erro no GET /api/listas:', error);
    return NextResponse.json([], { status: 200 }); // Retorna array vazio para não quebrar no alert()
  }
}

// 2. POST: CRIAR NOVA LISTA NO BANCO
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
    return NextResponse.json({ error: 'Erro ao criar lista no banco' }, { status: 500 });
  }
}

// 3. PUT: ADICIONAR E ATUALIZAR ITENS
export async function PUT(request) {
  try {
    const body = await request.json();
    const acaoNorm = body.acao || body.ação;

    if (acaoNorm === 'ADICIONAR_ITEM') {
      const { listaId, nome, qtd, precoEstimado, marca } = body;

      const novoItem = await prisma.item.create({
        data: {
          listaId,
          produtoNome: (nome || '').toUpperCase(),
          qtd: parseInt(qtd) || 1,
          precoEstimado: parseFloat(precoEstimado) || 0.0,
          marca: marca || 'PADRÃO',
          marcado: false
        }
      });

      return NextResponse.json({
        id: novoItem.id,
        nome: novoItem.produtoNome,
        qtd: novoItem.qtd,
        un: 'UN',
        marcado: false,
        precoEstimado: novoItem.precoEstimado,
        marca: novoItem.marca
      });
    }

    if (acaoNorm === 'ATUALIZAR_ITEM') {
      const { itemId, qtd, marcado } = body;

      const itemAtualizado = await prisma.item.update({
        where: { id: itemId },
        data: {
          ...(qtd !== undefined && { qtd: parseInt(qtd) }),
          ...(marcado !== undefined && { marcado: Boolean(marcado) })
        }
      });
      return NextResponse.json(itemAtualizado);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro no PUT /api/listas:', error);
    return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 });
  }
}

// 4. DELETE: REMOVER LISTA OU ITEM
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const listaId = searchParams.get('listaId');
    const itemId = searchParams.get('itemId');

    if (itemId) {
      await prisma.item.delete({ where: { id: itemId } });
    } else if (listaId) {
      await prisma.lista.delete({ where: { id: listaId } });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro no DELETE /api/listas:', error);
    return NextResponse.json({ error: 'Erro ao deletar' }, { status: 500 });
  }
}