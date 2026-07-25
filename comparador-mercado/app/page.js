'use client';
import { useState, useEffect, useRef } from 'react';

export default function Home() {
  const [screen, setScreen] = useState('login'); // 'login', 'register', 'dashboard', 'comparison'
  const [isLogged, setIsLogged] = useState(false);

  // Autenticação
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [cpf, setCpf] = useState('');
  const [aceitaLgpd, setAceitaLgpd] = useState(false);

  // Persistence (LocalStorage) & Listas
  const [listas, setListas] = useState([]);
  const [listaAtivaId, setListaAtivaId] = useState(null);
  const [novaListaNome, setNovaListaNome] = useState('');
  const [novoItemNome, setNovoItemNome] = useState('');
  const [novoItemQtd, setNovoItemQtd] = useState(1);

  // Cupons lidos / Histórico
  const [historicoCupons, setHistoricoCupons] = useState([]);

  // Cupom / QR Code / Câmera
  const [showQrModal, setShowQrModal] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [qrUrl, setQrUrl] = useState('');
  const html5QrCodeRef = useRef(null);

  // Comparação & Geolocalização
  const [usandoGeo, setUsandoGeo] = useState(false);
  const [mercadosSelecionados, setMercadosSelecionados] = useState(['ASSAÍ INTERLAGOS', 'FORT ATACADISTA NAÇÕES UNIDAS']);

  // Carregar dados salvos do LocalStorage ao iniciar
  useEffect(() => {
    const listasSalvas = localStorage.getItem('ta_quanto_listas');
    const cuponsSalvos = localStorage.getItem('ta_quanto_cupons');

    if (listasSalvas) {
      const parsed = JSON.parse(listasSalvas);
      setListas(parsed);
      if (parsed.length > 0) setListaAtivaId(parsed[0].id);
    } else {
      // Lista Padrão de Exemplo Inicial
      const inicial = [
        {
          id: 1,
          nome: 'MINHA LISTA PRINCIPAL',
          data: '21/07/2026',
          itens: [
            { id: 1, nome: 'ARROZ', qtd: 1, un: 'UN', marcado: false, precoEstimado: 25.90 },
            { id: 2, nome: 'FEIJÃO', qtd: 1, un: 'UN', marcado: false, precoEstimado: 8.50 },
            { id: 3, nome: 'LEITE', qtd: 2, un: 'UN', marcado: false, precoEstimado: 5.20 },
          ]
        }
      ];
      setListas(inicial);
      setListaAtivaId(1);
    }

    if (cuponsSalvos) {
      setHistoricoCupons(JSON.parse(cuponsSalvos));
    }
  }, []);

  // Salvar automaticamente no LocalStorage quando as listas mudarem
  useEffect(() => {
    if (listas.length > 0) {
      localStorage.setItem('ta_quanto_listas', JSON.stringify(listas));
    }
  }, [listas]);

  // Salvar cupons no LocalStorage
  useEffect(() => {
    if (historicoCupons.length > 0) {
      localStorage.setItem('ta_quanto_cupons', JSON.stringify(historicoCupons));
    }
  }, [historicoCupons]);

  // Controle de ativação/desativação da Câmera
  useEffect(() => {
    let scanner = null;

    if (showQrModal && cameraActive) {
      import('html5-qrcode').then(({ Html5Qrcode }) => {
        scanner = new Html5Qrcode("reader");
        html5QrCodeRef.current = scanner;

        scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decodedText) => {
            setQrUrl(decodedText);
            processarEGuardarCupom(decodedText);
            stopCamera();
          },
          () => {}
        ).catch(err => {
          console.error("Erro ao abrir câmera:", err);
          setCameraActive(false);
        });
      }).catch(err => {
        console.error("Erro ao carregar módulo de QR Code:", err);
      });
    }

    return () => {
      stopCamera();
    };
  }, [showQrModal, cameraActive]);

  const stopCamera = () => {
    if (html5QrCodeRef.current) {
      html5QrCodeRef.current.stop().then(() => {
        html5QrCodeRef.current = null;
        setCameraActive(false);
      }).catch(err => console.error(err));
    }
  };

  const handleCloseModal = () => {
    stopCamera();
    setShowQrModal(false);
  };

  // Processar o Cupom Lido
  const processarEGuardarCupom = (urlOuCodigo) => {
    const novoCupom = {
      id: Date.now(),
      url: urlOuCodigo,
      data: new Date().toLocaleDateString('pt-BR'),
      hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      mercado: 'MERCADO REGIONAL (CUPOM BIPADO)',
      totalItens: Math.floor(Math.random() * 5) + 3
    };

    setHistoricoCupons([novoCupom, ...historicoCupons]);
    alert(`Cupom lido com sucesso e adicionado ao seu histórico!`);
    handleCloseModal();
    setQrUrl('');
  };

  // Funções de Autenticação
  const handleLogin = (e) => {
    e.preventDefault();
    setIsLogged(true);
    setScreen('dashboard');
  };

  const handleRegister = (e) => {
    e.preventDefault();
    if (!aceitaLgpd) {
      alert('Você precisa aceitar os Termos de Privacidade (LGPD) para prosseguir com o cadastro.');
      return;
    }
    alert('Cadastro realizado com sucesso! Faça login.');
    setScreen('login');
  };

  // Gestão de Listas
  const criarNovaLista = (e) => {
    e.preventDefault();
    if (!novaListaNome.trim()) return;

    const nova = {
      id: Date.now(),
      nome: novaListaNome.toUpperCase(),
      data: new Date().toLocaleDateString('pt-BR'),
      itens: []
    };

    const atualizadas = [...listas, nova];
    setListas(atualizadas);
    setListaAtivaId(nova.id);
    setNovaListaNome('');
  };

  const adicionarItem = (e) => {
    e.preventDefault();
    if (!novoItemNome.trim()) return;

    setListas(listas.map(l => {
      if (l.id === listaAtivaId) {
        return {
          ...l,
          itens: [
            ...l.itens,
            {
              id: Date.now(),
              nome: novoItemNome.toUpperCase(),
              qtd: novoItemQtd,
              un: 'UN',
              marcado: false,
              precoEstimado: (Math.random() * 15 + 3).toFixed(2)
            }
          ]
        };
      }
      return l;
    }));

    setNovoItemNome('');
    setNovoItemQtd(1);
  };

  const removerItem = (listaId, itemId) => {
    setListas(listas.map(l => {
      if (l.id === listaId) {
        return { ...l, itens: l.itens.filter(i => i.id !== itemId) };
      }
      return l;
    }));
  };

  const toggleCheck = (listaId, itemId) => {
    setListas(listas.map(l => {
      if (l.id === listaId) {
        return {
          ...l,
          itens: l.itens.map(i => i.id === itemId ? { ...i, marcado: !i.marcado } : i)
        };
      }
      return l;
    }));
  };

  const deletarLista = (id) => {
    if (listas.length <= 1) {
      alert('Você precisa ter pelo menos uma lista ativa.');
      return;
    }
    const filtradas = listas.filter(l => l.id !== id);
    setListas(filtradas);
    setListaAtivaId(filtradas[0].id);
  };

  // Geolocalização
  const obterLocalizacao = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => {
          setUsandoGeo(true);
          alert(`Localização obtida! Buscando mercados próximos no raio de 5km.`);
        },
        () => alert('Não foi possível obter sua localização.')
      );
    } else {
      alert('Seu navegador não suporta geolocalização.');
    }
  };

  const listaAtual = listas.find(l => l.id === listaAtivaId) || listas[0] || { nome: '', itens: [] };

  // Cálculo de Preços dos Mercados para Comparação
  const calcularTotalMercado = (fatorMultiplicador) => {
    if (!listaAtual || !listaAtual.itens) return '0.00';
    const total = listaAtual.itens.reduce((acc, item) => {
      const precoBase = Number(item.precoEstimado) || 10;
      return acc + (precoBase * item.qtd * fatorMultiplicador);
    }, 0);
    return total.toFixed(2);
  };

  // -------------------------------------------------------------
  // TELA DE LOGIN
  // -------------------------------------------------------------
  if (screen === 'login' && !isLogged) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0066a1] p-4 font-sans">
        <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-extrabold text-[#0d824d] flex items-center justify-center gap-2">
              <span className="text-3xl">🛒</span> TÁ QUANTO?
            </h1>
            <p className="text-gray-600 text-sm font-medium">Faça login para gerenciar suas economias</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Nome de Usuário</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">👤</span>
                <input
                  type="text"
                  placeholder="Digite seu usuário"
                  value={usuario}
                  onChange={e => setUsuario(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:border-[#0d824d]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Senha</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">🔒</span>
                <input
                  type="password"
                  placeholder="Digite sua senha"
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:border-[#0d824d]"
                  required
                />
              </div>
            </div>

            <button type="submit" className="w-full bg-[#0d824d] hover:bg-[#0a673d] text-white py-3 rounded-full font-bold text-sm transition-colors shadow-md">
              Entrar
            </button>
          </form>

          <p className="text-center text-xs text-gray-600">
            Não tem uma conta?{' '}
            <button onClick={() => setScreen('register')} className="text-[#0066a1] font-bold hover:underline">
              Cadastre-se
            </button>
          </p>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // TELA DE CADASTRO COM LGPD
  // -------------------------------------------------------------
  if (screen === 'register' && !isLogged) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0066a1] p-4 font-sans">
        <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-[#0066a1] flex items-center justify-center gap-2">
              <span className="text-2xl">👤⁺</span> Criar Conta
            </h1>
            <p className="text-gray-500 text-xs">Preencha seus dados para começar a poupar</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Nome Completo</label>
              <input
                type="text"
                placeholder="Ex: JOÃO DA SILVA"
                value={nomeCompleto}
                onChange={e => setNomeCompleto(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:border-[#0066a1]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">CPF (Apenas números)</label>
              <input
                type="text"
                placeholder="Ex: 12345678901"
                value={cpf}
                onChange={e => setCpf(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:border-[#0066a1]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Nome de Usuário</label>
              <input
                type="text"
                placeholder="Ex: jsilva"
                value={usuario}
                onChange={e => setUsuario(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:border-[#0066a1]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Senha</label>
              <input
                type="password"
                placeholder="Crie uma senha forte"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:border-[#0066a1]"
                required
              />
            </div>

            <div className="flex items-start gap-2 pt-2">
              <input
                type="checkbox"
                id="lgpd"
                checked={aceitaLgpd}
                onChange={e => setAceitaLgpd(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-[#0066a1] focus:ring-[#0066a1]"
                required
              />
              <label htmlFor="lgpd" className="text-xs text-gray-600 leading-tight">
                Li e concordo com os <span className="text-[#0066a1] font-bold underline cursor-pointer">Termos de Uso</span> e a Política de Privacidade (LGPD).
              </label>
            </div>

            <button type="submit" className="w-full bg-[#1877f2] hover:bg-[#1162cd] text-white py-3 rounded-full font-bold text-sm transition-colors shadow-md mt-4">
              Concluir Cadastro
            </button>
          </form>

          <p className="text-center text-xs text-gray-600">
            <button onClick={() => setScreen('login')} className="text-gray-500 hover:underline">
              ← Voltar para o Login
            </button>
          </p>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // TELA DE COMPARAÇÃO DE PREÇOS
  // -------------------------------------------------------------
  if (screen === 'comparison') {
    const totalAssai = calcularTotalMercado(0.92); // 8% mais barato em média
    const totalFort = calcularTotalMercado(1.0);

    return (
      <div className="min-h-screen bg-[#f4f6f8] p-4 sm:p-6 font-sans">
        <div className="max-w-5xl mx-auto space-y-6">
          <header className="flex justify-between items-center">
            <div>
              <span className="text-xs font-bold text-gray-400 tracking-wider uppercase">Análise de Economia</span>
              <h1 className="text-xl sm:text-2xl font-black text-gray-800">{listaAtual.nome}</h1>
            </div>
            <button onClick={() => setScreen('dashboard')} className="text-xs sm:text-sm font-bold text-[#0066a1] hover:underline">
              ← Voltar para Minha Lista
            </button>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-semibold">Produtos na Lista</p>
                <p className="text-2xl font-black text-gray-800">{listaAtual.itens?.length || 0}</p>
              </div>
              <span className="text-3xl">🧺</span>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-semibold">Cupons Bipados/Histórico</p>
                <p className="text-2xl font-black text-gray-800">{historicoCupons.length}</p>
              </div>
              <span className="text-3xl">🧾</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border-2 border-blue-500 space-y-4">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
              <div>
                <h2 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                  <span className="text-red-500">📍</span> Mercados da Região
                </h2>
                <p className="text-xs text-gray-500">Compara os preços da sua lista nos estabelecimentos</p>
              </div>

              <button
                onClick={obterLocalizacao}
                className="border-2 border-blue-500 text-blue-600 font-bold px-4 py-2 rounded-full text-xs hover:bg-blue-50 transition-colors flex items-center gap-2 self-start md:self-auto"
              >
                <span>🌐</span> {usandoGeo ? 'Localização Ativada' : 'Usar Minha Localização'}
              </button>
            </div>
          </div>

          {/* Comparativo Ativo de Valores */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-emerald-50 border-2 border-emerald-500 p-5 rounded-2xl space-y-2 relative">
              <span className="absolute top-3 right-3 bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                🏆 Mais Barato
              </span>
              <h3 className="font-extrabold text-emerald-900 text-base">ASSAÍ ATACADISTA</h3>
              <p className="text-xs text-emerald-700">Estimativa para toda a sua lista:</p>
              <p className="text-3xl font-black text-emerald-600">R$ {totalAssai}</p>
            </div>

            <div className="bg-white border p-5 rounded-2xl space-y-2">
              <h3 className="font-extrabold text-gray-800 text-base">FORT ATACADISTA</h3>
              <p className="text-xs text-gray-500">Estimativa para toda a sua lista:</p>
              <p className="text-3xl font-black text-gray-700">R$ {totalFort}</p>
            </div>
          </div>

          {/* Histórico de Cupons Bipados */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <span>🧾</span> Histórico de Cupons Bipados ({historicoCupons.length})
            </h3>

            {historicoCupons.length === 0 ? (
              <p className="text-xs text-gray-400 italic">Nenhum cupom bipado ainda. Use o botão "Bipar Cupom" para salvar seus cupons fiscais aqui.</p>
            ) : (
              <div className="space-y-2 divide-y">
                {historicoCupons.map((cupom) => (
                  <div key={cupom.id} className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
                    <div>
                      <p className="font-bold text-gray-800">{cupom.mercado}</p>
                      <p className="text-[10px] text-gray-400">Lido em {cupom.data} às {cupom.hora}</p>
                    </div>
                    <span className="text-blue-600 font-mono text-[11px] truncate max-w-xs">{cupom.url}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // TELA DE DASHBOARD / LISTAS PRINCIPAIS
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#f4f6f8] p-4 sm:p-6 font-sans">
      <div className="max-w-4xl mx-auto space-y-5">

        {/* Header */}
        <header className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border">
          <h1 className="text-lg sm:text-xl font-extrabold text-[#0d824d] flex items-center gap-2">
            🛒 TÁ QUANTO?
          </h1>
          <button onClick={() => { setIsLogged(false); setScreen('login'); }} className="text-xs font-bold text-red-500 hover:underline">
            Sair
          </button>
        </header>

        {/* Seção Criar Nova Lista */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
            <span className="text-blue-600">➕</span> Criar Nova Lista de Compras
          </div>
          <form onSubmit={criarNovaLista} className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="EX: CHURRASCO, SE MANA, LIMPEZA..."
              value={novaListaNome}
              onChange={e => setNovaListaNome(e.target.value)}
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-xs font-semibold text-gray-900 placeholder-gray-400 uppercase bg-white focus:outline-none focus:border-blue-500"
              required
            />
            <button type="submit" className="bg-[#1877f2] hover:bg-[#1162cd] text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-colors">
              + Criar Lista
            </button>
          </form>

          {/* Selecionar Lista Ativa */}
          {listas.length > 1 && (
            <div className="flex items-center gap-2 pt-2 border-t overflow-x-auto">
              <span className="text-[11px] font-bold text-gray-400 uppercase whitespace-nowrap">Suas Listas:</span>
              {listas.map(l => (
                <button
                  key={l.id}
                  onClick={() => setListaAtivaId(l.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                    l.id === listaAtivaId ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {l.nome}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Card Principal da Lista */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 sm:p-6 border-b flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div>
              <h2 className="text-base sm:text-lg font-black text-gray-800">{listaAtual.nome}</h2>
              <p className="text-[11px] text-gray-400">Criada em: {listaAtual.data}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setScreen('comparison')}
                className="flex-1 sm:flex-none bg-[#0d824d] hover:bg-[#0a673d] text-white text-xs font-bold px-3.5 py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-sm"
              >
                📊 Comparar
              </button>

              <button
                onClick={() => setShowQrModal(true)}
                className="flex-1 sm:flex-none border border-blue-500 text-blue-600 hover:bg-blue-50 text-xs font-bold px-3.5 py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1.5"
              >
                📱 Bipar Cupom
              </button>

              <button
                onClick={() => deletarLista(listaAtual.id)}
                className="border border-red-200 text-red-500 hover:bg-red-50 p-2.5 rounded-xl transition-colors text-xs"
                title="Excluir Lista"
              >
                🗑️
              </button>
            </div>
          </div>

          {/* Form Inserir Item com Responsividade Mobile Perfeita */}
          <form onSubmit={adicionarItem} className="p-3 sm:p-4 bg-gray-50 border-b flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="NOME DO ITEM (EX: ARROZ)..."
              value={novoItemNome}
              onChange={e => setNovoItemNome(e.target.value)}
              className="flex-1 px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs font-semibold text-gray-900 placeholder-gray-400 uppercase bg-white focus:outline-none focus:border-blue-500"
              required
            />
            <div className="flex gap-2">
              <input
                type="number"
                min="1"
                value={novoItemQtd}
                onChange={e => setNovoItemQtd(Number(e.target.value))}
                className="w-20 px-3 py-2.5 border border-gray-300 rounded-xl text-xs text-center font-bold text-gray-900 bg-white focus:outline-none"
              />
              <button type="submit" className="flex-1 sm:flex-none bg-[#1877f2] hover:bg-[#1162cd] text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap">
                + Adicionar
              </button>
            </div>
          </form>

          {/* Listagem dos Itens */}
          <div className="divide-y">
            {(!listaAtual.itens || listaAtual.itens.length === 0) ? (
              <div className="p-8 text-center text-xs text-gray-400">
                Sua lista está vazia. Adicione um item no campo acima!
              </div>
            ) : (
              listaAtual.itens.map(item => (
                <div key={item.id} className="p-3.5 sm:p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={item.marcado}
                      onChange={() => toggleCheck(listaAtual.id, item.id)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-0 cursor-pointer"
                    />
                    <span className={`text-xs font-bold ${item.marcado ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                      {item.nome}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded-md">
                      {item.qtd} UN
                    </span>
                    <button onClick={() => removerItem(listaAtual.id, item.id)} className="text-red-500 text-xs font-bold hover:underline px-1">
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Modal Bipar QR Code */}
        {showQrModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-5 sm:p-6 w-full max-w-md space-y-4 shadow-2xl">
              <div className="flex justify-between items-center border-b pb-2">
                <h3 className="text-sm sm:text-base font-bold text-gray-800 flex items-center gap-2">
                  📱 Bipar QR Code do Cupom
                </h3>
                <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
              </div>

              <div className="space-y-3">
                {!cameraActive ? (
                  <button
                    onClick={() => setCameraActive(true)}
                    className="w-full bg-[#1877f2] hover:bg-[#1162cd] text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm"
                  >
                    📷 Abrir Câmera do Celular
                  </button>
                ) : (
                  <div className="space-y-2">
                    <div id="reader" className="w-full overflow-hidden rounded-xl border-2 border-blue-500 bg-black"></div>
                    <button
                      onClick={stopCamera}
                      className="w-full bg-red-100 text-red-600 font-bold py-2 rounded-xl text-xs"
                    >
                      🛑 Fechar Câmera
                    </button>
                  </div>
                )}

                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-gray-200"></div>
                  <span className="flex-shrink mx-2 text-gray-400 text-[10px] font-bold uppercase">ou digite/cole a URL</span>
                  <div className="flex-grow border-t border-gray-200"></div>
                </div>

                <input
                  type="url"
                  placeholder="https://www.sefaz.gov.br/..."
                  value={qrUrl}
                  onChange={e => setQrUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button onClick={handleCloseModal} className="px-4 py-2 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-100">
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (!qrUrl) return alert('Por favor, leia o QR Code ou cole a URL.');
                    processarEGuardarCupom(qrUrl);
                  }}
                  className="bg-[#0d824d] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#0a673d]"
                >
                  Importar Cupom
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}