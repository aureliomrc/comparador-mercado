import { NextResponse } from 'next/server';

// Banco em memória global simulado
let bancoCupons: any[] = [];

// Função que baixa o HTML da SEFAZ direto pelo servidor e extrai os itens
async function extrairProdutosDaSefazServer(urlQr: string) {
  try {
    const response = await fetch(urlQr, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
      },
      cache: 'no-store'
    });

    if (!response.ok) return [];

    const htmlText = await response.text();
    const itens: Array<{ nome: string; preco: number; qtd: number }> = [];

    // Usando [\s\S]*? sem a flag 's' para compatibilidade total
    const rxLinhas = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let matchLinha;

    while ((matchLinha = rxLinhas.exec(htmlText)) !== null) {
      const conteudoLinha = matchLinha[1];

      // Nome do produto
      const matchNome = conteudoLinha.match(/class="(?:txtTit|txtTit2|txtBox|fixo-td-descricao)"[^>]*>(.*?)<\/span>/i) ||
                        conteudoLinha.match(/<td[^>]*class="fixo-td-descricao"[^>]*>(.*?)<\/td>/i);
      
      // Valor do produto
      const matchValor = conteudoLinha.match(/class="(?:R\$|valor|Rval|valorTotal|fixo-td-valor)"[^>]*>(.*?)<\/span>/i) ||
                         conteudoLinha.match(/<td[^>]*class="fixo-td-valor"[^>]*>(.*?)<\/td>/i);

      // Quantidade
      const matchQtd = conteudoLinha.match(/class="(?:Rqtd|qtd|quantidade|fixo-td-qtd)"[^>]*>(.*?)<\/span>/i) ||
                       conteudoLinha.match(/<td[^>]*class="fixo-td-qtd"[^>]*>(.*?)<\/td>/i);

      if (matchNome && matchNome[1]) {
        const nomeLimpo = matchNome[1].replace(/<[^>]+>/g, '').trim().toUpperCase();
        
        if (nomeLimpo && nomeLimpo.length > 2 && !nomeLimpo.includes('CÓDIGO') && !nomeLimpo.includes('DESCRIÇÃO')) {
          let preco = 0;
          let qtd = 1;

          if (matchValor && matchValor[1]) {
            const valStr = matchValor[1].replace(/<[^>]+>/g, '').replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
            preco = parseFloat(valStr) || 0;
          }

          if (matchQtd && matchQtd[1]) {
            const qtdStr = matchQtd[1].replace(/<[^>]+>/g, '').replace(/[^0-9,.]/g, '').replace(',', '.').trim();
            qtd = parseFloat(qtdStr) || 1;
          }

          itens.push({ nome: nomeLimpo, preco, qtd });
        }
      }
    }

    return itens;
  } catch (error) {
    console.error('Erro ao extrair produtos na SEFAZ pelo servidor:', error);
    return [];
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const usuario = searchParams.get('usuario');
  const todos = searchParams.get('todos');
  
  // Se solicitar "todos=true", retorna os cupons de TODOS os usuários para a comparação global
  if (todos === 'true') {
    return NextResponse.json(bancoCupons);
  }

  // Se passar um usuário específico, retorna apenas os cupons dele (para a aba de Meus Cupons)
  if (usuario) {
    const cuponsUsuario = bancoCupons.filter(c => c.usuario === usuario);
    return NextResponse.json(cuponsUsuario);
  }
  
  return NextResponse.json(bancoCupons);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { usuario, mercado, url, data, hora, itens: itensEnviados } = body;

    let produtosFinais = Array.isArray(itensEnviados) ? itensEnviados : [];

    // Se o cliente não enviou itens, o servidor busca diretamente na SEFAZ
    if (produtosFinais.length === 0 && url && url.startsWith('http')) {
      produtosFinais = await extrairProdutosDaSefazServer(url);
    }

    const novoCupom = {
      id: Date.now().toString(),
      usuario,
      mercado: mercado || 'MERCADO VIA QR CODE',
      url,
      data: data || new Date().toLocaleDateString('pt-BR'),
      hora: hora || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      itens: produtosFinais
    };

    bancoCupons.unshift(novoCupom);

    return NextResponse.json(novoCupom, { status: 201 });
  } catch (error) {
    console.error('Erro na API de cupons:', error);
    return NextResponse.json({ error: 'Erro ao processar cupom' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (id) {
    bancoCupons = bancoCupons.filter(c => c.id !== id);
    return NextResponse.json({ success: true });
  }
  return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
}