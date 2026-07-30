import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 📌 GET: Lista padrão para todos + listas do usuário ativo
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const usuarioId = searchParams.get('usuarioId');

    const listasBD = await prisma.lista.findMany({
      where: {
        OR: [
          { isPrincipal: true },
          { usuarioId: usuarioId || undefined }
        ]
      },
      include: {
        itens: true // Tabela ItemLista
      },
      orderBy: { createdAt: 'desc' }
    });

    // Garante a existência da Lista Padrão
    if (listasBD.length === 0) {
      const novaListaPadrao = await prisma.lista.create({
        data: {
          nome: 'LISTA DE COMPRAS PADRÃO',
          isPrincipal: true,
          itens: {
            create: [
              { produtoNome: 'ARROZ 5KG', qtd: 1, precoEstimado: 25.90, marca: 'CAMIL' },
              { produtoNome: 'FEIJAO CARIOCA 1KG', qtd: 2, precoEstimado: 7.50, marca: 'KICALDO' },
              { produtoNome: 'LEITE INTEGRAL 1L', qtd: 4, precoEstimado: 4.80, marca: 'NINHO' }
            ]
          }
        },
        include: { itens: true }
      });
      listasBD.push(novaListaPadrao);
    }

    const listasFormatadas = listasBD.map(lista => ({
      id: lista.id,
      nome: lista.nome,
      isPrincipal: Boolean(lista.isPrincipal),
      itens: (lista.itens || []).map(item => ({
        id: item.id,
        nome: (item.produtoNome || '').toUpperCase(),
        qtd: item.qtd || 1,
        marcado: Boolean(item.marcado),
        precoEstimado: Number(item.precoEstimado || 0),
        marca: item.marca || 'PADRÃO'
      }))
    }));

    return NextResponse.json(listasFormatadas);
  } catch (error) {
    console.error('Erro GET /api/listas:', error);
    return NextResponse.json([], { status: 200 });
  }
}

// 📌 POST: Criar Nova Lista
export async function POST(request) {
  try {
    const body = await request.json();
    const { nome, usuarioId } = body;

    if (!nome) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 });
    }

    const novaLista = await prisma.lista.create({
      data: {
        nome: nome.toUpperCase(),
        isPrincipal: false,
        usuarioId: usuarioId || null
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
    console.error('Erro POST /api/listas:', error);
    return NextResponse.json({ error: 'Erro ao criar lista' }, { status: 500 });
  }
}

// 📌 PUT: Adicionar ou Atualizar Itens na Lista
export async function PUT(request) {
  try {
    const body = await request.json();
    const acao = body.acao || body.ação;

    if (acao === 'ADICIONAR_ITEM') {
      const { listaId, nome, qtd, precoEstimado, marca } = body;

      const novoItem = await prisma.itemLista.create({
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
        marcado: false,
        precoEstimado: Number(novoItem.precoEstimado),
        marca: novoItem.marca
      });
    }

    if (acao === 'ATUALIZAR_ITEM') {
      const { itemId, qtd, marcado } = body;

      const itemAtualizado = await prisma.itemLista.update({
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
    console.error('Erro PUT /api/listas:', error);
    return NextResponse.json({ error: 'Erro ao atualizar item' }, { status: 500 });
  }
}

// 📌 DELETE: Remover Lista ou Item
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const listaId = searchParams.get('listaId');
    const itemId = searchParams.get('itemId');

    if (itemId) {
      await prisma.itemLista.delete({ where: { id: itemId } });
    } else if (listaId) {
      await prisma.lista.delete({ where: { id: listaId } });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro DELETE /api/listas:', error);
    return NextResponse.json({ error: 'Erro ao excluir' }, { status: 500 });
  }
}