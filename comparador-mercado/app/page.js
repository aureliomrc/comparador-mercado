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
  const [listasAbertas, setListasAbertas] = useState({});
  const [novaListaNome, setNovaListaNome] = useState('');
  
  // Inputs de novos itens vinculados a cada lista
  const [inputsItens, setInputsItens] = useState({});

  // Lista selecionada para comparar
  const [listaParaCompararId, setListaParaCompararId] = useState(null);

  // Cupons lidos / Histórico
  const [historicoCupons, setHistoricoCupons] = useState([]);

  // Cupom / QR Code / Câmera
  const [showQrModal, setShowQrModal] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [qrUrl, setQrUrl] = useState('');
  const html5QrCodeRef = useRef(null);

  // Modal para digitar o Nome Fantasia do Mercado lido no Cupom
  const [showNomeFantasiaModal, setShowNomeFantasiaModal] = useState(false);
  const [nomeFantasiaInput, setNomeFantasiaInput] = useState('');
  const [cupomPendente, setCupomPendente] = useState(null);

  // Comparação & Geolocalização
  const [usandoGeo, setUsandoGeo] = useState(false);
  const [mercadoExpandido, setMercadoExpandido] = useState(null);

  // Carregar dados salvos do LocalStorage
  useEffect(() => {
    const listasSalvas = localStorage.getItem('ta_quanto_listas');
    const cuponsSalvos = localStorage.getItem('ta_quanto_cupons');

    if (listasSalvas) {
      const parsed = JSON.parse(listasSalvas);
      setListas(parsed);
      if (parsed.length > 0) {
        setListasAbertas({ [parsed[0].id]: true });
        setListaParaCompararId(parsed[0].id);
      }
    } else {
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
      setListasAbertas({ 1: true });
      setListaParaCompararId(1);
    }

    if (cuponsSalvos) {
      setHistoricoCupons(JSON.parse(cuponsSalvos));
    }
  }, []);

  // Salvar automaticamente no LocalStorage
  useEffect(() => {
    if (listas.length > 0) {
      localStorage.setItem('ta_quanto_listas', JSON.stringify(listas));
    }
  }, [listas]);

  useEffect(() => {
    if (historicoCupons.length > 0) {
      localStorage.setItem('ta_quanto_cupons', JSON.stringify(historicoCupons));
    }
  }, [historicoCupons]);

  // Controle da Câmera
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
            stopCamera();
            prepararCupomParaNome(decodedText);
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
    setQrUrl('');
  };

  // Etapa 1: Prepara o cupom lido e solicita o Nome Fantasia
  const prepararCupomParaNome = (urlOuCodigo) => {
    setCupomPendente({
      id: Date.now(),
      url: urlOuCodigo,
      data: new Date().toLocaleDateString('pt-BR'),
      hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    });
    setNomeFantasiaInput('');
    setShowQrModal(false);
    setShowNomeFantasiaModal(true);
  };

  // Etapa 2: Salva o cupom com o Nome Fantasia digitado pelo usuário
  const salvarCupomComNomeFantasia = (e) => {
    e.preventDefault();
    if (!cupomPendente) return;

    const nomeFinal = nomeFantasiaInput.trim() ? nomeFantasiaInput.toUpperCase() : 'MERCADO NÃO IDENTIFICADO';

    const novoCupom = {
      ...cupomPendente,
      mercado: nomeFinal,
      totalItens: Math.floor(Math.random() * 5) + 3
    };

    setHistoricoCupons([novoCupom, ...historicoCupons]);
    setShowNomeFantasiaModal(false);
    setCupomPendente(null);
    setNomeFantasiaInput('');
    alert(`Cupom salvo com sucesso para o estabelecimento "${nomeFinal}"!`);
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
      alert('Você precisa aceitar os Termos de Privacidade (LGPD) para prosseguir.');
      return;
    }
    alert('Cadastro realizado com sucesso! Faça login.');
    setScreen('login');
  };

  // Alternar expansão de listas
  const toggleListaAberta = (listaId) => {
    setListasAbertas(prev => ({ ...prev, [listaId]: !prev[listaId] }));
  };

  // Gestão de Listas
  const criarNovaLista = (e) => {
    e.preventDefault();
    if (!novaListaNome.trim()) return;

    const novaId = Date.now();
    const nova = {
      id: novaId,
      nome: novaListaNome.toUpperCase(),
      data: new Date().toLocaleDateString('pt-BR'),
      itens: []
    };

    setListas([nova, ...listas]);
    setListasAbertas(prev => ({ ...prev, [novaId]: true }));
    setNovaListaNome('');
  };

  const handleInputItemChange = (listaId, campo, valor) => {
    setInputsItens(prev => ({
      ...prev,
      [listaId]: {
        nome: campo === 'nome' ? valor : prev[listaId]?.nome || '',
        qtd: campo === 'qtd' ? valor : prev[listaId]?.qtd || 1
      }
    }));
  };

  const adicionarItem = (e, listaId) => {
    e.preventDefault();
    const input = inputsItens[listaId];
    if (!input || !input.nome || !input.nome.trim()) return;

    setListas(listas.map(l => {
      if (l.id === listaId) {
        return {
          ...l,
          itens: [
            ...l.itens,
            {
              id: Date.now(),
              nome: input.nome.toUpperCase(),
              qtd: input.qtd || 1,
              un: 'UN',
              marcado: false,
              precoEstimado: (Math.random() * 15 + 3).toFixed(2)
            }
          ]
        };
      }
      return l;
    }));

    setInputsItens(prev => ({ ...prev, [listaId]: { nome: '', qtd: 1 } }));
  };

  const removerItem = (listaId, itemId) => {
    setListas(listas.map(l => l.id === listaId ? { ...l, itens: l.itens.filter(i => i.id !== itemId) } : l));
  };

  const toggleCheck = (listaId, itemId) => {
    setListas(listas.map(l => l.id === listaId ? { ...l, itens: l.itens.map(i => i.id === itemId ? { ...i, marcado: !i.marcado } : i) } : l));
  };

  const deletarLista = (id) => {
    if (listas.length <= 1) return alert('Você precisa ter pelo menos uma lista ativa.');
    setListas(listas.filter(l => l.id !== id));
  };

  const abrirComparacao = (listaId) => {
    setListaParaCompararId(listaId);
    setScreen('comparison');
  };

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

  const listaAtualComparacao = listas.find(l => l.id === listaParaCompararId) || listas[0] || { nome: '', itens: [] };

  const calcularTotalMercado = (fatorMultiplicador) => {
    if (!listaAtualComparacao || !listaAtualComparacao.itens) return '0.00';
    return listaAtualComparacao.itens.reduce((acc, item) => {
      const precoBase = Number(item.precoEstimado) || 10;
      return acc + (precoBase * item.qtd * fatorMultiplicador);
    }, 0).toFixed(2);
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
              <input
                type="text"
                placeholder="Digite seu usuário"
                value={usuario}
                onChange={e => setUsuario(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:border-[#0d824d]"
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
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:border-[#0d824d]"
                required
              />
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
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Nome Completo</label>
              <input
                type="text"
                placeholder="Ex: JOÃO DA SILVA"
                value={nomeCompleto}
                onChange={e => setNomeCompleto(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">CPF</label>
              <input
                type="text"
                placeholder="Ex: 12345678901"
                value={cpf}
                onChange={e => setCpf(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Senha</label>
              <input
                type="password"
                placeholder="Crie uma senha"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white"
                required
              />
            </div>

            <div className="flex items-start gap-2 pt-2">
              <input
                type="checkbox"
                id="lgpd"
                checked={aceitaLgpd}
                onChange={e => setAceitaLgpd(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-[#0066a1]"
                required
              />
              <label htmlFor="lgpd" className="text-xs text-gray-600 leading-tight">
                Li e concordo com os Termos de Uso e LGPD.
              </label>
            </div>

            <button type="submit" className="w-full bg-[#1877f2] text-white py-3 rounded-full font-bold text-sm mt-4">
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
    const totalAssai = calcularTotalMercado(0.92);
    const totalFort = calcularTotalMercado(1.0);

    return (
      <div className="min-h-screen bg-[#f4f6f8] p-4 sm:p-6 font-sans">
        <div className="max-w-5xl mx-auto space-y-6">
          <header className="flex justify-between items-center">
            <div>
              <span className="text-xs font-bold text-gray-400 tracking-wider uppercase">Análise de Economia</span>
              <h1 className="text-xl sm:text-2xl font-black text-gray-800">{listaAtualComparacao.nome}</h1>
            </div>
            <button onClick={() => setScreen('dashboard')} className="text-xs sm:text-sm font-bold text-[#0066a1] hover:underline">
              ← Voltar para Minhas Listas
            </button>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-semibold">Produtos nesta Lista</p>
                <p className="text-2xl font-black text-gray-800">{listaAtualComparacao.itens?.length || 0}</p>
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
                <p className="text-xs text-gray-500">Clique no card do mercado para ver a cascata dos itens comparados</p>
              </div>

              <button
                onClick={obterLocalizacao}
                className="border-2 border-blue-500 text-blue-600 font-bold px-4 py-2 rounded-full text-xs hover:bg-blue-50 transition-colors flex items-center gap-2"
              >
                <span>🌐</span> {usandoGeo ? 'Localização Ativada' : 'Usar Minha Localização'}
              </button>
            </div>
          </div>

          {/* Cards dos Mercados com Cascata */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-emerald-50 border-2 border-emerald-500 rounded-2xl overflow-hidden shadow-sm">
              <div 
                onClick={() => setMercadoExpandido(mercadoExpandido === 'assai' ? null : 'assai')}
                className="p-5 cursor-pointer relative hover:bg-emerald-100/50 transition-colors"
              >
                <span className="absolute top-3 right-3 bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                  🏆 Mais Barato
                </span>
                <h3 className="font-extrabold text-emerald-900 text-base">ASSAÍ ATACADISTA</h3>
                <p className="text-xs text-emerald-700">Estimativa total da lista:</p>
                <div className="flex justify-between items-end mt-1">
                  <p className="text-3xl font-black text-emerald-600">R$ {totalAssai}</p>
                  <span className="text-xs font-bold text-emerald-800">
                    {mercadoExpandido === 'assai' ? 'Recolher Cascata ▲' : 'Ver Itens em Cascata ▼'}
                  </span>
                </div>
              </div>

              {mercadoExpandido === 'assai' && (
                <div className="bg-white border-t border-emerald-200 p-4 space-y-2 divide-y">
                  <p className="text-[11px] font-extrabold text-emerald-800 uppercase tracking-wider mb-2">Detalhamento dos Preços:</p>
                  {listaAtualComparacao.itens.map(item => {
                    const precoUnit = ((Number(item.precoEstimado) || 10) * 0.92).toFixed(2);
                    const subtotal = (precoUnit * item.qtd).toFixed(2);
                    return (
                      <div key={item.id} className="pt-2 flex justify-between items-center text-xs">
                        <div>
                          <p className="font-bold text-gray-800">{item.nome}</p>
                          <p className="text-[10px] text-gray-400">{item.qtd} UN x R$ {precoUnit}</p>
                        </div>
                        <span className="font-bold text-emerald-700">R$ {subtotal}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-white border-2 border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <div 
                onClick={() => setMercadoExpandido(mercadoExpandido === 'fort' ? null : 'fort')}
                className="p-5 cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <h3 className="font-extrabold text-gray-800 text-base">FORT ATACADISTA</h3>
                <p className="text-xs text-gray-500">Estimativa total da lista:</p>
                <div className="flex justify-between items-end mt-1">
                  <p className="text-3xl font-black text-gray-700">R$ {totalFort}</p>
                  <span className="text-xs font-bold text-gray-500">
                    {mercadoExpandido === 'fort' ? 'Recolher Cascata ▲' : 'Ver Itens em Cascata ▼'}
                  </span>
                </div>
              </div>

              {mercadoExpandido === 'fort' && (
                <div className="bg-gray-50 border-t p-4 space-y-2 divide-y">
                  <p className="text-[11px] font-extrabold text-gray-600 uppercase tracking-wider mb-2">Detalhamento dos Preços:</p>
                  {listaAtualComparacao.itens.map(item => {
                    const precoUnit = (Number(item.precoEstimado) || 10).toFixed(2);
                    const subtotal = (precoUnit * item.qtd).toFixed(2);
                    return (
                      <div key={item.id} className="pt-2 flex justify-between items-center text-xs">
                        <div>
                          <p className="font-bold text-gray-800">{item.nome}</p>
                          <p className="text-[10px] text-gray-400">{item.qtd} UN x R$ {precoUnit}</p>
                        </div>
                        <span className="font-bold text-gray-700">R$ {subtotal}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Histórico de Cupons Bipados */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <span>🧾</span> Histórico de Cupons Bipados ({historicoCupons.length})
            </h3>

            {historicoCupons.length === 0 ? (
              <p className="text-xs text-gray-400 italic">Nenhum cupom bipado ainda.</p>
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
  // TELA DE DASHBOARD / LISTAS EMPILHADAS
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
              placeholder="EX: CHURRASCO, SEMANA, LIMPEZA..."
              value={novaListaNome}
              onChange={e => setNovaListaNome(e.target.value)}
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-xs font-semibold text-gray-900 placeholder-gray-400 uppercase bg-white focus:outline-none focus:border-blue-500"
              required
            />
            <button type="submit" className="bg-[#1877f2] hover:bg-[#1162cd] text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-colors">
              + Criar Lista
            </button>
          </form>
        </div>

        {/* LISTAGEM EMPILHADA */}
        <div className="space-y-4">
          <h2 className="text-xs font-extrabold text-gray-400 tracking-wider uppercase px-1">
            Suas Listas ({listas.length})
          </h2>

          {listas.map((lista) => {
            const estaAberta = !!listasAbertas[lista.id];
            const inputAtual = inputsItens[lista.id] || { nome: '', qtd: 1 };

            return (
              <div key={lista.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                
                <div 
                  onClick={() => toggleListaAberta(lista.id)}
                  className="p-4 sm:p-5 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors select-none"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg text-blue-600 font-bold">
                      {estaAberta ? '📂' : '📁'}
                    </span>
                    <div>
                      <h3 className="text-sm sm:text-base font-extrabold text-gray-800">{lista.nome}</h3>
                      <p className="text-[11px] text-gray-400">{lista.itens.length} itens • Criada em {lista.data}</p>
                    </div>
                  </div>

                  <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg">
                    {estaAberta ? 'Recolher ▲' : 'Abrir Itens ▼'}
                  </span>
                </div>

                {estaAberta && (
                  <div className="border-t border-gray-100 bg-white">
                    <div className="p-3 bg-gray-50/80 border-b flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                        <button
                          onClick={() => abrirComparacao(lista.id)}
                          className="flex-1 sm:flex-none bg-[#0d824d] hover:bg-[#0a673d] text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors shadow-sm"
                        >
                          📊 Comparar Lista
                        </button>

                        <button
                          onClick={() => setShowQrModal(true)}
                          className="flex-1 sm:flex-none border border-blue-500 text-blue-600 hover:bg-blue-50 text-xs font-bold px-3 py-2 rounded-xl transition-colors"
                        >
                          📱 Bipar Cupom
                        </button>
                      </div>

                      <button
                        onClick={() => deletarLista(lista.id)}
                        className="text-red-500 hover:bg-red-50 p-2 rounded-xl transition-colors text-xs font-bold"
                      >
                        🗑️ Excluir Lista
                      </button>
                    </div>

                    <form onSubmit={(e) => adicionarItem(e, lista.id)} className="p-3 sm:p-4 bg-gray-50 border-b flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        placeholder="NOME DO ITEM (EX: LEITE)..."
                        value={inputAtual.nome}
                        onChange={e => handleInputItemChange(lista.id, 'nome', e.target.value)}
                        className="flex-1 px-3.5 py-2 border border-gray-300 rounded-xl text-xs font-semibold text-gray-900 placeholder-gray-400 uppercase bg-white"
                        required
                      />
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="1"
                          value={inputAtual.qtd}
                          onChange={e => handleInputItemChange(lista.id, 'qtd', Number(e.target.value))}
                          className="w-20 px-3 py-2 border border-gray-300 rounded-xl text-xs text-center font-bold text-gray-900 bg-white"
                        />
                        <button type="submit" className="bg-[#1877f2] text-white px-4 py-2 rounded-xl text-xs font-bold">
                          + Adicionar
                        </button>
                      </div>
                    </form>

                    <div className="divide-y">
                      {(!lista.itens || lista.itens.length === 0) ? (
                        <div className="p-6 text-center text-xs text-gray-400 italic">
                          Esta lista está vazia. Adicione um item no campo acima!
                        </div>
                      ) : (
                        lista.itens.map(item => (
                          <div key={item.id} className="p-3.5 flex items-center justify-between hover:bg-gray-50">
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={item.marcado}
                                onChange={() => toggleCheck(lista.id, item.id)}
                                className="h-4 w-4 rounded border-gray-300 text-blue-600"
                              />
                              <span className={`text-xs font-bold ${item.marcado ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                                {item.nome}
                              </span>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className="text-xs font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md">
                                {item.qtd} UN
                              </span>
                              <button onClick={() => removerItem(lista.id, item.id)} className="text-red-500 text-xs font-bold px-1">
                                ✕
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* MODAL 1: BIPAR OU COLAR QR CODE */}
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
                    className="w-full bg-[#1877f2] text-white font-bold py-3 rounded-xl text-xs shadow-sm"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs text-gray-900 bg-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button onClick={handleCloseModal} className="px-4 py-2 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-100">
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (!qrUrl) return alert('Por favor, leia o QR Code ou cole a URL.');
                    prepararCupomParaNome(qrUrl);
                  }}
                  className="bg-[#0d824d] text-white px-4 py-2 rounded-xl text-xs font-bold"
                >
                  Continuar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 2: EDITAR NOME FANTASIA DO ESTABELECIMENTO */}
        {showNomeFantasiaModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-5 sm:p-6 w-full max-w-md space-y-4 shadow-2xl">
              <div className="border-b pb-2">
                <h3 className="text-sm sm:text-base font-extrabold text-gray-800 flex items-center gap-2">
                  🏪 Nome do Estabelecimento
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Digite o Nome Fantasia do local para salvar no seu histórico.
                </p>
              </div>

              <form onSubmit={salvarCupomComNomeFantasia} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Nome Fantasia / Apelido do Mercado
                  </label>
                  <input
                    type="text"
                    placeholder="EX: CARREFOUR ANCHIETA, EXTRA ITaim..."
                    value={nomeFantasiaInput}
                    onChange={e => setNomeFantasiaInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs font-semibold text-gray-900 placeholder-gray-400 uppercase bg-white focus:outline-none focus:border-blue-500"
                    autoFocus
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setShowNomeFantasiaModal(false);
                      setCupomPendente(null);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-100"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-[#0d824d] hover:bg-[#0a673d] text-white px-5 py-2 rounded-xl text-xs font-bold transition-colors"
                  >
                    💾 Salvar Cupom
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}