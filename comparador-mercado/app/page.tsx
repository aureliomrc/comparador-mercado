'use client';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

// 🛒 LISTA PADRÃO INICIAL
const LISTA_PADRAO = [
  {
    nome: 'COMPRAS DO MÊS',
    itens: [
      { nome: 'ARROZ 5KG', qtd: 1, marcado: false, precoEstimado: 25.90, marca: 'CAMIL' },
      { nome: 'FEIJÃO CARIOCA 1KG', qtd: 2, marcado: false, precoEstimado: 7.50, marca: 'KICALDO' },
      { nome: 'LEITE INTEGRAL 1L', qtd: 12, marcado: false, precoEstimado: 4.80, marca: 'NINHO' },
      { nome: 'CAFÉ MOÍDO 500G', qtd: 2, marcado: false, precoEstimado: 16.90, marca: 'PILÃO' },
      { nome: 'AÇÚCAR REFINADO 1KG', qtd: 3, marcado: false, precoEstimado: 4.20, marca: 'UNIÃO' }
    ]
  }
];

// Helper para exibição segura de textos/objetos
const renderTexto = (val: any, fallback = '') => {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'object') {
    return val.nome || val.name || val.title || val.id || JSON.stringify(val);
  }
  return String(val);
};

// Helper para extrair itens do cupom
const obterItensCupom = (cupom: any) => {
  if (!cupom) return [];

  let objetoCupom = cupom;
  if (typeof cupom === 'string') {
    try {
      objetoCupom = JSON.parse(cupom);
    } catch (e) {
      return [];
    }
  }

  let rawItens = 
    objetoCupom.itens || 
    objetoCupom.items || 
    objetoCupom.produtos || 
    objetoCupom.products ||
    objetoCupom.dados?.itens ||
    objetoCupom.dados?.produtos ||
    objetoCupom.conteudo?.itens ||
    [];

  if (typeof rawItens === 'string') {
    try {
      rawItens = JSON.parse(rawItens);
    } catch (e) {
      console.error('Erro ao converter JSON dos itens:', e);
      return [];
    }
  }

  return Array.isArray(rawItens) ? rawItens : [];
};

// Dicionário de abreviações de supermercado
const DICIONARIO_ABREVIACOES: Record<string, string> = {
  'int': 'integral', 'integ': 'integral', 'desm': 'desnatado', 'semid': 'semidesnatado',
  'lt': 'leite', 'lte': 'leite', 'tp': 'tetrapack', 'cx': 'caixa', 'pote': 'pote',
  'pdr': 'padrao', 'trad': 'tradicional', 'ext': 'extra', 'fbr': 'forte', 'c/': 'com',
  's/': 'sem', 'arz': 'arroz', 'brn': 'branco', 'ag': 'agulhinha', 'feij': 'feijao',
  'carioc': 'carioquinha', 'prt': 'preto', 'acuc': 'acucar', 'ref': 'refinado',
  'cryst': 'cristal', 'caf': 'cafe', 'tost': 'torrado', 'oido': 'moido', 'oleo': 'oleo',
  'soj': 'soja', 'farn': 'farinha', 'trg': 'trigo'
};

const normalizarETraduzirTexto = (texto: any) => {
  if (!texto) return [];
  const palavrasLimpas = String(texto)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(p => p.length > 1 && !['de', 'da', 'do', 'com', 'para', 'em', 'sem', 'la', 'le', '1l', '1kg', '500g', '5kg'].includes(p));

  return palavrasLimpas.map(palavra => DICIONARIO_ABREVIACOES[palavra] || palavra);
};

