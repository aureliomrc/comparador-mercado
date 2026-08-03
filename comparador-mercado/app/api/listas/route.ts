import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 🛡️ Helper à prova de falhas para garantir que o Usuário EXISTE no banco antes de relacionar (Evita FK Error)
async function obterUsuarioId(usuarioIdentificador: any): Promise<number | null> {
  if (!usuarioIdentificador) return null;

  const termo = String(usuarioIdentificador).trim();
  if (!termo) return null;

  try {
    // 1. Tenta buscar primeiro pelo ID numérico (se já for um ID direto do banco)
    const idNumerico = Number(termo);
    if (!isNaN(idNumerico) && Number.isInteger(idNumerico) && idNumerico > 0) {
      const usuarioPorId = await prisma.usuario.findUnique({
        where: { id: idNumerico }
      });
      if (usuarioPorId) return usuarioPorId.id;
    }

    // 2. Busca por nome de usuário ou e-mail na tabela Usuario
    let usr = await prisma.usuario.findFirst({
      where: {
        OR: [
          { nome: termo },
          { email: termo }
        ]
      }
    });

    // 3. Se NÃO existir na tabela, CRIA O USUÁRIO para gerar uma Foreign Key (id) válida!
    if (!usr) {
      usr = await prisma.usuario.create({
        data: {
          nome: termo
        }
      });
    }

    return usr ? usr.id : null;
  } catch (err) {
    console.error('Erro ao resolver usuarioId:', err);
    return null;
  }
}

// 🟢 GET: Busca listas do usuário
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

// 🟢 POST: Cria uma nova lista ou salva a lista padrão clonada
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { usuario, nome, itens } = body;

    if (!usuario || !nome) {
      return NextResponse.json({ error: 'Usuário e nome da lista são obrigatórios' }, { status: 400 });
    }

    // Busca/Cria o usuário no banco para obter o ID correto
    const usrId = await obterUsuarioId(usuario);

    if (!usrId) {
      return NextResponse.json({ error: 'Não foi possível associar a lista a um usuário válido.' }, { status: 400 });
    }

    // Limpa e mapeia os itens descartando qualquer ID string antigo enviado pelo frontend
    const itensParaCriar = Array.isArray(itens) ? itens.map((item: any) => ({
      nome: String(item.nome || '').toUpperCase(),
      qtd: parseInt(String(item.qtd || 1), 10),
      marcado: Boolean(item.marcado),
      precoEstimado: item.precoEstimado ? parseFloat(String(item.precoEstimado)) : 0,
      marca: String(item.marca || '')
    })) : [];

    // Cria a lista no PostgreSQL garantindo usuarioId
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
    return NextResponse.json({ error: error?.message || 'Erro ao criar lista' }, { status: 500 });
  }
}

// 🟢 PUT: Adiciona ou atualiza itens em uma lista
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
          listaId: parseInt(String(listaId), 10),
          nome: String(nome).toUpperCase(),
          qtd: parseInt(String(qtd || 1), 10),
          precoEstimado: precoEstimado ? parseFloat(String(precoEstimado)) : 0,
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
        where: { id: parseInt(String(itemId), 10) },
        data: {
          ...(qtd !== undefined && { qtd: parseInt(String(qtd), 10) }),
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
        where: { id: parseInt(String(listaId), 10) }
      });
      return NextResponse.json({ success: true });
    }

    if (itemId) {
      await prisma.itemLista.delete({
        where: { id: parseInt(String(itemId), 10) }
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Nenhum ID informado' }, { status: 400 });
  } catch (error: any) {
    console.error('Erro no DELETE /api/listas:', error);
    return NextResponse.json({ error: 'Erro ao deletar' }, { status: 500 });
  }
}