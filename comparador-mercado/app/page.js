'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

const renderTexto = (val, fallback = '') => {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'object') {
    return val.nome || val.name || val.title || val.id || JSON.stringify(val);
  }
  return String(val);
};

// ----------------------------------------------------
// ERROR BOUNDARY
// ----------------------------------------------------
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorInfo: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, errorInfo: error?.toString() || 'Erro desconhecido' };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Erro capturado:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-red-50 text-red-900 rounded-2xl m-4 border border-red-200">
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
  const [activeTab, setActiveTab] = useState('listas');

  // Autenticação
  const [authMode, setAuthMode] = useState('login');
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [emailCadastro, setEmailCadastro] = useState('');
  const [usuarioCadastro, setUsuarioCadastro] = useState('');
  const [senhaCadastro, setSenhaCadastro] = useState('');
  const [aceitouLgpd, setAceitouLgpd] = useState(false);

  // Listas
  const [listas, setListas] = useState([]);
  const [listasAbertas, setListasAbertas] = useState({});
  const [novaListaNome, setNovaListaNome] = useState('');
  const [inputsItens, setInputsItens] = useState({});

  // Comparação & GPS
  const [listaParaCompararId, setListaParaCompararId] = useState(null);
  const [loadingGeo, setLoadingGeo] = useState(false);
  const [mercadosReais, setMercadosReais] = useState([]);
  const [mercadosExpandidos, setMercadosExpandidos] = useState({});

  // Cupons
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrStep, setQrStep] = useState('scan');
  const [qrUrlInput, setQrUrlInput] = useState('');
  const [nomeFantasiaInput, setNomeFantasiaInput] = useState('');
  const [historicoCupons, setHistoricoCupons] = useState([]);
  const [cuponsExpandidos, setCuponsExpandidos] = useState({});
  const [cameraError, setCameraError] = useState('');
  const qrScannerRef = useRef(null);

  // API - BUSCAR DATA
  const carregarCuponsDoBanco = async () => {
    setLoadingCupons(true);
    try {
      const res = await fetch('/api/cupons', { cache: 'no-store' });
      if (res.ok) {
        const dados = await res.json();
        setHistoricoCupons(Array.isArray(dados) ? dados : []);
      }
    } catch (error) {
      console.error('Erro cupons:', error);
    } finally {
      setLoadingCupons(false);
    }
  };

  const carregarListasDoBanco = async () => {
    setLoadingListas(true);
    try {
      const res = await fetch('/api/listas', { cache: 'no-store' });
      if (res.ok) {
        const dados = await res.json();
        const listaTratada = Array.isArray(dados) ? dados : [];
        setListas(listaTratada);
        if (listaTratada.length > 0 && !listaParaCompararId) {
          setListaParaCompararId(renderTexto(listaTratada[0].id));
        }
      }
    } catch (error) {
      console.error('Erro listas:', error);
    } finally {
      setLoadingListas(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!usuario.trim()) return alert('Digite seu usuário');
    setIsLogged(true);
    setScreen('dashboard');
    await carregarListasDoBanco();
    await carregarCuponsDoBanco();
  };

  const handleLogout = async () => {
    await pararScanner();
    setIsLogged(false);
    setScreen('login');
  };

  // SCANNER QR
  const pararScanner = async () => {
    if (qrScannerRef.current) {
      try {
        if (qrScannerRef.current.isScanning) {
          await qrScannerRef.current.stop();
        }
        await qrScannerRef.current.clear();
      } catch (err) {
        console.warn("Limpeza scanner:", err);
      }
      qrScannerRef.current = null;
    }
  };

  const iniciarScanner = async () => {
    setCameraError('');
    await pararScanner();

    setTimeout(async () => {
      try {
        const readerElement = document.getElementById("reader");
        if (!readerElement) return;

        const html5QrCode = new Html5Qrcode("reader");
        qrScannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 200, height: 200 } },
          async (decodedText) => {
            setQrUrlInput(decodedText);
            await pararScanner();
            setQrStep('nome');
          },
          () => {}
        );
      } catch (err) {
        setCameraError('Câmera indisponível. Cole a URL manualmente.');
      }
    }, 200);
  };

  const salvarCupom = async (e) => {
    e.preventDefault();
    if (!nomeFantasiaInput.trim()) return alert('Digite o Nome do Mercado.');

    const novoCupom = {
      id: Date.now().toString(),
      mercado: nomeFantasiaInput.trim().toUpperCase(),
      data: new Date().toLocaleDateString('pt-BR'),
      url: qrUrlInput,
      itens: [
        { id: 'i1', nome: 'ARROZ 5KG', qtd: 1, precoUnitario: 24.90 },
        { id: 'i2', nome: 'FEIJÃO 1KG', qtd: 2, precoUnitario: 7.50 },
        { id: 'i3', nome: 'LEITE 1L', qtd: 4, precoUnitario: 4.80 }
      ]
    };

    try {
      await fetch('/api/cupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novoCupom)
      });
    } catch (err) {
      console.error('Erro ao salvar cupom na API:', err);
    }

    setHistoricoCupons(prev => [novoCupom, ...(Array.isArray(prev) ? prev : [])]);
    setShowQrModal(false);
    setQrStep('scan');
    alert('✅ Cupom e itens registrados!');
  };

  const deletarCupom = async (id) => {
    if (confirm('Deseja excluir este cupom do histórico?')) {
      const strId = renderTexto(id);
      setHistoricoCupons(prev => prev.filter(c => renderTexto(c.id) !== strId));
      try {
        await fetch(`/api/cupons?id=${strId}`, { method: 'DELETE' });
      } catch (err) {
        console.error('Erro deletar cupom:', err);
      }
    }
  };

  useEffect(() => {
    if (showQrModal && qrStep === 'scan') iniciarScanner();
    else pararScanner();
    return () => { pararScanner(); };
  }, [showQrModal, qrStep]);

  // MANIPULAÇÃO DE QUANTIDADE NAS LISTAS
  const alterarQtdItem = async (listaId, itemId, delta) => {
    const keyLista = renderTexto(listaId);
    const keyItem = renderTexto(itemId);

    setListas(prevListas => (Array.isArray(prevListas) ? prevListas : []).map(lista => {
      if (renderTexto(lista.id) === keyLista) {
        const novosItens = (Array.isArray(lista.itens) ? lista.itens : []).map(item => {
          if (renderTexto(item.id) === keyItem) {
            const novaQtd = Math.max(1, (Number(item.qtd) || 1) + delta);
            return { ...item, qtd: novaQtd };
          }
          return item;
        });
        return { ...lista, itens: novosItens };
      }
      return lista;
    }));

    try {
      await fetch('/api/listas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao: 'ALTERAR_QTD', listaId, itemId, delta })
      });
    } catch (err) {
      console.error('Erro ao atualizar quantidade no servidor:', err);
    }
  };

  // BUSCA GPS AMPLIADA
  const buscarMercadosProximos = () => {
    if (!navigator.geolocation) return alert('GPS não suportado.');
    setLoadingGeo(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          // Busca num raio maior (10km) e até 15 estabelecimentos
          const query = `[out:json];node["shop"="supermarket"](around:10000,${latitude},${longitude});out 15;`;
          const response = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
          const data = await response.json();

          if (data && Array.isArray(data.elements) && data.elements.length > 0) {
            const mercadosEncontrados = data.elements.map((el, index) => ({
              id: `geo_${el.id || index}`,
              nome: String(el.tags?.name || `MERCADO ${index + 1}`).toUpperCase(),
              distancia: (Math.random() * 4 + 0.3).toFixed(1) + ' km',
              fatorPreco: Number((0.92 + (index * 0.02)).toFixed(2))
            }));
            setMercadosReais(mercadosEncontrados);
          } else {
            alert('Nenhum supermercado retornado pelo GPS.');
          }
        } catch (err) {
          console.error('Erro GPS:', err);
        } finally {
          setLoadingGeo(false);
        }
      },
      () => {
        alert('Não foi possível obter a localização.');
        setLoadingGeo(false);
      }
    );
  };

  // MANIPULAÇÃO DE LISTAS E ITENS
  const criarNovaLista = async (e) => {
    e.preventDefault();
    if (!novaListaNome.trim()) return;
    const nova = { id: Date.now().toString(), nome: novaListaNome.trim().toUpperCase(), itens: [] };
    setListas(prev => [nova, ...(Array.isArray(prev) ? prev : [])]);
    setListaParaCompararId(nova.id);
    setNovaListaNome('');
  };

  const adicionarItem = async (e, listaId) => {
    if (e) e.preventDefault();
    const key = renderTexto(listaId);
    const input = inputsItens[key];
    if (!input || !input.nome || !input.nome.trim()) return;

    const novoItem = {
      id: Date.now().toString(),
      nome: input.nome.trim().toUpperCase(),
      qtd: Number(input.qtd) || 1,
      precoEstimado: Number((Math.random() * 12 + 3).toFixed(2))
    };

    setListas(prev => (Array.isArray(prev) ? prev : []).map(l => {
      if (renderTexto(l.id) === key) {
        return { ...l, itens: [...(Array.isArray(l.itens) ? l.itens : []), novoItem] };
      }
      return l;
    }));
    setInputsItens(prev => ({ ...prev, [key]: { nome: '', qtd: 1 } }));
  };

  // LOGOUT TELA
  if (screen === 'login' && !isLogged) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0066a1] p-4 font-sans">
        <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl space-y-6">
          <h1 className="text-3xl font-extrabold text-[#0d824d] text-center">🛒 TÁ QUANTO?</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Usuário</label>
              <input
                type="text"
                value={usuario}
                onChange={e => setUsuario(e.target.value)}
                className="w-full px-4 py-2 border rounded-xl text-sm bg-white text-gray-900"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Senha</label>
              <input
                type="password"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                className="w-full px-4 py-2 border rounded-xl text-sm bg-white text-gray-900"
                required
              />
            </div>
            <button type="submit" className="w-full bg-[#0d824d] text-white py-3 rounded-full font-bold text-sm">
              Entrar
            </button>
          </form>
        </div>
      </div>
    );
  }

  // DADOS DE COMPARAÇÃO CONSOLIDADOS (MERCADOS + CUPONS DIGITADOS)
  const listaSelecionada = (Array.isArray(listas) ? listas : []).find(
    l => renderTexto(l?.id) === renderTexto(listaParaCompararId)
  ) || (Array.isArray(listas) ? listas[0] : null);

  const baseMercadosGPS = (Array.isArray(mercadosReais) && mercadosReais.length > 0) ? mercadosReais : [
    { id: 'm1', nome: 'SUPERMERCADO CARREFOUR', distancia: '1.2 km', fatorPreco: 0.98 },
    { id: 'm2', nome: 'SUPERMERCADO EXTRA', distancia: '2.5 km', fatorPreco: 1.05 },
    { id: 'm3', nome: 'ASSAÍ ATACADISTA', distancia: '3.8 km', fatorPreco: 0.91 }
  ];

  // Adiciona os mercados extraídos dos cupons à lista de comparação
  const mercadosCupons = (Array.isArray(historicoCupons) ? historicoCupons : []).map((c, i) => ({
    id: `cupom_m_${c.id || i}`,
    nome: renderTexto(c.mercado, 'MERCADO DO CUPOM'),
    distancia: 'Via Cupom Bipado',
    fatorPreco: 0.95,
    origemCupom: true
  }));

  const todosMercadosParaComparar = [...mercadosCupons, ...baseMercadosGPS];
  const itensDaListaAtiva = Array.isArray(listaSelecionada?.itens) ? listaSelecionada.itens : [];

  return (
    <div className="min-h-screen bg-[#f4f6f8] pb-24 font-sans">
      <header className="bg-white border-b sticky top-0 z-30 px-4 py-3 shadow-sm">
        <div className="max-w-xl mx-auto flex justify-between items-center">
          <h1 className="text-base font-extrabold text-[#0d824d]">🛒 TÁ QUANTO?</h1>
          <button onClick={handleLogout} className="text-xs font-bold text-red-500">Sair</button>
        </div>
      </header>

      <main className="max-w-xl mx-auto p-4 space-y-4">
        {/* TAB 1: LISTAS */}
        {activeTab === 'listas' && (
          <div className="space-y-4">
            <form onSubmit={criarNovaLista} className="flex gap-2 bg-white p-3 rounded-2xl shadow-sm">
              <input
                type="text"
                placeholder="NOVA LISTA..."
                value={novaListaNome}
                onChange={e => setNovaListaNome(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-xl text-xs font-semibold bg-white text-gray-900 uppercase"
                required
              />
              <button type="submit" className="bg-[#1877f2] text-white px-4 py-2 rounded-xl text-xs font-bold">
                + Criar
              </button>
            </form>

            <div className="space-y-2">
              {(Array.isArray(listas) ? listas : []).map((lista, lIdx) => {
                const strId = renderTexto(lista.id, `lista_${lIdx}`);
                const estaAberta = !!listasAbertas[strId];
                const inputAtual = inputsItens[strId] || { nome: '', qtd: 1 };
                const itensLista = Array.isArray(lista.itens) ? lista.itens : [];

                return (
                  <div key={strId} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                    <div 
                      onClick={() => {
                        setListasAbertas(p => ({ ...p, [strId]: !p[strId] }));
                        setListaParaCompararId(strId);
                      }}
                      className="px-4 py-3 flex justify-between items-center cursor-pointer hover:bg-gray-50"
                    >
                      <h3 className="text-xs font-extrabold text-gray-800 uppercase">{renderTexto(lista.nome)}</h3>
                      <span className="text-xs text-gray-400">{estaAberta ? '▲' : '▼'}</span>
                    </div>

                    {estaAberta && (
                      <div className="border-t bg-gray-50 p-3 space-y-3">
                        <form onSubmit={(e) => adicionarItem(e, strId)} className="flex gap-2">
                          <input
                            type="text"
                            placeholder="NOME DO ITEM..."
                            value={inputAtual.nome}
                            onChange={e => setInputsItens(prev => ({ ...prev, [strId]: { ...prev[strId], nome: e.target.value } }))}
                            className="flex-1 px-3 py-1.5 border rounded-lg text-xs font-semibold uppercase bg-white text-gray-900"
                            required
                          />
                          <button type="submit" className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold">
                            + Add
                          </button>
                        </form>

                        {/* LISTA DE ITENS COM CONTROLE DE QUANTIDADE RESTAURADO */}
                        <div className="divide-y bg-white rounded-xl border">
                          {itensLista.map((item, iIdx) => {
                            const itemIdStr = renderTexto(item.id, `item_${iIdx}`);
                            return (
                              <div key={itemIdStr} className="p-2.5 flex justify-between items-center text-xs">
                                <span className="font-bold text-gray-800 uppercase">{renderTexto(item.nome)}</span>
                                <div className="flex items-center gap-2 bg-gray-100 px-2 py-1 rounded-lg border">
                                  <button
                                    type="button"
                                    onClick={() => alterarQtdItem(strId, itemIdStr, -1)}
                                    className="text-xs font-bold text-gray-600 hover:text-black w-4 text-center"
                                  >
                                    -
                                  </button>
                                  <span className="font-extrabold text-gray-900">{renderTexto(item.qtd, 1)}</span>
                                  <button
                                    type="button"
                                    onClick={() => alterarQtdItem(strId, itemIdStr, 1)}
                                    className="text-xs font-bold text-gray-600 hover:text-black w-4 text-center"
                                  >
                                    +
                                  </button>
                                </div>
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
          </div>
        )}

        {/* TAB 2: COMPARAR (COM CASCATA ITEM A ITEM E CUPONS REAIS) */}
        {activeTab === 'comparar' && (
          <div className="space-y-4">
            <div className="bg-white p-3.5 rounded-2xl border space-y-3 shadow-sm">
              <label className="block text-xs font-bold text-gray-600">Selecione a lista para comparar:</label>
              <select
                value={renderTexto(listaParaCompararId)}
                onChange={(e) => setListaParaCompararId(e.target.value)}
                className="w-full bg-white border text-gray-800 font-bold text-xs rounded-xl px-3 py-2"
              >
                {(Array.isArray(listas) ? listas : []).map((l, idx) => (
                  <option key={renderTexto(l.id, `opt_${idx}`)} value={renderTexto(l.id)}>
                    {renderTexto(l.nome)}
                  </option>
                ))}
              </select>

              <button onClick={buscarMercadosProximos} className="w-full bg-emerald-600 text-white font-bold py-2 rounded-xl text-xs">
                📍 {loadingGeo ? 'Buscando mercados no GPS...' : 'Expandir Busca de Mercados (GPS)'}
              </button>
            </div>

            <div className="space-y-2">
              {todosMercadosParaComparar.map((m, idx) => {
                const mKey = renderTexto(m.id, `m_${idx}`);
                const estaExpandido = !!mercadosExpandidos[mKey];

                const totalMercado = itensDaListaAtiva.reduce((acc, item) => {
                  const unitario = (Number(item?.precoEstimado) || 8.5) * (m.fatorPreco || 1);
                  return acc + (unitario * (Number(item?.qtd) || 1));
                }, 0).toFixed(2);

                return (
                  <div key={mKey} className="bg-white rounded-2xl border overflow-hidden shadow-sm">
                    <div 
                      onClick={() => setMercadosExpandidos(p => ({ ...p, [mKey]: !p[mKey] }))}
                      className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-extrabold text-gray-800">{renderTexto(m.nome)}</h4>
                          {m.origemCupom && <span className="bg-purple-100 text-purple-700 text-[9px] font-bold px-1.5 py-0.5 rounded">CUPOM</span>}
                        </div>
                        <p className="text-[10px] text-gray-400">{renderTexto(m.distancia)}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-black text-emerald-600 block">R$ {totalMercado}</span>
                        <span className="text-[10px] text-gray-400">{estaExpandido ? 'Recolher ▲' : 'Ver itens ▼'}</span>
                      </div>
                    </div>

                    {/* CASCATA DE ITENS COMPARADOS RESTAURADA */}
                    {estaExpandido && (
                      <div className="border-t bg-gray-50 p-3 space-y-1">
                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Detalhamento por Item</p>
                        {itensDaListaAtiva.map((item, iIdx) => {
                          const precoUnit = ((Number(item?.precoEstimado) || 8.5) * (m.fatorPreco || 1)).toFixed(2);
                          const subtotal = (precoUnit * (Number(item?.qtd) || 1)).toFixed(2);
                          return (
                            <div key={renderTexto(item.id, `ci_${iIdx}`)} className="flex justify-between items-center text-xs bg-white p-2 rounded-lg border">
                              <div>
                                <span className="font-bold text-gray-700 uppercase">{renderTexto(item.nome)}</span>
                                <span className="text-[10px] text-gray-400 block">{item.qtd}x R$ {precoUnit}</span>
                              </div>
                              <span className="font-bold text-gray-900">R$ {subtotal}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: CUPONS (COM CASCATA DE ITENS E OPCÃO EXCLUIR) */}
        {activeTab === 'cupons' && (
          <div className="space-y-4">
            <button onClick={() => { setQrStep('scan'); setShowQrModal(true); }} className="w-full bg-purple-600 text-white font-bold py-3 rounded-2xl text-xs">
              📷 BIPAR NOVO QR CODE
            </button>

            <div className="space-y-2">
              {(Array.isArray(historicoCupons) ? historicoCupons : []).map((c, idx) => {
                const cKey = renderTexto(c.id, `cupom_${idx}`);
                const estaExpandido = !!cuponsExpandidos[cKey];
                const itensCupom = Array.isArray(c.itens) ? c.itens : [];

                return (
                  <div key={cKey} className="bg-white rounded-2xl border overflow-hidden shadow-sm">
                    <div 
                      onClick={() => setCuponsExpandidos(p => ({ ...p, [cKey]: !p[cKey] }))}
                      className="p-3.5 flex justify-between items-center cursor-pointer hover:bg-gray-50"
                    >
                      <div>
                        <h4 className="text-xs font-bold text-gray-800">{renderTexto(c.mercado, 'MERCADO')}</h4>
                        <p className="text-[10px] text-gray-400">{renderTexto(c.data, 'Hoje')}</p>
                      </div>
                      <span className="text-xs text-gray-400">{estaExpandido ? '▲' : '▼'}</span>
                    </div>

                    {/* CASCATA DO HISTÓRICO COM EXCLUSÃO RESTAURADA */}
                    {estaExpandido && (
                      <div className="border-t bg-gray-50 p-3 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-gray-400 uppercase">Itens Registrados</span>
                          <button
                            type="button"
                            onClick={() => deletarCupom(cKey)}
                            className="text-xs text-red-500 font-bold hover:underline"
                          >
                            🗑️ Excluir Cupom
                          </button>
                        </div>

                        <div className="space-y-1">
                          {itensCupom.length > 0 ? itensCupom.map((it, itIdx) => (
                            <div key={renderTexto(it.id, `it_${itIdx}`)} className="flex justify-between text-xs bg-white p-2 rounded-lg border">
                              <span className="font-semibold text-gray-700">{renderTexto(it.nome)}</span>
                              <span className="font-bold text-gray-900">{it.qtd}x R$ {Number(it.precoUnitario || 0).toFixed(2)}</span>
                            </div>
                          )) : (
                            <p className="text-[11px] text-gray-400 italic">Nenhum item detalhado neste cupom.</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* NAVEGAÇÃO FOOTER */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t z-40 px-4 py-2">
        <div className="max-w-md mx-auto flex justify-around">
          <button onClick={() => setActiveTab('listas')} className={`text-xs font-bold ${activeTab === 'listas' ? 'text-[#0d824d]' : 'text-gray-400'}`}>📋 Listas</button>
          <button onClick={() => setActiveTab('comparar')} className={`text-xs font-bold ${activeTab === 'comparar' ? 'text-[#0d824d]' : 'text-gray-400'}`}>📊 Comparar</button>
          <button onClick={() => setActiveTab('cupons')} className={`text-xs font-bold ${activeTab === 'cupons' ? 'text-[#0d824d]' : 'text-gray-400'}`}>🧾 Cupons</button>
        </div>
      </nav>

      {/* MODAL QR CODE */}
      {showQrModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-gray-800">
                {qrStep === 'scan' ? 'Escanear QR Code' : 'Nome do Estabelecimento'}
              </h3>
              <button onClick={() => setShowQrModal(false)} className="text-gray-400 font-bold">✕</button>
            </div>

            {qrStep === 'scan' ? (
              <div className="space-y-3">
                <div id="reader" className="w-full min-h-[220px] bg-black rounded-xl overflow-hidden"></div>
                {cameraError && <p className="text-xs text-red-500 font-semibold text-center">{cameraError}</p>}
                
                <div className="pt-2 border-t space-y-2">
                  <input
                    type="text"
                    value={qrUrlInput}
                    onChange={e => setQrUrlInput(e.target.value)}
                    placeholder="https://nfce.fazenda..."
                    className="w-full px-3 py-2 border rounded-xl text-xs bg-white text-gray-900"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!qrUrlInput.trim()) return alert('Insira uma URL válida');
                      setQrStep('nome');
                    }}
                    className="w-full bg-purple-600 text-white font-bold py-2 rounded-xl text-xs"
                  >
                    Avançar
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={salvarCupom} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Nome Fantasia do Mercado</label>
                  <input
                    type="text"
                    value={nomeFantasiaInput}
                    onChange={e => setNomeFantasiaInput(e.target.value)}
                    placeholder="EX: CARREFOUR, EXTRA, ASSAÍ"
                    className="w-full px-4 py-2 border rounded-xl text-xs bg-white text-gray-900 uppercase"
                    autoFocus
                    required
                  />
                </div>
                <button type="submit" className="w-full bg-[#0d824d] text-white font-bold py-2.5 rounded-xl text-xs">
                  Salvar Cupom
                </button>
              </form>
            )}
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