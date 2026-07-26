import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';

// Função para identificar o usuário conectado via Cookie/JWT
async function getUser(request) {
  const token = request.cookies.get('token')?.value;
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'secreto');
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch {
    return null;
  }
}

// Dados iniciais para quando a lista padrão precisa ser gerada
const ITENS_PADRAO_INICIAIS = [
  { produtoNome: 'ARROZ 5KG', qtd: 1, precoEstimado: 25.90, marca: 'CAMIL' },
  { produtoNome: 'FEIJAO CARIOCA 1KG', qtd: 2, precoEstimado: 7.50, marca: 'KICALDO' },
  { produtoNome: 'LEITE INTEGRAL 1L', qtd: 4, precoEstimado: 4.80, marca: 'NINHO' },
  { produtoNome: 'CAFÉ TORRADO 500G', qtd: 1, precoEstimado: 16.90, marca: 'PILÃO' }
];

// 1. LISTAR TODAS AS LISTAS DO USUÁRIO (E CRIAR PADRÃO NO BANCO SE NÃO EXISTIR)
export async function GET(request) {
  try {
    const user = await getUser(request);
    const whereCondition = user?.userId ? { usuarioId: user.userId } : {};

    // Busca todas as listas salvas no banco
    let listasBD = await prisma.lista.findMany({
      where: whereCondition,
      include: { itens: true },
      orderBy: { createdAt: 'desc' }
    });

    // Verifica se já existe uma Lista Padrão no banco de dados
    const temPadrao = listasBD.some(l => 
      (l.nome || '').toUpperCase().includes('PADRÃO') || 
      (l.nome || '').toUpperCase().includes('PADRAO')
    );

    // Se não existir, cria a Lista Padrão DIRETO NO BANCO DE DADOS
    if (!temPadrao) {
      const novaListaPadrao = await prisma.lista.create({
        data: {
          nome: 'LISTA DE COMPRAS PADRÃO',
          ...(user?.userId && { usuarioId: user.userId }),
          itens: {
            create: ITENS_PADRAO_INICIAIS
          }
        },
        include: { itens: true }
      });

      listasBD.unshift(novaListaPadrao);
    }

    // Formata o retorno para o padrão esperado do React
    const listasFormatadas = listasBD.map(lista => ({
      id: lista.id,
      nome: lista.nome,
      isPrincipal: lista.nome.toUpperCase().includes('PADRÃO') || lista.nome.toUpperCase().includes('PADRAO'),
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
    return NextResponse.json({ error: 'Erro ao carregar listas do banco' }, { status: 500 });
  }
}

// 2. CRIAR NOVA LISTA NO BANCO DE DADOS
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
      isPrincipal: novaLista.nome.toUpperCase().includes('PADRÃO') || novaLista.nome.toUpperCase().includes('PADRAO'),
      itens: []
    }, { status: 201 });
  } catch (error) {
    console.error('Erro no POST /api/listas:', error);
    return NextResponse.json({ error: 'Erro ao criar lista no banco' }, { status: 500 });
  }
}

// 3. ADICIONAR ITEM / ATUALIZAR QUANTIDADE OU CHECK NO BANCO
export async function PUT(request) {
  try {
    const body = await request.json();
    const acaoNorm = body.acao || body.ação;

    // Adicionar Item a uma Lista
    if (acaoNorm === 'ADICIONAR_ITEM') {
      const { listaId, nome, qtd, precoEstimado, marca } = body;

      if (!listaId || !nome) {
        return NextResponse.json({ error: 'listaId e nome são obrigatórios' }, { status: 400 });
      }

      const novoItem = await prisma.item.create({
        data: {
          listaId,
          produtoNome: nome.toUpperCase(),
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
        un: novoItem.un || 'UN',
        marcado: false,
        precoEstimado: novoItem.precoEstimado,
        marca: novoItem.marca
      });
    }

    // Atualizar Quantidade ou Check
    if (acaoNorm === 'ATUALIZAR_ITEM') {
      const { itemId, qtd, marcado } = body;

      if (!itemId) {
        return NextResponse.json({ error: 'itemId é obrigatório' }, { status: 400 });
      }

      const itemAtualizado = await prisma.item.update({
        where: { id: itemId },
        data: {
          ...(qtd !== undefined && { qtd: parseInt(qtd) }),
          ...(marcado !== undefined && { marcado: Boolean(marcado) })
        }
      });
      return NextResponse.json(itemAtualizado);
    }

    return NextResponse.json({ error: 'Ação não reconhecida' }, { status: 400 });
  } catch (error) {
    console.error('Erro no PUT /api/listas:', error);
    return NextResponse.json({ error: 'Erro ao processar alteração no banco' }, { status: 500 });
  }
}

// 4. DELETAR LISTA OU ITEM NO BANCO
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
    return NextResponse.json({ error: 'Erro ao deletar recurso no banco' }, { status: 500 });
  }
}