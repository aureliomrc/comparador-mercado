import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request, { params }) {
  const { id: listaId } = params;

  // 1. Busca os itens da lista do usuário
  const lista = await prisma.lista.findUnique({
    where: { id: listaId },
    include: { itens: true }
  });

  if (!lista || lista.itens.length === 0) {
    return NextResponse.json({ error: 'Lista não encontrada ou vazia' }, { status: 404 });
  }

  const nomesDosItens = lista.itens.map(i => i.produtoNome);

  // 2. Agrupa no PostgreSQL e calcula o menor preço total por Estabelecimento
  // Usamos Query Raw para simplificar a busca por palavras similares (CONTAINS)
  const precosEncontrados = await prisma.precoSefaz.findMany({
    where: {
      OR: nomesDosItens.map(nome => ({
        produtoNome: { contains: nome, mode: 'insensitive' }
      }))
    }
  });

  // 3. Agrupamento em JS por Mercado
  const mercados = {};

  precosEncontrados.forEach(registro => {
    const local = registro.nomeFantasia;
    if (!mercados[local]) {
      mercados[local] = { nome: local, total: 0, itensEncontrados: new Set() };
    }
    mercados[local].total += registro.preco;
    mercados[local].itensEncontrados.add(registro.produtoNome);
  });

  const resultadoFormatado = Object.values(mercados)
    .map(m => ({
      mercado: m.nome,
      totalEstimado: m.total.toFixed(2),
      qtdItensEncontrados: m.itensEncontrados.size,
      totalItensLista: nomesDosItens.length
    }))
    .sort((a, b) => a.totalEstimado - b.totalEstimado);

  return NextResponse.json(resultadoFormatado);
}