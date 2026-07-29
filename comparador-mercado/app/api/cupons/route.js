import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: Busca todos os cupons salvos
export async function GET() {
  try {
    const cupons = await prisma.cupomFiscal.findMany({
      include: {
        mercado: true,
        usuario: true,
      },
      orderBy: { criadoEm: 'desc' },
    });
    return NextResponse.json(cupons);
  } catch (error) {
    console.error('Erro ao buscar cupons:', error);
    return NextResponse.json({ error: 'Erro ao buscar cupons.' }, { status: 500 });
  }
}

// POST: Salva o cupom garantindo a criação/vínculo do Mercado e Usuário
export async function POST(request) {
  try {
    const body = await request.json();
    const { mercado: nomeMercado, urlQrCode, usuarioColaborador } = body;

    if (!nomeMercado) {
      return NextResponse.json({ error: 'Nome do mercado é obrigatório.' }, { status: 400 });
    }

    // 1. Gera ou utiliza uma chave de acesso temporária (caso não venha na URL do QR Code)
    const chaveAcessoGerada = urlQrCode && urlQrCode.length >= 44 
      ? urlQrCode.slice(-44) 
      : `NFCe_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    // 2. Garante que o Mercado existe na tabela "mercados"
    let mercadoExistente = await prisma.mercado.findFirst({
      where: { nome: { equals: nomeMercado, mode: 'insensitive' } }
    });

    if (!mercadoExistente) {
      mercadoExistente = await prisma.mercado.create({
        data: { nome: nomeMercado.toUpperCase() }
      });
    }

    // 3. Tenta vincular o usuário logado (se existir)
    const usuarioExistente = await prisma.usuario.findFirst({
      where: { usuario: usuarioColaborador || '' }
    });

    // 4. Cria o Cupom Fiscal alinhado ao Schema do Prisma
    const novoCupom = await prisma.cupomFiscal.create({
      data: {
        chaveAcesso: chaveAcessoGerada,
        dataEmissao: new Date(),
        valorTotal: 0.00, // Valor padrão inicial antes da extração de itens
        mercadoId: mercadoExistente.id,
        usuarioId: usuarioExistente ? usuarioExistente.id : null,
      },
      include: {
        mercado: true
      }
    });

    return NextResponse.json(novoCupom, { status: 201 });
  } catch (error) {
    console.error('Erro detalhado ao salvar no banco:', error);
    return NextResponse.json({ error: 'Erro interno ao salvar o cupom no banco de dados.' }, { status: 500 });
  }
}

// DELETE: Remove um cupom por ID
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID do cupom não fornecido.' }, { status: 400 });
    }

    await prisma.cupomFiscal.delete({
      where: { id: Number(id) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao deletar cupom:', error);
    return NextResponse.json({ error: 'Erro ao deletar cupom.' }, { status: 500 });
  }
}