const buscarPrecoNoCupom = (itemNomeLista: string, cupomItens: any) => {
  const listaProdutos = Array.isArray(cupomItens) ? cupomItens : [];
  if (listaProdutos.length === 0 || !itemNomeLista) return null;

  const palavrasBusca = normalizarETraduzirTexto(itemNomeLista);
  if (palavrasBusca.length === 0) return null;

  let melhorMatch: any = null;
  let maiorPontuacao = 0;

  for (const itemCupom of listaProdutos) {
    const nomeItemCupom = itemCupom.nome || itemCupom.descricao || itemCupom.product || itemCupom.dsc || '';
    const palavrasCupom = normalizarETraduzirTexto(nomeItemCupom);
    
    let correspondencias = 0;
    for (const palavra of palavrasBusca) {
      if (palavrasCupom.some((p: string) => p.includes(palavra) || palavra.includes(p))) {
        correspondencias++;
      }
    }

    const pontuacao = correspondencias / palavrasBusca.length;

    if (pontuacao > maiorPontuacao && pontuacao >= 0.3) {
      maiorPontuacao = pontuacao;
      melhorMatch = itemCupom;
    }
  }

  const preco = melhorMatch ? (melhorMatch.preco || melhorMatch.precoUnitario || melhorMatch.val || melhorMatch.valor) : null;
  return preco ? Number(preco) : null;
};

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; errorInfo: string }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorInfo: '' };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, errorInfo: error?.toString() || 'Erro desconhecido' };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Erro capturado no React:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-red-50 text-red-900 rounded-2xl m-4 border border-red-200 font-sans">
          <h2 className="font-bold text-lg mb-2">Ops! Ocorreu um erro no aplicativo.</h2>
          <p className="text-xs font-mono bg-red-100 p-3 rounded mb-4 overflow-auto break-all">
            {this.state.errorInfo}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false });
              window.location.reload();
            }}
            className="bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-red-700"
          >
            Tentar Novamente
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function MainApp() {
  const [screen, setScreen] = useState('login');
  const [isLogged, setIsLogged] = useState(false);
  const [loadingListas, setLoadingListas] = useState(false);
  const [loadingCupons, setLoadingCupons] = useState(false);
  const [isSalvandoCupom, setIsSalvandoCupom] = useState(false);
  const [activeTab, setActiveTab] = useState('listas');

  const [authMode, setAuthMode] = useState('login');
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [emailCadastro, setEmailCadastro] = useState('');
  const [usuarioCadastro, setUsuarioCadastro] = useState('');
  const [senhaCadastro, setSenhaCadastro] = useState('');
  const [aceitouLgpd, setAceitouLgpd] = useState(false);
  const [showTermosModal, setShowTermosModal] = useState(false);

  const [listas, setListas] = useState<any[]>([]);
  const [listasAbertas, setListasAbertas] = useState<Record<string, boolean>>({});
  const [novaListaNome, setNovaListaNome] = useState('');
  const [inputsItens, setInputsItens] = useState<Record<string, { nome: string; qtd: number }>>({});

  const [listaParaCompararId, setListaParaCompararId] = useState<any>('');
  const [mercadoSelecionadoDetalhe, setMercadoSelecionadoDetalhe] = useState<any>(null);
  const [loadingGeo, setLoadingGeo] = useState(false);
  const [mercadosReais, setMercadosReais] = useState<any[]>([]);
  const [usandoGeo, setUsandoGeo] = useState(false);

  const [cuponsAbertos, setCuponsAbertos] = useState<Record<string, boolean>>({});
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrUrlInput, setQrUrlInput] = useState('');
  const [nomeFantasiaInput, setNomeFantasiaInput] = useState('');
  const [historicoCupons, setHistoricoCupons] = useState<any[]>([]);
  const [cameraError, setCameraError] = useState('');
  const qrScannerRef = useRef<Html5Qrcode | null>(null);

  const carregarCuponsDoBanco = async () => {
    setLoadingCupons(true);
    try {
      const res = await fetch(`/api/cupons?usuario=${encodeURIComponent(usuario)}`, { cache: 'no-store' });
      if (res.ok) {
        const dados = await res.json();
        setHistoricoCupons(Array.isArray(dados) ? dados : []);
      }
    } catch (error) {
      console.error('Erro ao buscar cupons do banco:', error);
    } finally {
      setLoadingCupons(false);
    }
  };

  const inicializarListaPadraoParaUsuario = async (nomeUsuario: string) => {
    try {
      const res = await fetch('/api/listas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuario: nomeUsuario,
          nome: LISTA_PADRAO[0].nome,
          itens: LISTA_PADRAO[0].itens
        })
      });

      if (res.ok) {
        const novaLista = await res.json();
        setListas([novaLista]);
        setListaParaCompararId(novaLista.id);
      } else {
        const errJson = await res.json().catch(() => null);
        console.error('Erro na resposta do servidor:', errJson);
        alert(`Não foi possível criar a lista padrão: ${errJson?.error || 'Erro interno'}`);
      }
    } catch (err) {
      console.error('Erro ao clonar lista padrão:', err);
    }
  };

  const carregarListasDoBanco = async () => {
    if (!usuario) return;
    setLoadingListas(true);
    try {
      const res = await fetch(`/api/listas?usuario=${encodeURIComponent(usuario)}`, { cache: 'no-store' });
      if (res.ok) {
        const dados = await res.json();
        if (Array.isArray(dados) && dados.length > 0) {
          setListas(dados);
          setListaParaCompararId(dados[0].id);
        } else {
          await inicializarListaPadraoParaUsuario(usuario);
        }
      }
    } catch (error) {
      console.error('Erro ao conectar com o banco:', error);
    } finally {
      setLoadingListas(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuario.trim()) return alert('Digite seu usuário');
    setIsLogged(true);
    setScreen('dashboard');
    await carregarListasDoBanco();
    await carregarCuponsDoBanco();
  };

  const handleCadastro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeCompleto.trim() || !emailCadastro.trim() || !usuarioCadastro.trim() || !senhaCadastro.trim()) {
      return alert('Por favor, preencha todos os campos do cadastro.');
    }
    if (!aceitouLgpd) {
      return alert('Você precisa aceitar os termos de privacidade (LGPD) para prosseguir.');
    }

    setUsuario(usuarioCadastro);
    setIsLogged(true);
    setScreen('dashboard');
    alert(`Conta criada com sucesso! Bem-vindo(a), ${nomeCompleto.split(' ')[0]}!`);
    await carregarListasDoBanco();
    await carregarCuponsDoBanco();
  };

  const handleLogout = () => {
    pararScanner();
    setIsLogged(false);
    setListas([]);
    setHistoricoCupons([]);
    setUsuario('');
    setScreen('login');
  };

  const iniciarScanner = async () => {
    setCameraError('');
    try {
      if (qrScannerRef.current) {
        await pararScanner();
      }

      const html5QrCode = new Html5Qrcode("reader");
      qrScannerRef.current = html5QrCode;

      const config = { fps: 10, qrbox: { width: 220, height: 220 } };

      await html5QrCode.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          setQrUrlInput(decodedText);
          pararScanner();
          alert(`✅ QR Code lido com sucesso!\n\nClique em "Salvar Cupom" abaixo para processar.`);
        },
        () => {}
      );
    } catch (err) {
      console.error('Erro ao iniciar câmera:', err);
      setCameraError('Não foi possível abrir a câmera. Permita o acesso ou insira o link/nome.');
    }
  };

  const pararScanner = async () => {
    if (qrScannerRef.current) {
      try {
        if (qrScannerRef.current.isScanning) {
          await qrScannerRef.current.stop();
        }
        qrScannerRef.current.clear();
      } catch (err) {
        console.error("Erro ao parar scanner:", err);
      }
      qrScannerRef.current = null;
    }
  };

  const abrirModalQr = () => {
    setShowQrModal(true);
  };

  const fecharModalQr = () => {
    pararScanner();
    setShowQrModal(false);
  };

  useEffect(() => {
    if (showQrModal) {
      const timer = setTimeout(() => {
        iniciarScanner();
      }, 300);
      return () => clearTimeout(timer);
    } else {
      pararScanner();
    }
  }, [showQrModal]);

  const buscarMercadosProximos = () => {
    if (!navigator.geolocation) {
      alert('Geolocalização não é suportada pelo seu navegador.');
      return;
    }

    setLoadingGeo(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const query = `[out:json];node["shop"="supermarket"](around:5000,${latitude},${longitude});out 5;`;
          const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
          
          const response = await fetch(url);
          const data = await response.json();

          if (data.elements && data.elements.length > 0) {
            const mercadosEncontrados = data.elements.map((el: any, index: number) => ({
              id: el.id || index,
              nome: (el.tags?.name || `SUPERMERCADO ${index + 1}`).toUpperCase(),
              distancia: (Math.random() * 2 + 0.5).toFixed(1) + ' km',
              fatorPreco: 1 + (index * 0.03 - 0.02)
            }));
            setMercadosReais(mercadosEncontrados);
            setUsandoGeo(true);
          } else {
            alert('Nenhum supermercado encontrado próximo via GPS. Exibindo simulados.');
          }
        } catch (err) {
          console.error('Erro ao buscar mercados via GPS:', err);
        } finally {
          setLoadingGeo(false);
        }
      },
      (error) => {
        console.error('Erro de GPS:', error);
        alert('Não foi possível obter sua localização. Verifique as permissões.');
        setLoadingGeo(false);
      }
    );
  };

  // FIX: Envio direto ao backend, delegando scraping do HTML para o Node.js
  const processarCupomQrCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeFantasiaInput.trim() && !qrUrlInput.trim()) {
      return alert('Preencha o nome do estabelecimento ou escaneie o QR Code!');
    }

    setIsSalvandoCupom(true);
    const nomeEstabelecimento = nomeFantasiaInput.trim().toUpperCase() || 'MERCADO VIA QR CODE';

    try {
      const res = await fetch('/api/cupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuario: usuario,
          mercado: nomeEstabelecimento,
          url: qrUrlInput.trim(),
          data: new Date().toLocaleDateString('pt-BR'),
          hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        })
      });

      if (res.ok) {
        const cupomSalvo = await res.json();
        setHistoricoCupons(prev => [cupomSalvo, ...(Array.isArray(prev) ? prev : [])]);
        setQrUrlInput('');
        setNomeFantasiaInput('');
        fecharModalQr();
        alert('✅ Cupom salvo com sucesso!');
      } else {
        const errorData = await res.json().catch(() => null);
        alert(`❌ Erro ao salvar: ${errorData?.error || 'Tente novamente'}`);
      }
    } catch (err) {
      console.error('Erro de conexão ao salvar cupom:', err);
      alert('❌ Falha na conexão com o servidor.');
    } finally {
      setIsSalvandoCupom(false);
    }
  };

  const excluirCupom = async (id: any) => {
    if (confirm('Deseja excluir este cupom do banco de dados?')) {
      try {
        const res = await fetch(`/api/cupons?id=${id}&usuario=${encodeURIComponent(usuario)}`, { method: 'DELETE' });
        if (res.ok) {
          setHistoricoCupons(prev => prev.filter((c: any) => c.id !== id));
        } else {
          alert('Erro ao excluir do banco de dados.');
        }
      } catch (err) {
        console.error('Erro ao excluir cupom:', err);
      }
    }
  };

  const obterMarcaParaItem = (nomeItem: string) => {
    const itemUpper = (nomeItem || '').toUpperCase();
    if (itemUpper.includes('ARROZ')) return 'CAMIL';
    if (itemUpper.includes('FEIJÃO') || itemUpper.includes('FEIJAO')) return 'KICALDO';
    if (itemUpper.includes('LEITE')) return 'NINHO';
    if (itemUpper.includes('CAFÉ') || itemUpper.includes('CAFE')) return 'PILÃO';
    if (itemUpper.includes('AÇÚCAR') || itemUpper.includes('ACUCAR')) return 'UNIÃO';
    if (itemUpper.includes('OLEO') || itemUpper.includes('ÓLEO')) return 'LIZA';
    return 'MARCA SEFAZ';
  };

  const criarNovaLista = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaListaNome.trim()) return;

    try {
      const res = await fetch('/api/listas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          usuario: usuario,
          nome: novaListaNome.trim().toUpperCase() 
        })
      });

      if (res.ok) {
        const novaListaCriada = await res.json();
        setListas(prev => [novaListaCriada, ...(Array.isArray(prev) ? prev : [])]);
        setListaParaCompararId(novaListaCriada.id);
        setNovaListaNome('');
      } else {
        const errData = await res.json().catch(() => null);
        alert(`Ocorreu um erro ao salvar a lista no banco: ${errData?.error || 'Verifique a rota'}`);
      }
    } catch (err) {
      console.error('Erro ao criar lista:', err);
    }
  };

  const handleInputItemChange = (listaId: any, campo: string, valor: any) => {
    setInputsItens(prev => ({
      ...prev,
      [listaId]: {
        nome: campo === 'nome' ? valor : prev[listaId]?.nome || '',
        qtd: campo === 'qtd' ? valor : prev[listaId]?.qtd || 1
      }
    }));
  };

  const adicionarItem = async (e: React.FormEvent, listaId: any) => {
    if (e) e.preventDefault();
    const input = inputsItens[listaId];
    if (!input || !input.nome || !input.nome.trim()) return;

    const nomeFormatado = input.nome.trim().toUpperCase();
    const qtdInserida = Number(input.qtd) || 1;
    const precoEstimadoBase = (Math.random() * 15 + 3).toFixed(2);
    const marcaCalculada = obterMarcaParaItem(nomeFormatado);

    try {
      const res = await fetch('/api/listas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acao: 'ADICIONAR_ITEM',
          usuario: usuario,
          listaId,
          nome: nomeFormatado,
          qtd: qtdInserida,
          precoEstimado: precoEstimadoBase,
          marca: marcaCalculada
        })
      });

      if (res.ok) {
        const itemSalvo = await res.json();
        setListas(prevListas => (Array.isArray(prevListas) ? prevListas : []).map((l: any) => {
          if (l.id === listaId) {
            return { ...l, itens: [...(Array.isArray(l.itens) ? l.itens : []), itemSalvo] };
          }
          return l;
        }));
        setInputsItens(prev => ({ ...prev, [listaId]: { nome: '', qtd: 1 } }));
      } else {
        alert('Erro ao salvar item no banco de dados.');
      }
    } catch (err) {
      console.error('Erro ao adicionar item:', err);
    }
  };

  const alterarQuantidade = async (listaId: any, itemId: any, delta: number) => {
    let novaQtd = 1;

    setListas(prevListas => (Array.isArray(prevListas) ? prevListas : []).map((l: any) => {
      if (l.id === listaId) {
        return {
          ...l,
          itens: (Array.isArray(l.itens) ? l.itens : []).map((item: any) => {
            if (item.id === itemId) {
              novaQtd = Math.max(1, (item.qtd || 1) + delta);
              return { ...item, qtd: novaQtd };
            }
            return item;
          })
        };
      }
      return l;
    }));

    await fetch('/api/listas', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acao: 'ATUALIZAR_ITEM', usuario, itemId, qtd: novaQtd })
    });
  };

  const removerItem = async (listaId: any, itemId: any) => {
    setListas(prev => (Array.isArray(prev) ? prev : []).map((l: any) => l.id === listaId ? { ...l, itens: (Array.isArray(l.itens) ? l.itens : []).filter((i: any) => i.id !== itemId) } : l));
    await fetch(`/api/listas?itemId=${itemId}&usuario=${encodeURIComponent(usuario)}`, { method: 'DELETE' });
  };

  const toggleCheck = async (listaId: any, itemId: any) => {
    let novoMarcado = false;
    setListas(prev => (Array.isArray(prev) ? prev : []).map((l: any) => {
      if (l.id === listaId) {
        return {
          ...l,
          itens: (Array.isArray(l.itens) ? l.itens : []).map((i: any) => {
            if (i.id === itemId) {
              novoMarcado = !i.marcado;
              return { ...i, marcado: novoMarcado };
            }
            return i;
          })
        };
      }
      return l;
    }));

    await fetch('/api/listas', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acao: 'ATUALIZAR_ITEM', usuario, itemId, marcado: novoMarcado })
    });
  };

  const deletarLista = async (id: any) => {
    if (confirm('Deseja realmente excluir esta lista e todos os seus itens?')) {
      const novasListas = (Array.isArray(listas) ? listas.filter((l: any) => l.id !== id) : []);
      setListas(novasListas);
      if (listaParaCompararId === id) {
        setListaParaCompararId(novasListas[0]?.id || '');
      }
      await fetch(`/api/listas?listaId=${id}&usuario=${encodeURIComponent(usuario)}`, { method: 'DELETE' });
    }
  };

  if (screen === 'login' && !isLogged) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0066a1] p-4 font-sans">
        <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-extrabold text-[#0d824d] flex items-center justify-center gap-2">
              <span>🛒</span> TÁ QUANTO?
            </h1>
            <p className="text-gray-600 text-sm font-medium">
              {authMode === 'login' ? 'Faça login para comparar suas listas' : 'Crie sua conta para começar'}
            </p>
          </div>

          <div className="flex border-b border-gray-200">
            <button
              type="button"
              onClick={() => setAuthMode('login')}
              className={`flex-1 py-2 text-center font-bold text-xs border-b-2 transition-all ${
                authMode === 'login'
                  ? 'border-[#0d824d] text-[#0d824d]'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              ENTRAR
            </button>
            <button
              type="button"
              onClick={() => setAuthMode('cadastro')}
              className={`flex-1 py-2 text-center font-bold text-xs border-b-2 transition-all ${
                authMode === 'cadastro'
                  ? 'border-[#0d824d] text-[#0d824d]'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              CADASTRAR-SE
            </button>
          </div>

          {authMode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nome de Usuário</label>
                <input
                  type="text"
                  placeholder="Digite seu usuário"
                  value={usuario}
                  onChange={e => setUsuario(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#0d824d]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Senha</label>
                <input
                  type="password"
                  placeholder="Digite sua senha"
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#0d824d]"
                  required
                />
              </div>

              <button type="submit" className="w-full bg-[#0d824d] hover:bg-[#0a673d] text-white py-3 rounded-full font-bold text-sm shadow-md transition-all">
                Entrar
              </button>
            </form>
          )}

          {authMode === 'cadastro' && (
            <form onSubmit={handleCadastro} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nome Completo</label>
                <input
                  type="text"
                  placeholder="Ex: João da Silva"
                  value={nomeCompleto}
                  onChange={e => setNomeCompleto(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl text-xs text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#0d824d]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">E-mail</label>
                <input
                  type="email"
                  placeholder="seu@email.com"
                  value={emailCadastro}
                  onChange={e => setEmailCadastro(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl text-xs text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#0d824d]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nome de Usuário</label>
                <input
                  type="text"
                  placeholder="Escolha um nome de usuário"
                  value={usuarioCadastro}
                  onChange={e => setUsuarioCadastro(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl text-xs text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#0d824d]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Senha</label>
                <input
                  type="password"
                  placeholder="Crie uma senha segura"
                  value={senhaCadastro}
                  onChange={e => setSenhaCadastro(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl text-xs text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#0d824d]"
                  required
                />
              </div>

              <div className="pt-2">
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="lgpd"
                    checked={aceitouLgpd}
                    onChange={e => setAceitouLgpd(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#0d824d] cursor-pointer"
                  />
                  <label htmlFor="lgpd" className="text-[11px] text-gray-600 leading-tight">
                    Li e concordo com o tratamento de dados segundo a LGPD.{' '}
                    <button
                      type="button"
                      onClick={() => setShowTermosModal(true)}
                      className="text-blue-600 font-bold underline hover:text-blue-800"
                    >
                      Ler Termos
                    </button>
                  </label>
                </div>
              </div>

              <button type="submit" className="w-full bg-[#0d824d] hover:bg-[#0a673d] text-white py-3 rounded-full font-bold text-sm shadow-md transition-all mt-2">
                Cadastrar e Acessar
              </button>
            </form>
          )}

          {showTermosModal && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
              <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 max-h-[80vh] flex flex-col">
                <div className="flex justify-between items-center border-b pb-3">
                  <h3 className="text-sm font-extrabold text-gray-800">
                    📜 Termos de Privacidade e LGPD
                  </h3>
                  <button 
                    onClick={() => setShowTermosModal(false)}
                    className="text-gray-400 hover:text-gray-700 font-bold text-lg px-2"
                  >
                    ✕
                  </button>
                </div>

                <div className="overflow-y-auto text-xs text-gray-600 space-y-3 pr-2 flex-1">
                  <p className="font-bold text-gray-800">1. Coleta de Dados</p>
                  <p>Coletamos seu nome, e-mail e usuário para identificar suas listas de compras no app Tá Quanto?.</p>
                  
                  <p className="font-bold text-gray-800">2. Uso das Listas e Cupons</p>
                  <p>Seus cupons e listas ficam salvos exclusivamente na sua conta do banco de dados.</p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setAceitouLgpd(true);
                    setShowTermosModal(false);
                  }}
                  className="w-full bg-[#0d824d] text-white font-bold py-2.5 rounded-xl text-xs hover:bg-[#0a673d]"
                >
                  Entendi e Aceito os Termos
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const listaSelecionada = (Array.isArray(listas) ? listas : []).find((l: any) => l.id === listaParaCompararId) || listas[0];
  const itensDaListaAtiva = Array.isArray(listaSelecionada?.itens) ? listaSelecionada.itens : [];

  const baseMercados = (Array.isArray(mercadosReais) && mercadosReais.length > 0) ? mercadosReais : [
    { id: 101, nome: 'SUPERMERCADO CARREFOUR', distancia: '1.2 km', fatorPreco: 0.98, tag: 'MERCADO', corTag: 'bg-blue-100 text-blue-800' },
    { id: 102, nome: 'SUPERMERCADO EXTRA', distancia: '2.5 km', fatorPreco: 1.02, tag: 'MERCADO', corTag: 'bg-blue-100 text-blue-800' },
    { id: 103, nome: 'PÃO DE AÇÚCAR', distancia: '3.1 km', fatorPreco: 1.08, tag: 'MERCADO', corTag: 'bg-blue-100 text-blue-800' }
  ];

  const cuponsFormatadosParaMercado = (Array.isArray(historicoCupons) ? historicoCupons : []).map((c: any) => ({
    id: `cupom_${c.id}`,
    idOriginalCupom: c.id,
    nome: renderTexto(c.mercado, 'MERCADO VIA CUPOM'),
    distancia: `Bipado em ${c.data || 'Hoje'} às ${c.hora || ''}`,
    tag: c.tag || 'CUPOM FISCAL',
    corTag: c.corTag || 'bg-purple-100 text-purple-800',
    isCupom: true,
    itensCupom: obterItensCupom(c)
  }));

  const todosMercadosECupons = [...cuponsFormatadosParaMercado, ...baseMercados];

  // FIX: Otimização via useMemo para evitar travamento de interface
  const listaMercadosOrdenados = useMemo(() => {
    return todosMercadosECupons.map((mercado: any) => {
      let totalCalculado = 0;

      const itensDetalhado = itensDaListaAtiva.map((item: any) => {
        let precoUn: number;
        let origemPreco: string;

        if (mercado.isCupom) {
          const precoCupom = buscarPrecoNoCupom(item.nome, mercado.itensCupom);
          if (precoCupom !== null) {
            precoUn = precoCupom;
            origemPreco = 'cupom';
          } else {
            precoUn = Number(item.precoEstimado) || 8.5;
            origemPreco = 'sefaz';
          }
        } else {
          precoUn = (Number(item.precoEstimado) || 8.5) * (mercado.fatorPreco || 1);
          origemPreco = 'sefaz';
        }

        const subtotal = precoUn * (Number(item.qtd) || 1);
        totalCalculado += subtotal;

        return {
          ...item,
          precoUnCalculado: precoUn.toFixed(2),
          subtotalCalculado: subtotal.toFixed(2),
          origemPreco
        };
      });

      return {
        ...mercado,
        totalCalculado: Number(totalCalculado.toFixed(2)),
        itensDetalhado
      };
    }).sort((a: any, b: any) => a.totalCalculado - b.totalCalculado);
  }, [todosMercadosECupons, itensDaListaAtiva]);

  return (
    <div className="min-h-screen bg-[#f4f6f8] pb-24 font-sans">
      <header className="bg-white border-b sticky top-0 z-30 px-4 py-3 shadow-sm">
        <div className="max-w-xl mx-auto flex justify-between items-center">
          <h1 className="text-base font-extrabold text-[#0d824d] flex items-center gap-1.5">
            🛒 TÁ QUANTO?
          </h1>
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
              👤 {usuario.toUpperCase()}
            </span>
            <button onClick={handleLogout} className="text-xs font-bold text-red-500 hover:underline">
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto p-4 space-y-4">
        {activeTab === 'listas' && (
          <div className="space-y-4">
            <div className="bg-white p-3.5 rounded-2xl shadow-sm border border-gray-100 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
                <span className="text-blue-600">➕</span> Nova Lista de Compras
              </div>
              <form onSubmit={criarNovaLista} className="flex gap-2">
                <input
                  type="text"
                  placeholder="EX: MENSAL, CHURRASCO..."
                  value={novaListaNome}
                  onChange={e => setNovaListaNome(e.target.value)}
                  className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-xl text-xs font-semibold text-gray-900 uppercase bg-white"
                  required
                />
                <button type="submit" className="bg-[#1877f2] hover:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0">
                  + Criar
                </button>
              </form>
            </div>

            <div className="space-y-2.5">
              <div className="flex justify-between items-center px-1">
                <h2 className="text-[11px] font-extrabold text-gray-400 tracking-wider uppercase">
                  Suas Listas ({listas.length})
                </h2>
                <button onClick={carregarListasDoBanco} className="text-xs text-blue-600 font-bold hover:underline">
                  🔄 Sincronizar
                </button>
              </div>

              {loadingListas ? (
                <div className="bg-white p-6 rounded-2xl text-center border">
                  <p className="text-xs font-bold text-gray-500">Carregando listas do seu perfil...</p>
                </div>
              ) : listas.length === 0 ? (
                <div className="bg-white p-6 rounded-2xl text-center border space-y-1">
                  <p className="text-xs font-bold text-gray-700">Nenhuma lista criada.</p>
                  <p className="text-[11px] text-gray-400">Crie uma nova lista acima para começar!</p>
                </div>
              ) : (Array.isArray(listas) ? listas : []).map((lista: any) => {
                const estaAberta = !!listasAbertas[lista.id];
                const inputAtual = inputsItens[lista.id] || { nome: '', qtd: 1 };
                const itensLista = Array.isArray(lista.itens) ? lista.itens : [];

                return (
                  <div key={lista.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <div 
                      onClick={() => {
                        setListasAbertas(p => ({ ...p, [lista.id]: !p[lista.id] }));
                        setListaParaCompararId(lista.id);
                      }}
                      className="px-4 py-3 flex justify-between items-center cursor-pointer hover:bg-gray-50 select-none"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-base text-blue-600 font-bold shrink-0">{estaAberta ? '📂' : '📁'}</span>
                        <h3 className="text-xs sm:text-sm font-extrabold text-gray-800 uppercase truncate">{renderTexto(lista.nome)}</h3>
                        <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-full shrink-0">
                          {itensLista.length} {itensLista.length === 1 ? 'item' : 'itens'}
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-gray-500 ml-2">{estaAberta ? '▲' : '▼'}</span>
                    </div>

                    {estaAberta && (
                      <div className="border-t border-gray-100 bg-white">
                        <div className="p-2.5 bg-gray-50/80 border-b flex items-center justify-between gap-2">
                          <button type="button" onClick={() => deletarLista(lista.id)} className="text-red-500 hover:bg-red-50 px-2 py-1 rounded-lg text-xs font-bold">
                            🗑️ Excluir Lista
                          </button>
                        </div>

                        <form onSubmit={(e) => adicionarItem(e, lista.id)} className="p-2.5 bg-gray-50 border-b flex flex-wrap sm:flex-nowrap gap-2 items-center">
                          <input
                            type="text"
                            placeholder="NOME DO ITEM..."
                            value={inputAtual.nome}
                            onChange={e => handleInputItemChange(lista.id, 'nome', e.target.value)}
                            className="flex-1 min-w-[130px] px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold uppercase bg-white text-gray-900"
                            required
                          />
                          <div className="flex gap-2 shrink-0 w-full sm:w-auto">
                            <input
                              type="number"
                              min="1"
                              value={inputAtual.qtd}
                              onChange={e => handleInputItemChange(lista.id, 'qtd', Number(e.target.value))}
                              className="w-16 px-2 py-1.5 border border-gray-300 rounded-lg text-xs text-center font-bold bg-white text-gray-900"
                            />
                            <button type="submit" className="flex-1 sm:flex-none bg-[#1877f2] text-white px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 hover:bg-blue-700 transition-all">
                              + Adicionar
                            </button>
                          </div>
                        </form>

                        <div className="divide-y">
                          {itensLista.map((item: any) => (
                            <div key={item.id} className="px-3.5 py-2.5 flex items-center justify-between hover:bg-gray-50 gap-2">
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <input
                                  type="checkbox"
                                  checked={Boolean(item.marcado)}
                                  onChange={() => toggleCheck(lista.id, item.id)}
                                  className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 cursor-pointer shrink-0"
                                />
                                <div className="min-w-0">
                                  <span className={`text-xs font-bold block truncate ${item.marcado ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                                    {renderTexto(item.nome)}
                                  </span>
                                  {item.marca && (
                                    <span className="text-[10px] text-gray-400 block font-medium">
                                      Marca: {renderTexto(item.marca)}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden bg-white">
                                  <button type="button" onClick={() => alterarQuantidade(lista.id, item.id, -1)} className="px-2 py-0.5 bg-gray-100 text-gray-700 font-extrabold text-xs">-</button>
                                  <span className="w-7 text-center text-xs font-bold">{item.qtd}</span>
                                  <button type="button" onClick={() => alterarQuantidade(lista.id, item.id, 1)} className="px-2 py-0.5 bg-gray-100 text-gray-700 font-extrabold text-xs">+</button>
                                </div>
                                <button type="button" onClick={() => removerItem(lista.id, item.id)} className="text-red-500 text-xs font-bold px-1">✕</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'comparar' && (
          <div className="space-y-4">
            <div className="bg-white p-3.5 rounded-2xl shadow-sm border border-gray-100 space-y-3">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                  Selecione a Lista para Comparar:
                </label>
                <select
                  value={listaParaCompararId || ''}
                  onChange={(e) => setListaParaCompararId(e.target.value)}
                  className="w-full bg-white border border-gray-300 text-gray-800 font-bold text-xs rounded-xl px-3 py-2.5 focus:outline-none"
                >
                  {(Array.isArray(listas) ? listas : []).map((l: any) => (
                    <option key={l.id} value={l.id}>
                      {renderTexto(l.nome)} ({l.itens?.length || 0} itens)
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={buscarMercadosProximos}
                disabled={loadingGeo}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow transition-all"
              >
                <span>📍</span> {loadingGeo ? 'Buscando GPS...' : usandoGeo ? 'GPS Ativado ✓' : 'Buscar Mercados Próximos (GPS)'}
              </button>
            </div>

            {!listaSelecionada || !listaSelecionada.itens || listaSelecionada.itens.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl text-center border space-y-2">
                <span className="text-3xl">📊</span>
                <p className="text-xs font-bold text-gray-700">Sua lista selecionada está vazia.</p>
                <p className="text-[11px] text-gray-400">Adicione itens na aba "Listas" para ver a comparação de preços.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {listaMercadosOrdenados.map((mercado: any, idx: number) => {
                  const estaAbertoDetalhe = mercadoSelecionadoDetalhe === mercado.id;
                  const eOMaisBarato = idx === 0;

                  return (
                    <div 
                      key={mercado.id || idx} 
                      className={`rounded-2xl border transition-all overflow-hidden ${mercado.isCupom ? 'bg-purple-50/60 border-purple-300' : 'bg-white border-gray-200'} ${eOMaisBarato ? 'ring-2 ring-emerald-500 border-emerald-500' : ''}`}
                    >
                      <div className="p-4 flex items-center justify-between gap-3">
                        <div 
                          onClick={() => setMercadoSelecionadoDetalhe(estaAbertoDetalhe ? null : mercado.id)}
                          className="space-y-1 flex-1 cursor-pointer select-none"
                        >
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-black bg-gray-800 text-white px-2 py-0.5 rounded-full">
                              #{idx + 1}º
                            </span>
                            {eOMaisBarato && (
                              <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                                🥇 MENOR PREÇO
                              </span>
                            )}
                            {mercado.tag && (
                              <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${mercado.corTag}`}>
                                {renderTexto(mercado.tag)}
                              </span>
                            )}
                          </div>
                          <h4 className="text-xs sm:text-sm font-extrabold text-gray-800 flex items-center gap-1.5 pt-0.5">
                            {renderTexto(mercado.nome)}
                          </h4>
                          <p className="text-[10px] text-gray-500 font-medium">{renderTexto(mercado.distancia)}</p>
                        </div>

                        <div className="text-right">
                          <span className="text-[9px] text-gray-400 font-bold block uppercase">Total Calculado</span>
                          <span className="text-base font-black text-emerald-600 block">R$ {mercado.totalCalculado.toFixed(2)}</span>
                          <button
                            onClick={() => setMercadoSelecionadoDetalhe(estaAbertoDetalhe ? null : mercado.id)}
                            className="text-[10px] text-emerald-700 font-bold underline mt-0.5"
                          >
                            {estaAbertoDetalhe ? 'Ver Menos' : 'Ver Detalhes'}
                          </button>
                        </div>
                      </div>

                      {estaAbertoDetalhe && (
                        <div className="bg-gray-50 p-3.5 border-t border-gray-100 space-y-2">
                          <h5 className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">
                            Detalhamento de Itens ({renderTexto(mercado.nome)}):
                          </h5>
                          <div className="divide-y divide-gray-200">
                            {mercado.itensDetalhado.map((item: any) => {
                              const marcaExibicao = item.marca || obterMarcaParaItem(item.nome);

                              return (
                                <div key={item.id} className="py-2 flex justify-between items-center text-xs">
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-bold text-gray-800">{renderTexto(item.nome)}</span>
                                      <span className="text-[9px] bg-blue-100 text-blue-800 font-extrabold px-1.5 py-0.5 rounded">
                                        🏷️ {renderTexto(marcaExibicao)}
                                      </span>
                                      {item.origemPreco === 'cupom' ? (
                                        <span className="text-[8px] bg-purple-100 text-purple-800 font-extrabold px-1.5 py-0.5 rounded">
                                          ✓ Preço do Cupom
                                        </span>
                                      ) : (
                                        <span className="text-[8px] bg-gray-200 text-gray-600 font-semibold px-1.5 py-0.5 rounded">
                                          Média SEFAZ
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[10px] text-gray-400 block font-medium mt-0.5">
                                      {item.qtd}x un · R$ {item.precoUnCalculado} cada
                                    </span>
                                  </div>
                                  <span className="font-extrabold text-emerald-700">R$ {item.subtotalCalculado}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'cupons' && (
          <div className="space-y-4">
            <div className="bg-purple-900 text-white p-5 rounded-3xl shadow-lg space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🧾</span>
                <div>
                  <h3 className="text-base font-extrabold">Cupons Fiscais</h3>
                  <p className="text-xs text-purple-200 font-medium">Bipe QR Codes de notas fiscais para atualizar preços no seu app.</p>
                </div>
              </div>

              <button
                onClick={abrirModalQr}
                className="w-full bg-purple-500 hover:bg-purple-400 text-white font-extrabold text-xs py-3 rounded-2xl shadow flex items-center justify-center gap-2 transition-all"
              >
                📷 BIPAR NOVO QR CODE
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <h3 className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">
                  Cupons Salvos ({historicoCupons.length})
                </h3>
                <button onClick={carregarCuponsDoBanco} className="text-xs text-purple-600 font-bold hover:underline">
                  🔄 Atualizar
                </button>
              </div>

              {loadingCupons ? (
                <div className="bg-white p-6 rounded-2xl text-center border">
                  <p className="text-xs font-bold text-gray-500">Buscando cupons salvos...</p>
                </div>
              ) : historicoCupons.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl text-center border space-y-1">
                  <span className="text-3xl">📜</span>
                  <p className="text-xs font-bold text-gray-700">Nenhum cupom bipado até o momento.</p>
                  <p className="text-[11px] text-gray-400">Ao escaneá-los, eles serão salvos diretamente na sua conta!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(Array.isArray(historicoCupons) ? historicoCupons : []).map((cupom: any) => {
                    const estaAberto = !!cuponsAbertos[cupom.id];
                    const itensDoCupom = obterItensCupom(cupom);

                    return (
                      <div 
                        key={cupom.id} 
                        className="bg-white border border-purple-200 rounded-2xl overflow-hidden shadow-sm"
                      >
                        <div className="p-4 flex justify-between items-center gap-3">
                          <div 
                            onClick={() => setCuponsAbertos(p => ({ ...p, [cupom.id]: !p[cupom.id] }))}
                            className="cursor-pointer flex-1 select-none"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-purple-700">{estaAberto ? '📂' : '📁'}</span>
                              <h4 className="text-xs sm:text-sm font-extrabold text-gray-800">{renderTexto(cupom.mercado)}</h4>
                            </div>
                            <p className="text-[10px] text-purple-700 font-medium mt-0.5">
                              📅 {renderTexto(cupom.data, 'Hoje')} às {renderTexto(cupom.hora, '')} · <span className="font-bold underline">{itensDoCupom.length} produtos gravados</span>
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setCuponsAbertos(p => ({ ...p, [cupom.id]: !p[cupom.id] }))}
                              className="text-xs font-bold text-purple-600 bg-purple-50 px-2.5 py-1.5 rounded-xl hover:bg-purple-100"
                            >
                              {estaAberto ? 'Esconder Produtos ▲' : 'Ver Produtos ▼'}
                            </button>
                            <button
                              onClick={() => excluirCupom(cupom.id)}
                              className="text-red-500 hover:bg-red-50 text-xs font-bold p-1.5 rounded-xl"
                              title="Excluir Cupom"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>

                        {estaAberto && (
                          <div className="bg-purple-50/50 p-3.5 border-t border-purple-100 space-y-2">
                            <h5 className="text-[10px] font-extrabold text-purple-900 uppercase tracking-wider flex justify-between">
                              <span>Produtos extraídos da SEFAZ ({itensDoCupom.length}):</span>
                              <span className="text-[9px] text-purple-600 font-normal">Exibição exata do banco</span>
                            </h5>

                            {itensDoCupom.length === 0 ? (
                              <p className="text-xs font-bold text-gray-500 italic p-2 bg-white rounded-xl border border-dashed text-center">
                                Nenhum item foi extraído deste cupom.
                              </p>
                            ) : (
                              <div className="divide-y divide-purple-100 bg-white rounded-xl border border-purple-200 overflow-hidden">
                                {itensDoCupom.map((prod: any, pIdx: number) => {
                                  const nomeProduto = prod.nome || prod.descricao || prod.product || prod.title || prod.dsc || 'SEM NOME';
                                  const precoProduto = prod.preco || prod.precoUnitario || prod.val || prod.valor || 0;
                                  const qtdProduto = prod.qtd || prod.quantidade || prod.qnt || 1;

                                  return (
                                    <div key={pIdx} className="p-2.5 flex justify-between items-center text-xs hover:bg-purple-50/30">
                                      <div className="pr-2 min-w-0">
                                        <span className="font-bold text-gray-800 block truncate uppercase">
                                          {renderTexto(nomeProduto)}
                                        </span>
                                        <span className="text-[10px] text-gray-400 font-medium">
                                          Qtd: {renderTexto(qtdProduto)}
                                        </span>
                                      </div>
                                      <span className="font-black text-emerald-600 shrink-0">
                                        R$ {Number(precoProduto).toFixed(2)}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 px-4 py-2">
        <div className="max-w-md mx-auto flex justify-around items-center">
          <button
            onClick={() => setActiveTab('listas')}
            className={`flex flex-col items-center gap-1 text-xs font-bold transition-all ${
              activeTab === 'listas' ? 'text-[#0d824d]' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <span className="text-lg">📋</span>
            <span>Listas</span>
          </button>

          <button
            onClick={() => setActiveTab('comparar')}
            className={`flex flex-col items-center gap-1 text-xs font-bold transition-all ${
              activeTab === 'comparar' ? 'text-[#0d824d]' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <span className="text-lg">📊</span>
            <span>Comparar</span>
          </button>

          <button
            onClick={() => setActiveTab('cupons')}
            className={`flex flex-col items-center gap-1 text-xs font-bold transition-all ${
              activeTab === 'cupons' ? 'text-[#0d824d]' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <span className="text-lg">🧾</span>
            <span>Cupons</span>
          </button>
        </div>
      </nav>

      {showQrModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-base font-extrabold text-purple-900 flex items-center gap-2">
                <span>📷</span> Escanear QR Code do Cupom
              </h3>
              <button 
                onClick={fecharModalQr}
                className="text-gray-400 hover:text-gray-700 font-bold text-lg px-2"
              >
                ✕
              </button>
            </div>

            <div className="bg-black rounded-2xl overflow-hidden min-h-[220px] flex items-center justify-center relative">
              {cameraError ? (
                <p className="text-xs font-bold text-red-400 p-4 text-center">{cameraError}</p>
              ) : (
                <div id="reader" className="w-full h-full"></div>
              )}
            </div>

            <form onSubmit={processarCupomQrCode} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Nome Fantasia do Estabelecimento:
                </label>
                <input
                  type="text"
                  placeholder="Ex: Mercado do Zé, Carrefour..."
                  value={nomeFantasiaInput}
                  onChange={(e) => setNomeFantasiaInput(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white text-gray-900 font-semibold"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={fecharModalQr}
                  disabled={isSalvandoCupom}
                  className="flex-1 bg-gray-100 text-gray-700 font-bold py-2.5 rounded-xl text-xs hover:bg-gray-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSalvandoCupom}
                  className="flex-1 bg-purple-600 text-white font-bold py-2.5 rounded-xl text-xs hover:bg-purple-700 shadow flex items-center justify-center gap-1"
                >
                  {isSalvandoCupom ? 'Processando...' : 'Salvar Cupom'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  );
}