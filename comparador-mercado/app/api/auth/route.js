import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'secreto');

export async function POST(request) {
  const { action, email, senha } = await request.json();

  if (action === 'register') {
    const existing = await prisma.usuario.findUnique({ where: { email } });
    if (existing) return NextResponse.json({ error: 'Email já cadastrado' }, { status: 400 });

    const hashedPassword = await bcrypt.hash(senha, 10);
    const user = await prisma.usuario.create({
      data: { email, senha: hashedPassword }
    });
    return NextResponse.json({ message: 'Conta criada com sucesso!', userId: user.id });
  }

  if (action === 'login') {
    const user = await prisma.usuario.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(senha, user.senha))) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 400 });
    }

    // Criar Token JWT
    const token = await new SignJWT({ userId: user.id, email: user.email })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('1d')
      .sign(JWT_SECRET);

    const response = NextResponse.json({ message: 'Login realizado!' });
    response.cookies.set('token', token, { httpOnly: true, path: '/' });
    return response;
  }

  return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
}