import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Helper para converter ou encontrar o ID do usuário (como número)
async function obterUsuarioId(usuarioIdentificador: any) {
  if (!usuarioIdentificador) return null;

  // Se já for um número exato
  if (!isNaN(usuarioIdentificador)) {
    return parseInt(String(usuarioIdentificador), 10);
  }

  // Se o frontend enviar nome de usuário ou e-mail, busca ou cria na tabela Usuario
  let usr = await prisma.usuario.findFirst({
    where: {
      OR: [
        { nome: String(usuarioIdentificador) },
        { email: String(usuarioIdentificador) }
      ]
    }
  });

  if (!usr) {
    usr = await prisma.usuario.create({
      data: { nome: String(usuarioIdentificador) }
    });
  }

  return usr.id;
}

// 🟢 GET: Busca listas filtrando pelo ID do usuário
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const usuarioParam = searchParams.get('usuario');

  if (!usuarioParam) {
    return NextResponse.json({ error: 'Usuário não informado' }, { status: 400 });
  }

  try {
    const usrId = await obterUsuarioId(usuarioParam);

    if (!usrId) {
      return NextResponse.json([]);
    }

    const listas = await prisma.lista.findMany({
      where: { usuarioId: usrId },
      include: { itens: true },
      orderBy: { criadoEm: 'desc' }
    });

    return NextResponse.json(listas);
  } catch (error: any) {
    console.error('Erro no GET /api/listas:', error);
    return NextResponse.json({ error: 'Erro ao buscar listas' }, { status: 500 });
  }
}

// 🟢 POST: Cria uma nova lista ou clona a lista padrão para o usuário
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { usuario, nome, itens } = body;

    if (!usuario || !nome) {
      return NextResponse.json({ error: 'Usuário e nome da lista são obrigatórios' }, { status: 400 });
    }

    const usrId = await obterUsuarioId(usuario);

    // Prepara os itens da relação ItemLista
    const itensParaCriar = Array.isArray(itens) ? itens.map((item: any) => ({
      nome: String(item.nome || '').toUpperCase(),
      qtd: parseInt(item.qtd, 10) || 1,
      marcado: Boolean(item.marcado),
      precoEstimado: item.precoEstimado ? parseFloat(item.precoEstimado) : 0,
      marca: String(item.marca || '')
    })) : [];

    const novaLista = await prisma.lista.create({
      data: {
        nome: String(nome).toUpperCase(),
        usuarioId: usrId,
        ...(itensParaCriar.length > 0 && {
          itens: {
            create: itensParaCriar
          }
        })
      },
      include: { itens: true }
    });

    return NextResponse.json(novaLista, { status: 201 });
  } catch (error: any) {
    console.error('Erro detalhado no POST /api/listas:', error);
    return NextResponse.json({ error: error.message || 'Erro ao criar lista' }, { status: 500 });
  }
}

// 🟢 PUT: Adiciona ou atualiza itens na tabela ItemLista
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { acao, listaId, itemId, nome, qtd, precoEstimado, marca, marcado } = body;

    if (acao === 'ADICIONAR_ITEM') {
      if (!listaId || !nome) {
        return NextResponse.json({ error: 'listaId e nome são obrigatórios' }, { status: 400 });
      }

      const novoItem = await prisma.itemLista.create({
        data: {
          listaId: parseInt(listaId, 10),
          nome: String(nome).toUpperCase(),
          qtd: parseInt(qtd, 10) || 1,
          precoEstimado: precoEstimado ? parseFloat(precoEstimado) : 0,
          marca: String(marca || ''),
          marcado: false
        }
      });
      return NextResponse.json(novoItem);
    }

    if (acao === 'ATUALIZAR_ITEM') {
      if (!itemId) {
        return NextResponse.json({ error: 'itemId é obrigatório' }, { status: 400 });
      }

      const itemAtualizado = await prisma.itemLista.update({
        where: { id: parseInt(itemId, 10) },
        data: {
          ...(qtd !== undefined && { qtd: parseInt(qtd, 10) }),
          ...(marcado !== undefined && { marcado: Boolean(marcado) })
        }
      });
      return NextResponse.json(itemAtualizado);
    }

    return NextResponse.json({ error: 'Ação não reconhecida' }, { status: 400 });
  } catch (error: any) {
    console.error('Erro no PUT /api/listas:', error);
    return NextResponse.json({ error: 'Erro ao atualizar item' }, { status: 500 });
  }
}

// 🟢 DELETE: Remove item ou lista do banco
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const listaId = searchParams.get('listaId');
  const itemId = searchParams.get('itemId');

  try {
    if (listaId) {
      await prisma.lista.delete({
        where: { id: parseInt(listaId, 10) }
      });
      return NextResponse.json({ success: true });
    }

    if (itemId) {
      await prisma.itemLista.delete({
        where: { id: parseInt(itemId, 10) }
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Nenhum ID informado' }, { status: 400 });
  } catch (error: any) {
    console.error('Erro no DELETE /api/listas:', error);
    return NextResponse.json({ error: 'Erro ao deletar' }, { status: 500 });
  }
}