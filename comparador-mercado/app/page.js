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

  // Persistence (LocalStorage por Usuário)
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

  // Comparação, Geolocalização e Mercados Reais
  const [usandoGeo, setUsandoGeo] = useState(false);
  const [loadingGeo, setLoadingGeo] = useState(false);
  const [mercadosReais, setMercadosReais] = useState([]);
  const [mercadoExpandido, setMercadoExpandido] = useState(null);

  // Dicionário de Marcas
  const obterMarcaParaItem = (nomeItem) => {
    const itemUpper = (nomeItem || '').toUpperCase();
    if (itemUpper.includes('ARROZ')) return 'CAMIL';
    if (itemUpper.includes('FEIJÃO') || itemUpper.includes('FEIJAO')) return 'KICALDO';
    if (itemUpper.includes('LEITE')) return 'NINHO';
    if (itemUpper.includes('CAFÉ') || itemUpper.includes('CAFE')) return 'PILÃO';
    if (itemUpper.includes('AÇÚCAR') || itemUpper.includes('ACUCAR')) return 'UNIÃO';
    if (itemUpper.includes('ÓLEO') || itemUpper.includes('OLEO')) return 'LIZA';
    if (itemUpper.includes('MACARRÃO') || itemUpper.includes('MACARRAO')) return 'BARILLA';
    return 'MARCA PADRÃO';
  };

  // Carregar dados salvos do usuário específico ao fazer Login
  const carregarDadosDoUsuario = (user) => {
    const keyListas = `ta_quanto_listas_${user.toLowerCase()}`;
    const keyCupons = `ta_quanto_cupons_${user.toLowerCase()}`;

    const listasSalvas = localStorage.getItem(keyListas);
    const cuponsSalvos = localStorage.getItem(keyCupons);

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
          isPrincipal: true,
          itens: [
            { id: 1, nome: 'ARROZ', qtd: 1, un: 'UN', marcado: false, precoEstimado: 25.90, marca: 'CAMIL' },
            { id: 2, nome: 'FEIJÃO', qtd: 1, un: 'UN', marcado: false, precoEstimado: 8.50, marca: 'KICALDO' },
            { id: 3, nome: 'LEITE', qtd: 2, un: 'UN', marcado: false, precoEstimado: 5.20, marca: 'NINHO' },
          ]
        }
      ];
      setListas(inicial);
      setListasAbertas({ 1: true });
      setListaParaCompararId(1);
    }

    if (cuponsSalvos) {
      setHistoricoCupons(JSON.parse(cuponsSalvos));
    } else {
      setHistoricoCupons([]);
    }
  };

  // Salvar automaticamente no LocalStorage do usuário logado
  useEffect(() => {
    if (isLogged && usuario) {
      const keyListas = `ta_quanto_listas_${usuario.toLowerCase()}`;
      localStorage.setItem(keyListas, JSON.stringify(listas));
    }
  }, [listas, isLogged, usuario]);

  useEffect(() => {
    if (isLogged && usuario) {
      const keyCupons = `ta_quanto_cupons_${usuario.toLowerCase()}`;
      localStorage.setItem(keyCupons, JSON.stringify(historicoCupons));
    }
  }, [historicoCupons, isLogged, usuario]);

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

  const handleCloseModal = (e) => {
    if (e) e.stopPropagation();
    stopCamera();
    setShowQrModal(false);
    setQrUrl('');
  };

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
    alert(`Cupom salvo com sucesso para "${nomeFinal}"!`);
  };

  const excluirCupom = (cupomId) => {
    if (confirm('Deseja realmente remover este cupom do histórico?')) {
      setHistoricoCupons(historicoCupons.filter(c => c.id !== cupomId));
    }
  };

  // Autenticação
  const handleLogin = (e) => {
    e.preventDefault();
    if (!usuario.trim()) return alert('Digite seu nome de usuário');
    setIsLogged(true);
    carregarDadosDoUsuario(usuario);
    setScreen('dashboard');
  };

  const handleLogout = () => {
    setIsLogged(false);
    setListas([]);
    setHistoricoCupons([]);
    setMercadosReais([]);
    setUsandoGeo(false);
    setScreen('login');
  };

  const handleRegister = (e) => {
    e.preventDefault();
    if (!aceitaLgpd) {
      alert('Você precisa aceitar os Termos de Privacidade (LGPD) para prosseguir.');
      return;
    }
    alert('Cadastro realizado com sucesso! Faça login com seu usuário.');
    setScreen('login');
  };

  const toggleListaAberta = (listaId) => {
    setListasAbertas(prev => ({ ...prev, [listaId]: !prev[listaId] }));
  };

  const criarNovaLista = (e) => {
    e.preventDefault();
    if (!novaListaNome.trim()) return;

    const novaId = Date.now();
    const nova = {
      id: novaId,
      nome: novaListaNome.toUpperCase(),
      isPrincipal: false,
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

    const nomeFormatado = input.nome.toUpperCase();

    setListas(listas.map(l => {
      if (l.id === listaId) {
        return {
          ...l,
          itens: [
            ...l.itens,
            {
              id: Date.now(),
              nome: nomeFormatado,
              qtd: input.qtd || 1,
              un: 'UN',
              marcado: false,
              precoEstimado: (Math.random() * 15 + 3).toFixed(2),
              marca: obterMarcaParaItem(nomeFormatado)
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
    const listaAlvo = listas.find(l => l.id === id);
    const mensagem = listaAlvo?.isPrincipal 
      ? 'Deseja realmente excluir a Lista Principal?' 
      : 'Deseja realmente excluir esta lista?';

    if (confirm(mensagem)) {
      setListas(listas.filter(l => l.id !== id));
    }
  };

  const abrirComparacao = (listaId) => {
    setListaParaCompararId(listaId);
    setScreen('comparison');
  };

  // BUSCA DE MERCADOS REAIS VIA OPENSTREETMAP (COM TIMEOUT RIGOROSO DE REQUISIÇÃO)
  const obterLocalizacaoEBuscarMercadosReais = () => {
    if (!navigator.geolocation) {
      alert('Seu navegador não suporta geolocalização.');
      return;
    }

    setLoadingGeo(true);

    // Timeout de segurança caso a geolocalização do navegador não responda
    const geoTimeout = setTimeout(() => {
      setLoadingGeo(false);
      alert('A geolocalização demorou muito para responder. Verifique as permissões de GPS.');
    }, 12000);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        clearTimeout(geoTimeout);
        const { latitude, longitude } = position.coords;

        try {
          // Query Overpass otimizada para respostas rápidas
          const query = `[out:json][timeout:10];node(around:3000,${latitude},${longitude})["shop"~"supermarket|grocery|convenience"];out 15;`;
          
          const endpoints = [
            `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`,
            `https://overpass.kumi.systems/api/interpreter?data=${encodeURIComponent(query)}`,
            `https://maps.mail.ru/osm/tools/overpass/api/interpreter?data=${encodeURIComponent(query)}`
          ];

          let response = null;

          for (const url of endpoints) {
            try {
              // AbortController força a liberação do fetch em até 6 segundos por servidor
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 6000);

              const res = await fetch(url, { signal: controller.signal });
              clearTimeout(timeoutId);

              if (res.ok) {
                response = res;
                break;
              }
            } catch (e) {
              console.warn("Servidor instável, tentando próximo servidor de mapas...", e);
            }
          }

          if (!response) {
            throw new Error('Nenhum servidor de mapas respondeu a tempo.');
          }

          const data = await response.json();
          const lugares = data.elements || [];

          const nomesEncontrados = [];
          lugares.forEach(el => {
            const nome = el.tags?.name || el.tags?.['brand'] || el.tags?.['operator'];
            if (nome) {
              const nomeUpper = nome.toUpperCase();
              if (!nomesEncontrados.includes(nomeUpper)) {
                nomesEncontrados.push(nomeUpper);
              }
            }
          });

          if (nomesEncontrados.length > 0) {
            const novosMercadosReais = nomesEncontrados.map((nome, idx) => ({
              id: `geo-real-${idx}`,
              nome: nome,
              fatorMultiplicador: 0.85 + (Math.random() * 0.30),
              origem: 'Mercado Próximo (GPS)'
            }));

            setMercadosReais(novosMercadosReais);
            setUsandoGeo(true);
            alert(`Sucesso! Encontramos ${novosMercadosReais.length} mercados reais próximos a você!`);
          } else {
            alert('Localização obtida! Porém nenhum mercado cadastrado foi localizado no raio de 3km.');
          }
        } catch (error) {
          console.error("Erro na requisição de mapas:", error);
          alert('Não foi possível carregar os mercados no momento. O servidor do OpenStreetMap pode estar instável.');
        } finally {
          setLoadingGeo(false);
        }
      },
      (error) => {
        clearTimeout(geoTimeout);
        setLoadingGeo(false);
        console.error("Erro Geolocation:", error);
        alert('Não foi possível obter sua localização. Verifique se o GPS/Localização do seu navegador está ativado.');
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 30000 }
    );
  };

  const listaAtualComparacao = listas.find(l => l.id === listaParaCompararId) || listas[0] || { nome: 'NENHUMA LISTA', itens: [] };

  const obterMercadosParaComparar = () => {
    const mercadosBipadosUnicos = Array.from(new Set(historicoCupons.map(c => c.mercado)));
    const listaFinalMercados = [];

    // 1. Mercados lidos por cupom
    mercadosBipadosUnicos.forEach((nomeMercado, idx) => {
      const fator = 0.88 + ((idx % 4) * 0.05); 
      listaFinalMercados.push({
        id: `bipado-${idx}`,
        nome: nomeMercado,
        fatorMultiplicador: fator,
        origem: 'Bipado por Você'
      });
    });

    // 2. Se a busca GPS já rodou, adiciona os mercados reais encontrados
    if (usandoGeo && mercadosReais.length > 0) {
      mercadosReais.forEach(mr => {
        if (!listaFinalMercados.some(m => m.nome === mr.nome)) {
          listaFinalMercados.push(mr);
        }
      });
    } else if (!usandoGeo) {
      // 3. Usa os padrões regionais se o GPS não tiver sido acionado ainda
      const padroes = [
        { id: 'padrao-1', nome: 'ASSAÍ ATACADISTA', fatorMultiplicador: 0.92, origem: 'Regional' },
        { id: 'padrao-2', nome: 'FORT ATACADISTA', fatorMultiplicador: 1.00, origem: 'Regional' },
        { id: 'padrao-3', nome: 'CARREFOUR', fatorMultiplicador: 1.05, origem: 'Regional' },
        { id: 'padrao-4', nome: 'PÃO DE AÇÚCAR', fatorMultiplicador: 1.12, origem: 'Regional' }
      ];

      padroes.forEach(p => {
        if (!listaFinalMercados.some(m => m.nome === p.nome)) {
          listaFinalMercados.push(p);
        }
      });
    }

    const mercadosComTotais = listaFinalMercados.map(m => {
      const total = listaAtualComparacao.itens ? listaAtualComparacao.itens.reduce((acc, item) => {
        const precoBase = Number(item.precoEstimado) || 10;
        return acc + (precoBase * item.qtd * m.fatorMultiplicador);
      }, 0) : 0;

      return {
        ...m,
        totalCalculado: total.toFixed(2),
        totalNum: total
      };
    });

    return mercadosComTotais.sort((a, b) => a.totalNum - b.totalNum);
  };

  // Renderizador das telas
  const renderScreen = () => {
    if (screen === 'login' && !isLogged) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#0066a1] p-4 font-sans">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-extrabold text-[#0d824d] flex items-center justify-center gap-2">
                <span className="text-3xl">🛒</span> TÁ QUANTO?
              </h1>
              <p className="text-gray-600 text-sm font-medium">Faça login para acessar suas listas exclusivas</p>
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

    if (screen === 'comparison') {
      const mercadosComparacao = obterMercadosParaComparar();

      return (
        <div className="min-h-screen bg-[#f4f6f8] p-4 sm:p-6 font-sans">
          <div className="max-w-5xl mx-auto space-y-6">
            
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border">
              <div>
                <span className="text-xs font-bold text-gray-400 tracking-wider uppercase">Análise de Economia</span>
                <h1 className="text-xl sm:text-2xl font-black text-gray-800">{listaAtualComparacao.nome}</h1>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setShowQrModal(true)}
                  className="bg-[#1877f2] hover:bg-[#1162cd] text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-sm transition-colors cursor-pointer select-none active:scale-95"
                >
                  <span>📱</span> Bipar Cupom
                </button>

                <button 
                  type="button"
                  onClick={() => setScreen('dashboard')} 
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-3 py-2.5 rounded-xl text-xs transition-colors cursor-pointer select-none active:scale-95"
                >
                  ← Voltar
                </button>
              </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-semibold">Produtos nesta Lista</p>
                  <p className="text-2xl font-black text-gray-800">{listaAtualComparacao.itens?.length || 0}</p>
                </div>
                <span className="text-3xl">🧺</span>
              </div>

              <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-semibold">Cupons Bipados no Histórico</p>
                  <p className="text-2xl font-black text-gray-800">{historicoCupons.length}</p>
                </div>
                <span className="text-3xl">🧾</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-sm border-2 border-blue-500 space-y-3">
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-3">
                <div>
                  <h2 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                    <span className="text-red-500">📍</span> Mercados da Sua Região
                  </h2>
                  <p className="text-xs text-gray-500">
                    {usandoGeo 
                      ? `Exibindo mercados reais encontrados via GPS` 
                      : `Clique no botão ao lado para buscar supermercados e estabelecimentos próximos`}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={obterLocalizacaoEBuscarMercadosReais}
                  disabled={loadingGeo}
                  className={`border-2 border-blue-500 ${loadingGeo ? 'bg-blue-100 text-blue-400' : 'text-blue-600 hover:bg-blue-50'} font-bold px-4 py-2 rounded-full text-xs transition-colors flex items-center justify-center gap-2`}
                >
                  <span>🌐</span> {loadingGeo ? 'Buscando no Mapa...' : usandoGeo ? 'Atualizar Mercados Próximos' : 'Usar Minha Localização Real'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mercadosComparacao.map((mercado, index) => {
                const isMaisBarato = index === 0;
                const isExpandido = mercadoExpandido === mercado.id;

                return (
                  <div 
                    key={mercado.id} 
                    className={`rounded-2xl overflow-hidden shadow-sm border-2 ${
                      isMaisBarato ? 'bg-emerald-50 border-emerald-500' : 'bg-white border-gray-200'
                    }`}
                  >
                    <div 
                      onClick={() => setMercadoExpandido(isExpandido ? null : mercado.id)}
                      className="p-4 cursor-pointer relative hover:bg-gray-50/50 transition-colors"
                    >
                      {isMaisBarato && (
                        <span className="absolute top-3 right-3 bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                          🏆 Mais Barato
                        </span>
                      )}

                      <div className="flex items-center gap-2">
                        <h3 className={`font-extrabold text-base ${isMaisBarato ? 'text-emerald-900' : 'text-gray-800'}`}>
                          {mercado.nome}
                        </h3>
                        <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md font-bold">
                          {mercado.origem}
                        </span>
                      </div>

                      <p className={`text-xs ${isMaisBarato ? 'text-emerald-700' : 'text-gray-500'} mt-1`}>
                        Estimativa total:
                      </p>

                      <div className="flex justify-between items-end mt-1">
                        <p className={`text-2xl font-black ${isMaisBarato ? 'text-emerald-600' : 'text-gray-700'}`}>
                          R$ {mercado.totalCalculado}
                        </p>
                        <span className={`text-xs font-bold ${isMaisBarato ? 'text-emerald-800' : 'text-gray-500'}`}>
                          {isExpandido ? 'Recolher Cascata ▲' : 'Ver Itens em Cascata ▼'}
                        </span>
                      </div>
                    </div>

                    {isExpandido && (
                      <div className={`p-4 border-t space-y-2 divide-y ${isMaisBarato ? 'bg-white border-emerald-200' : 'bg-gray-50 border-gray-200'}`}>
                        <p className={`text-[11px] font-extrabold uppercase tracking-wider mb-2 ${isMaisBarato ? 'text-emerald-800' : 'text-gray-600'}`}>
                          Detalhamento dos Preços & Marcas:
                        </p>
                        {listaAtualComparacao.itens?.map((item) => {
                          const precoUnit = ((Number(item.precoEstimado) || 10) * mercado.fatorMultiplicador).toFixed(2);
                          const subtotal = (precoUnit * item.qtd).toFixed(2);
                          const marcaExibida = item.marca || obterMarcaParaItem(item.nome);

                          return (
                            <div key={item.id} className="pt-2 flex justify-between items-center text-xs">
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-gray-800">{item.nome}</span>
                                  <span className="bg-blue-100 text-blue-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-blue-200">
                                    🏷️ {marcaExibida}
                                  </span>
                                </div>
                                <p className="text-[10px] text-gray-400 mt-0.5">{item.qtd} UN x R$ {precoUnit}</p>
                              </div>
                              <span className={`font-bold ${isMaisBarato ? 'text-emerald-700' : 'text-gray-700'}`}>
                                R$ {subtotal}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
              <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <span>🧾</span> Histórico de Cupons ({historicoCupons.length})
              </h3>

              {historicoCupons.length === 0 ? (
                <p className="text-xs text-gray-400 italic">Nenhum cupom bipado por este usuário ainda.</p>
              ) : (
                <div className="space-y-2 divide-y">
                  {historicoCupons.map((cupom) => (
                    <div key={cupom.id} className="pt-2 flex items-center justify-between text-xs gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-800 truncate">{cupom.mercado}</p>
                        <p className="text-[10px] text-gray-400">Lido em {cupom.data} às {cupom.hora}</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => excluirCupom(cupom.id)}
                        className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg text-xs font-bold transition-colors"
                        title="Excluir Cupom"
                      >
                        🗑️ Excluir
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#f4f6f8] p-4 sm:p-6 font-sans">
        <div className="max-w-3xl mx-auto space-y-4">

          <header className="flex justify-between items-center bg-white px-4 py-3 rounded-2xl shadow-sm border">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-extrabold text-[#0d824d] flex items-center gap-1.5">
                🛒 TÁ QUANTO?
              </h1>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                👤 {usuario.toUpperCase()}
              </span>
            </div>

            <button onClick={handleLogout} className="text-xs font-bold text-red-500 hover:underline">
              Sair
            </button>
          </header>

          <div className="bg-white p-3.5 rounded-2xl shadow-sm border border-gray-100 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
              <span className="text-blue-600">➕</span> Criar Nova Lista do Usuário
            </div>
            <form onSubmit={criarNovaLista} className="flex gap-2">
              <input
                type="text"
                placeholder="EX: MENSAL, CHURRASCO, FARMÁCIA..."
                value={novaListaNome}
                onChange={e => setNovaListaNome(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-xs font-semibold text-gray-900 uppercase bg-white focus:outline-none focus:border-blue-500"
                required
              />
              <button type="submit" className="bg-[#1877f2] text-white px-4 py-2 rounded-xl text-xs font-bold">
                + Criar
              </button>
            </form>
          </div>

          <div className="space-y-2.5">
            <h2 className="text-[11px] font-extrabold text-gray-400 tracking-wider uppercase px-1">
              Suas Listas ({listas.length})
            </h2>

            {listas.length === 0 ? (
              <div className="bg-white p-6 rounded-2xl text-center border border-dashed border-gray-300 space-y-2">
                <p className="text-xs font-bold text-gray-500">Você não possui nenhuma lista no momento.</p>
                <p className="text-[11px] text-gray-400">Crie uma nova lista no campo acima para começar a adicionar itens!</p>
              </div>
            ) : (
              listas.map((lista) => {
                const estaAberta = !!listasAbertas[lista.id];
                const inputAtual = inputsItens[lista.id] || { nome: '', qtd: 1 };

                return (
                  <div key={lista.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all">
                    
                    <div 
                      onClick={() => toggleListaAberta(lista.id)}
                      className="px-4 py-3 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors select-none"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-base text-blue-600 font-bold">
                          {estaAberta ? '📂' : '📁'}
                        </span>
                        <h3 className="text-xs sm:text-sm font-extrabold text-gray-800 tracking-wide uppercase flex items-center gap-2">
                          {lista.nome}
                          {lista.isPrincipal && (
                            <span className="text-[9px] bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded font-extrabold">
                              GLOBAL
                            </span>
                          )}
                        </h3>
                        <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-full">
                          {lista.itens.length} {lista.itens.length === 1 ? 'item' : 'itens'}
                        </span>
                      </div>

                      <span className="text-[11px] font-bold text-gray-500">
                        {estaAberta ? '▲' : '▼'}
                      </span>
                    </div>

                    {estaAberta && (
                      <div className="border-t border-gray-100 bg-white">
                        <div className="p-2.5 bg-gray-50/80 border-b flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => abrirComparacao(lista.id)}
                            className="bg-[#0d824d] hover:bg-[#0a673d] text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors shadow-sm"
                          >
                            📊 Comparar Preços desta Lista
                          </button>

                          <button
                            type="button"
                            onClick={() => deletarLista(lista.id)}
                            className="text-red-500 hover:bg-red-50 px-2 py-1 rounded-lg text-xs font-bold"
                          >
                            🗑️ Excluir Lista
                          </button>
                        </div>

                        <form onSubmit={(e) => adicionarItem(e, lista.id)} className="p-2.5 bg-gray-50 border-b flex gap-2">
                          <input
                            type="text"
                            placeholder="NOME DO ITEM..."
                            value={inputAtual.nome}
                            onChange={e => handleInputItemChange(lista.id, 'nome', e.target.value)}
                            className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold uppercase bg-white"
                            required
                          />
                          <input
                            type="number"
                            min="1"
                            value={inputAtual.qtd}
                            onChange={e => handleInputItemChange(lista.id, 'qtd', Number(e.target.value))}
                            className="w-16 px-2 py-1.5 border border-gray-300 rounded-lg text-xs text-center font-bold bg-white"
                          />
                          <button type="submit" className="bg-[#1877f2] text-white px-3 py-1.5 rounded-lg text-xs font-bold">
                            + Adicionar
                          </button>
                        </form>

                        <div className="divide-y">
                          {(!lista.itens || lista.itens.length === 0) ? (
                            <div className="p-4 text-center text-xs text-gray-400 italic">
                              Esta lista está vazia.
                            </div>
                          ) : (
                            lista.itens.map(item => {
                              const marcaCorreta = item.marca || obterMarcaParaItem(item.nome);
                              return (
                                <div key={item.id} className="px-3.5 py-2.5 flex items-center justify-between hover:bg-gray-50">
                                  <div className="flex items-center gap-2.5">
                                    <input
                                      type="checkbox"
                                      checked={item.marcado}
                                      onChange={() => toggleCheck(lista.id, item.id)}
                                      className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600"
                                    />
                                    <div className="flex items-center gap-1.5">
                                      <span className={`text-xs font-bold ${item.marcado ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                                        {item.nome}
                                      </span>
                                      <span className="text-[10px] bg-gray-100 text-gray-600 font-bold px-1.5 py-0.5 rounded">
                                        🏷️ {marcaCorreta}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                                      {item.qtd} UN
                                    </span>
                                    <button type="button" onClick={() => removerItem(lista.id, item.id)} className="text-red-500 text-xs font-bold px-1">
                                      ✕
                                    </button>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>

                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

        </div>
      </div>
    );
  };

  return (
    <>
      {renderScreen()}

      {/* MODAL QR CODE */}
      {showQrModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-5 sm:p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-sm sm:text-base font-bold text-gray-800 flex items-center gap-2">
                📱 Bipar QR Code do Cupom
              </h3>
              <button type="button" onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
            </div>

            <div className="space-y-3">
              {!cameraActive ? (
                <button
                  type="button"
                  onClick={() => setCameraActive(true)}
                  className="w-full bg-[#1877f2] text-white font-bold py-3 rounded-xl text-xs shadow-sm"
                >
                  📷 Abrir Câmera do Celular
                </button>
              ) : (
                <div className="space-y-2">
                  <div id="reader" className="w-full overflow-hidden rounded-xl border-2 border-blue-500 bg-black"></div>
                  <button
                    type="button"
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
              <button type="button" onClick={handleCloseModal} className="px-4 py-2 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-100">
                Cancelar
              </button>
              <button
                type="button"
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

      {/* MODAL NOME FANTASIA */}
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
                  placeholder="EX: CARREFOUR ANCHIETA, EXTRA ITAIM..."
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
    </>
  );
}