import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 📌 GET: Lista padrão para todos + listas do usuário ativo
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const usuarioIdParam = searchParams.get('usuarioId');
    const usuarioId = usuarioIdParam ? Number(usuarioIdParam) : null;

    // Filtra por listas principais OU listas pertencentes ao usuarioId fornecido
    const listasBD = await prisma.lista.findMany({
      where: {
        OR: [
          { isPrincipal: true },
          ...(usuarioId ? [{ usuarioId: usuarioId }] : [])
        ]
      },
      include: {
        itens: {
          orderBy: { id: 'asc' }
        }
      },
      orderBy: { criadoEm: 'desc' }
    });

    // Garante a existência da Lista Padrão no banco de dados se o banco estiver vazio
    if (listasBD.length === 0) {
      const novaListaPadrao = await prisma.lista.create({
        data: {
          nome: 'LISTA DE COMPRAS PADRÃO',
          isPrincipal: true,
          itens: {
            create: [
              { nome: 'ARROZ 5KG', qtd: 1, precoEstimado: 25.90, marca: 'CAMIL' },
              { nome: 'FEIJAO CARIOCA 1KG', qtd: 2, precoEstimado: 7.50, marca: 'KICALDO' },
              { nome: 'LEITE INTEGRAL 1L', qtd: 4, precoEstimado: 4.80, marca: 'NINHO' }
            ]
          }
        },
        include: { itens: true }
      });
      listasBD.push(novaListaPadrao);
    }

    const listasFormatadas = listasBD.map(lista => ({
      id: String(lista.id),
      nome: lista.nome,
      isPrincipal: Boolean(lista.isPrincipal),
      itens: (lista.itens || []).map(item => ({
        id: String(item.id),
        nome: (item.nome || '').toUpperCase(),
        qtd: item.qtd || 1,
        marcado: Boolean(item.marcado),
        precoEstimado: Number(item.precoEstimado || 0),
        marca: item.marca || 'PADRÃO'
      }))
    }));

    return NextResponse.json(listasFormatadas, { status: 200 });
  } catch (error) {
    console.error('Erro GET /api/listas:', error);
    return NextResponse.json({ error: 'Erro ao buscar listas no banco de dados.' }, { status: 500 });
  }
}

// 📌 POST: Criar Nova Lista
export async function POST(request) {
  try {
    const body = await request.json();
    const { nome, usuarioId } = body;

    if (!nome || !String(nome).trim()) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 });
    }

    const novaLista = await prisma.lista.create({
      data: {
        nome: String(nome).trim().toUpperCase(),
        isPrincipal: false,
        usuarioId: usuarioId ? Number(usuarioId) : null
      },
      include: { itens: true }
    });

    return NextResponse.json({
      id: String(novaLista.id),
      nome: novaLista.nome,
      isPrincipal: false,
      itens: []
    }, { status: 201 });
  } catch (error) {
    console.error('Erro POST /api/listas:', error);
    return NextResponse.json({ error: 'Erro ao criar lista no servidor.' }, { status: 500 });
  }
}

// 📌 PUT: Adicionar ou Atualizar Itens na Lista
export async function PUT(request) {
  try {
    const body = await request.json();
    const acao = body.acao || body.ação;

    if (acao === 'ADICIONAR_ITEM') {
      const { listaId, nome, qtd, precoEstimado, marca } = body;

      if (!listaId || !nome) {
        return NextResponse.json({ error: 'ID da lista e nome do produto são obrigatórios.' }, { status: 400 });
      }

      const novoItem = await prisma.itemLista.create({
        data: {
          listaId: Number(listaId),
          nome: String(nome).trim().toUpperCase(),
          qtd: parseInt(qtd) || 1,
          precoEstimado: parseFloat(precoEstimado) || 0.0,
          marca: marca || 'PADRÃO',
          marcado: false
        }
      });

      return NextResponse.json({
        id: String(novoItem.id),
        nome: novoItem.nome,
        qtd: novoItem.qtd,
        marcado: false,
        precoEstimado: Number(novoItem.precoEstimado || 0),
        marca: novoItem.marca
      }, { status: 201 });
    }

    if (acao === 'ATUALIZAR_ITEM') {
      const { itemId, qtd, marcado } = body;

      if (!itemId) {
        return NextResponse.json({ error: 'ID do item é obrigatório.' }, { status: 400 });
      }

      const dadosAtualizacao = {};
      if (qtd !== undefined) dadosAtualizacao.qtd = parseInt(qtd);
      if (marcado !== undefined) dadosAtualizacao.marcado = Boolean(marcado);

      const itemAtualizado = await prisma.itemLista.update({
        where: { id: Number(itemId) },
        data: dadosAtualizacao
      });

      return NextResponse.json({
        id: String(itemAtualizado.id),
        nome: itemAtualizado.nome,
        qtd: itemAtualizado.qtd,
        marcado: Boolean(itemAtualizado.marcado),
        precoEstimado: Number(itemAtualizado.precoEstimado || 0),
        marca: itemAtualizado.marca
      }, { status: 200 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Erro PUT /api/listas:', error);
    return NextResponse.json({ error: 'Erro ao atualizar item no banco de dados.' }, { status: 500 });
  }
}

// 📌 DELETE: Remover Lista ou Item
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const listaId = searchParams.get('listaId');
    const itemId = searchParams.get('itemId');

    if (itemId) {
      await prisma.itemLista.delete({
        where: { id: Number(itemId) }
      });
      return NextResponse.json({ success: true, message: 'Item excluído com sucesso.' }, { status: 200 });
    }
    
    if (listaId) {
      await prisma.lista.delete({
        where: { id: Number(listaId) }
      });
      return NextResponse.json({ success: true, message: 'Lista excluída com sucesso.' }, { status: 200 });
    }

    return NextResponse.json({ error: 'Informe um listaId ou itemId para excluir.' }, { status: 400 });
  } catch (error) {
    console.error('Erro DELETE /api/listas:', error);
    return NextResponse.json({ error: 'Erro ao excluir no banco de dados.' }, { status: 500 });
  }
}