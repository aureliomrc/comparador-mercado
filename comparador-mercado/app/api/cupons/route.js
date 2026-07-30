import { NextResponse } from 'next/server';

// Simulação de banco em memória caso precise testar sem ORM.
// Substitua pelas chamadas do seu banco real (Prisma, Postgres, Supabase, MongoDB, etc.)
let bancoDeDadosCupons = [];

// GET: Lista todos os cupons salvos
export async function GET() {
  try {
    return NextResponse.json(bancoDeDadosCupons, { status: 200 });
  } catch (error) {
    console.error('Erro no GET /api/cupons:', error);
    return NextResponse.json({ error: 'Erro ao listar cupons do banco de dados.' }, { status: 500 });
  }
}

// POST: Grava um novo cupom no banco de dados
export async function POST(request) {
  try {
    const body = await request.json();

    // Validação básica dos dados recebidos
    if (!body.mercado && !body.url) {
      return NextResponse.json(
        { error: 'Parâmetros insuficientes: Informe o nome do mercado ou a URL do QR Code.' },
        { status: 400 }
      );
    }

    // Estrutura o objeto para gravação
    const novoCupom = {
      id: Date.now().toString(),
      mercado: body.mercado || 'MERCADO VIA CUPOM',
      url: body.url || '',
      data: body.data || new Date().toLocaleDateString('pt-BR'),
      hora: body.hora || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      itens: body.itens || [
        // Exemplo de itens fictícios que seriam extraídos via SEFAZ/scraping
        { nome: 'ARROZ 5KG', preco: 24.90, qtd: 1 },
        { font: 'FEIJÃO CARIOCA 1KG', preco: 6.80, qtd: 2 }
      ]
    };

    // AQUI ENTRA A LÓGICA DO SEU BANCO DE DADOS:
    // Exemplo: const cupomSalvo = await prisma.cupom.create({ data: novoCupom });
    bancoDeDadosCupons.unshift(novoCupom);

    return NextResponse.json(novoCupom, { status: 201 });
  } catch (error) {
    console.error('Erro no POST /api/cupons:', error);
    return NextResponse.json(
      { error: 'Falha interna ao gravar o cupom no banco de dados.' },
      { status: 500 }
    );
  }
}

// DELETE: Remove um cupom pelo ID
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID do cupom não informado.' }, { status: 400 });
    }

    // AQUI ENTRA A LÓGICA DO SEU BANCO DE DADOS:
    // Exemplo: await prisma.cupom.delete({ where: { id } });
    bancoDeDadosCupons = bancoDeDadosCupons.filter(c => c.id !== id);

    return NextResponse.json({ message: 'Cupom removido com sucesso.' }, { status: 200 });
  } catch (error) {
    console.error('Erro no DELETE /api/cupons:', error);
    return NextResponse.json({ error: 'Erro ao excluir o cupom do banco.' }, { status: 500 });
  }
}