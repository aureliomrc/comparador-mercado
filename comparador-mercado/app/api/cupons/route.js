import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: Busca todos os cupons compartilhados pela comunidade no PostgreSQL via Prisma
export async function GET() {
  try {
    const cupons = await prisma.cupomFiscal.findMany({
      orderBy: { criadoEm: 'desc' },
    });
    return NextResponse.json(cupons);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar cupons.' }, { status: 500 });
  }
}

// POST: Recebe o QR Code bipado e salva na base pública
export async function POST(request) {
  try {
    const body = await request.json();
    const { mercado, urlQrCode, usuarioColaborador } = body;

    const novoCupom = await prisma.cupomFiscal.create({
      data: {
        mercado,
        urlQrCode,
        usuarioColaborador,
      },
    });

    return NextResponse.json(novoCupom, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao salvar cupom.' }, { status: 500 });
  }
}

// DELETE: Deleta um cupom por ID
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    await prisma.cupomFiscal.delete({
      where: { id: String(id) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao deletar cupom.' }, { status: 500 });
  }
}