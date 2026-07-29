'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

// Função utilitária para converter qualquer valor para texto seguro
const renderTexto = (val, fallback = '') => {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'object') {
    return val.nome || val.name || val.title || val.id || JSON.stringify(val);
  }
  return String(val);
};

// ----------------------------------------------------
// COMPONENTE DE FRONTEIRA DE ERRO (Error Boundary)
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
    console.error("Erro capturado no React:", error, errorInfo);
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
  
  // Cadastro
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

  // Comparação
  const [listaParaCompararId, setListaParaCompararId] = useState(null);
  const [loadingGeo, setLoadingGeo] = useState(false);
  const [mercadosReais, setMercadosReais] = useState([]);

  // QR Code & Cupons
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrStep, setQrStep] = useState('scan'); // 'scan' | 'nome'
  const [qrUrlInput, setQrUrlInput] = useState('');
  const [nomeFantasiaInput, setNomeFantasiaInput] = useState('');
  const [historicoCupons, setHistoricoCupons] = useState([]);
  const [cameraError, setCameraError] = useState('');
  const qrScannerRef = useRef(null);

  // BUSCAR CUPONS
  const carregarCuponsDoBanco = async () => {
    setLoadingCupons(true);
    try {
      const res = await fetch('/api/cupons', { cache: 'no-store' });
      if (res.ok) {
        const dados = await res.json();
        setHistoricoCupons(Array.isArray(dados) ? dados : []);
      } else {
        setHistoricoCupons([]);
      }
    } catch (error) {
      console.error('Erro ao buscar cupons:', error);
      setHistoricoCupons([]);
    } finally {
      setLoadingCupons(false);
    }
  };

  // BUSCAR LISTAS
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
      } else {
        setListas([]);
      }
    } catch (error) {
      console.error('Erro ao buscar listas:', error);
      setListas([]);
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

  const handleCadastro = async (e) => {
    e.preventDefault();
    if (!nomeCompleto.trim() || !emailCadastro.trim() || !usuarioCadastro.trim() || !senhaCadastro.trim()) {
      return alert('Preencha todos os campos do cadastro.');
    }
    if (!aceitouLgpd) {
      return alert('Aceite os termos de privacidade para prosseguir.');
    }

    setUsuario(usuarioCadastro);
    setIsLogged(true);
    setScreen('dashboard');
    await carregarListasDoBanco();
    await carregarCuponsDoBanco();
  };

  const handleLogout = async () => {
    await pararScanner();
    setIsLogged(false);
    setListas([]);
    setHistoricoCupons([]);
    setScreen('login');
  };

  // CAMERA / SCANNER FLUXO
  const pararScanner = async () => {
    if (qrScannerRef.current) {
      try {
        if (qrScannerRef.current.isScanning) {
          await qrScannerRef.current.stop();
        }
        await qrScannerRef.current.clear();
      } catch (err) {
        console.warn("Limpeza do scanner:", err);
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
            // Leitura bem sucedida: guarda a URL, para a câmera e avança para o Nome Fantasia
            setQrUrlInput(decodedText);
            await pararScanner();
            setQrStep('nome');
          },
          () => {}
        );
      } catch (err) {
        console.error('Erro na câmera:', err);
        setCameraError('Câmera indisponível. Digite a URL manualmente abaixo.');
      }
    }, 200);
  };

  const abrirModalQr = () => {
    setQrStep('scan');
    setQrUrlInput('');
    setNomeFantasiaInput('');
    setShowQrModal(true);
  };

  const fecharModalQr = async () => {
    await pararScanner();
    setShowQrModal(false);
    setQrStep('scan');
  };

  const salvarCupom = async (e) => {
    e.preventDefault();
    if (!nomeFantasiaInput.trim()) return alert('Digite o Nome Fantasia do Mercado.');

    try {
      const res = await fetch('/api/cupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: qrUrlInput,
          mercado: nomeFantasiaInput.trim().toUpperCase(),
          data: new Date().toLocaleDateString('pt-BR')
        })
      });

      if (res.ok) {
        const novoCupom = await res.json();
        setHistoricoCupons(prev => [novoCupom, ...(Array.isArray(prev) ? prev : [])]);
      } else {
        // Fallback local caso a rota API não persista
        setHistoricoCupons(prev => [
          { id: Date.now(), mercado: nomeFantasiaInput.trim().toUpperCase(), data: new Date().toLocaleDateString('pt-BR') },
          ...prev
        ]);
      }
      await fecharModalQr();
      alert('✅ Cupom registrado com sucesso!');
    } catch (err) {
      console.error('Erro ao salvar cupom:', err);
      alert('Erro ao salvar cupom.');
    }
  };

  useEffect(() => {
    if (showQrModal && qrStep === 'scan') {
      iniciarScanner();
    } else {
      pararScanner();
    }
    return () => { pararScanner(); };
  }, [showQrModal, qrStep]);

  // GEOLOCALIZAÇÃO
  const buscarMercadosProximos = () => {
    if (!navigator.geolocation) return alert('Geolocalização não suportada.');
    setLoadingGeo(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const query = `[out:json];node["shop"="supermarket"](around:5000,${latitude},${longitude});out 5;`;
          const response = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
          const data = await response.json();

          if (data && Array.isArray(data.elements) && data.elements.length > 0) {
            const mercadosEncontrados = data.elements.map((el, index) => ({
              id: `geo_${el.id || index}`,
              nome: String(el.tags?.name || `SUPERMERCADO ${index + 1}`).toUpperCase(),
              distancia: (Math.random() * 2 + 0.5).toFixed(1) + ' km',
              fatorPreco: Number((1 + (index * 0.03 - 0.02)).toFixed(2))
            }));
            setMercadosReais(mercadosEncontrados);
          } else {
            alert('Nenhum supermercado encontrado por GPS.');
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

  // ADICIONAR / MANIPULAR ITENS E LISTAS
  const criarNovaLista = async (e) => {
    e.preventDefault();
    if (!novaListaNome.trim()) return;

    try {
      const res = await fetch('/api/listas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: novaListaNome.trim().toUpperCase() })
      });

      if (res.ok) {
        const novaListaCriada = await res.json();
        setListas(prev => [novaListaCriada, ...(Array.isArray(prev) ? prev : [])]);
        setListaParaCompararId(renderTexto(novaListaCriada.id));
        setNovaListaNome('');
      }
    } catch (err) {
      console.error('Erro criar lista:', err);
    }
  };

  const handleInputItemChange = (listaId, campo, valor) => {
    const key = renderTexto(listaId);
    setInputsItens(prev => ({
      ...prev,
      [key]: {
        nome: campo === 'nome' ? valor : prev[key]?.nome || '',
        qtd: campo === 'qtd' ? valor : prev[key]?.qtd || 1
      }
    }));
  };

  const adicionarItem = async (e, listaId) => {
    if (e) e.preventDefault();
    const key = renderTexto(listaId);
    const input = inputsItens[key];
    if (!input || !input.nome || !input.nome.trim()) return;

    const nomeFormatado = input.nome.trim().toUpperCase();
    const qtdInserida = Number(input.qtd) || 1;

    try {
      const res = await fetch('/api/listas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acao: 'ADICIONAR_ITEM',
          listaId,
          nome: nomeFormatado,
          qtd: qtdInserida,
          precoEstimado: Number((Math.random() * 15 + 3).toFixed(2)),
          marca: 'MARCA BASE'
        })
      });

      if (res.ok) {
        const itemSalvo = await res.json();
        setListas(prevListas => (Array.isArray(prevListas) ? prevListas : []).map(l => {
          if (renderTexto(l.id) === key) {
            return { ...l, itens: [...(Array.isArray(l.itens) ? l.itens : []), itemSalvo] };
          }
          return l;
        }));
        setInputsItens(prev => ({ ...prev, [key]: { nome: '', qtd: 1 } }));
      }
    } catch (err) {
      console.error('Erro ao adicionar item:', err);
    }
  };

  const deletarLista = async (id) => {
    if (confirm('Deseja excluir esta lista?')) {
      const strId = renderTexto(id);
      setListas(prev => (Array.isArray(prev) ? prev.filter(l => renderTexto(l.id) !== strId) : []));
      await fetch(`/api/listas?listaId=${strId}`, { method: 'DELETE' });
    }
  };

  // TELA DE LOGIN / CADASTRO
  if (screen === 'login' && !isLogged) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0066a1] p-4 font-sans">
        <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-extrabold text-[#0d824d] flex items-center justify-center gap-2">
              <span>🛒</span> TÁ QUANTO?
            </h1>
          </div>

          <div className="flex border-b border-gray-200">
            <button
              type="button"
              onClick={() => setAuthMode('login')}
              className={`flex-1 py-2 font-bold text-xs border-b-2 ${authMode === 'login' ? 'border-[#0d824d] text-[#0d824d]' : 'text-gray-400'}`}
            >
              ENTRAR
            </button>
            <button
              type="button"
              onClick={() => setAuthMode('cadastro')}
              className={`flex-1 py-2 font-bold text-xs border-b-2 ${authMode === 'cadastro' ? 'border-[#0d824d] text-[#0d824d]' : 'text-gray-400'}`}
            >
              CADASTRAR-SE
            </button>
          </div>

          {authMode === 'login' ? (
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
          ) : (
            <form onSubmit={handleCadastro} className="space-y-3">
              <input
                type="text"
                placeholder="Nome Completo"
                value={nomeCompleto}
                onChange={e => setNomeCompleto(e.target.value)}
                className="w-full px-4 py-2 border rounded-xl text-xs bg-white text-gray-900"
                required
              />
              <input
                type="email"
                placeholder="E-mail"
                value={emailCadastro}
                onChange={e => setEmailCadastro(e.target.value)}
                className="w-full px-4 py-2 border rounded-xl text-xs bg-white text-gray-900"
                required
              />
              <input
                type="text"
                placeholder="Usuário"
                value={usuarioCadastro}
                onChange={e => setUsuarioCadastro(e.target.value)}
                className="w-full px-4 py-2 border rounded-xl text-xs bg-white text-gray-900"
                required
              />
              <input
                type="password"
                placeholder="Senha"
                value={senhaCadastro}
                onChange={e => setSenhaCadastro(e.target.value)}
                className="w-full px-4 py-2 border rounded-xl text-xs bg-white text-gray-900"
                required
              />
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={aceitouLgpd}
                  onChange={e => setAceitouLgpd(e.target.checked)}
                />
                <span className="text-[11px] text-gray-600">Aceito os termos da LGPD</span>
              </div>
              <button type="submit" className="w-full bg-[#0d824d] text-white py-3 rounded-full font-bold text-sm">
                Cadastrar
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // PREPARAÇÃO DE DADOS PARA COMPARAÇÃO
  const listaSelecionada = (Array.isArray(listas) ? listas : []).find(
    l => renderTexto(l?.id) === renderTexto(listaParaCompararId)
  ) || (Array.isArray(listas) ? listas[0] : null);

  const baseMercados = (Array.isArray(mercadosReais) && mercadosReais.length > 0) ? mercadosReais : [
    { id: 'm1', nome: 'SUPERMERCADO CARREFOUR', distancia: '1.2 km', fatorPreco: 0.98 },
    { id: 'm2', nome: 'SUPERMERCADO EXTRA', distancia: '2.5 km', fatorPreco: 1.02 }
  ];

  const itensDaListaAtiva = Array.isArray(listaSelecionada?.itens) ? listaSelecionada.itens : [];

  const totalBase = itensDaListaAtiva.reduce((acc, item) => {
    const preco = Number(item?.precoEstimado) || 8.5;
    const qtd = Number(item?.qtd) || 1;
    return acc + (preco * qtd);
  }, 0);

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
              {loadingListas ? (
                <p className="text-xs text-center text-gray-500 py-4">Carregando listas...</p>
              ) : (Array.isArray(listas) ? listas : []).map((lista, lIdx) => {
                const strId = renderTexto(lista.id, `lista_${lIdx}`);
                const estaAberta = !!listasAbertas[strId];
                const inputAtual = inputsItens[strId] || { nome: '', qtd: 1 };
                const itensLista = Array.isArray(lista.itens) ? lista.itens : [];

                return (
                  <div key={strId} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
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
                        <div className="flex justify-between items-center">
                          <button onClick={() => deletarLista(strId)} className="text-xs text-red-500 font-bold">
                            🗑️ Excluir Lista
                          </button>
                        </div>

                        <form onSubmit={(e) => adicionarItem(e, strId)} className="flex gap-2">
                          <input
                            type="text"
                            placeholder="NOME DO ITEM..."
                            value={inputAtual.nome}
                            onChange={e => handleInputItemChange(strId, 'nome', e.target.value)}
                            className="flex-1 px-3 py-1.5 border rounded-lg text-xs font-semibold uppercase bg-white text-gray-900"
                            required
                          />
                          <input
                            type="number"
                            min="1"
                            value={inputAtual.qtd}
                            onChange={e => handleInputItemChange(strId, 'qtd', e.target.value)}
                            className="w-14 px-2 py-1.5 border rounded-lg text-xs text-center font-bold bg-white text-gray-900"
                          />
                          <button type="submit" className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold">
                            + Add
                          </button>
                        </form>

                        <div className="divide-y bg-white rounded-xl border">
                          {itensLista.map((item, iIdx) => (
                            <div key={renderTexto(item.id, `item_${iIdx}`)} className="p-2.5 flex justify-between items-center text-xs">
                              <span className="font-bold text-gray-800">{renderTexto(item.nome)}</span>
                              <span className="text-gray-500 font-semibold">{renderTexto(item.qtd)}x</span>
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

        {/* TAB 2: COMPARAR */}
        {activeTab === 'comparar' && (
          <div className="space-y-4">
            <div className="bg-white p-3.5 rounded-2xl border space-y-3">
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
                📍 {loadingGeo ? 'Buscando...' : 'Buscar Mercados Próximos (GPS)'}
              </button>
            </div>

            <div className="space-y-2">
              {baseMercados.map((m, idx) => {
                const totalCalculado = (totalBase * (m.fatorPreco || 1)).toFixed(2);
                return (
                  <div key={renderTexto(m.id, `m_${idx}`)} className="bg-white p-4 rounded-2xl border flex justify-between items-center">
                    <div>
                      <h4 className="text-xs font-extrabold text-gray-800">{renderTexto(m.nome)}</h4>
                      <p className="text-[10px] text-gray-400">{renderTexto(m.distancia)}</p>
                    </div>
                    <span className="text-sm font-black text-emerald-600">R$ {totalCalculado}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: CUPONS */}
        {activeTab === 'cupons' && (
          <div className="space-y-4">
            <button onClick={abrirModalQr} className="w-full bg-purple-600 text-white font-bold py-3 rounded-2xl text-xs">
              📷 BIPAR NOVO QR CODE
            </button>

            <div className="space-y-2">
              {loadingCupons ? (
                <p className="text-xs text-center text-gray-500 py-4">Carregando cupons...</p>
              ) : (Array.isArray(historicoCupons) ? historicoCupons : []).map((c, idx) => (
                <div key={renderTexto(c.id, `c_${idx}`)} className="bg-white p-3 rounded-2xl border flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-800">{renderTexto(c.mercado, 'MERCADO')}</span>
                  <span className="text-[10px] text-gray-400">{renderTexto(c.data, 'Hoje')}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t z-40 px-4 py-2">
        <div className="max-w-md mx-auto flex justify-around">
          <button onClick={() => setActiveTab('listas')} className={`text-xs font-bold ${activeTab === 'listas' ? 'text-[#0d824d]' : 'text-gray-400'}`}>📋 Listas</button>
          <button onClick={() => setActiveTab('comparar')} className={`text-xs font-bold ${activeTab === 'comparar' ? 'text-[#0d824d]' : 'text-gray-400'}`}>📊 Comparar</button>
          <button onClick={() => setActiveTab('cupons')} className={`text-xs font-bold ${activeTab === 'cupons' ? 'text-[#0d824d]' : 'text-gray-400'}`}>🧾 Cupons</button>
        </div>
      </nav>

      {/* MODAL QR CODE RESTAURADO COM PASSO DE NOME FANTASIA */}
      {showQrModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-gray-800">
                {qrStep === 'scan' ? 'Escanear QR Code' : 'Informar Mercado'}
              </h3>
              <button onClick={fecharModalQr} className="text-gray-400 font-bold">✕</button>
            </div>

            {qrStep === 'scan' ? (
              <div className="space-y-3">
                <div id="reader" className="w-full min-h-[220px] bg-black rounded-xl overflow-hidden"></div>
                {cameraError && <p className="text-xs text-red-500 font-semibold text-center">{cameraError}</p>}
                
                <div className="pt-2 border-t space-y-2">
                  <label className="block text-[11px] text-gray-500 font-semibold">Ou digite/cole a URL da Nota Fiscal:</label>
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
                  <label className="block text-xs font-bold text-gray-700 mb-1">Nome Fantasia do Estabelecimento</label>
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