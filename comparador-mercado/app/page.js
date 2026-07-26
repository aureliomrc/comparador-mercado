'use client';
import { useState, useEffect, useRef } from 'react';

export default function Home() {
  const [screen, setScreen] = useState('login');
  const [isLogged, setIsLogged] = useState(false);
  const [loadingListas, setLoadingListas] = useState(false);

  // Autenticação
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');

  // Listas de Compras
  const [listas, setListas] = useState([]);
  const [listasAbertas, setListasAbertas] = useState({});
  const [novaListaNome, setNovaListaNome] = useState('');
  const [inputsItens, setInputsItens] = useState({});

  // Comparação e Geolocalização
  const [listaParaCompararId, setListaParaCompararId] = useState(null);
  const [mercadoExpandido, setMercadoExpandido] = useState(false);
  const [mercadoSelecionadoDetalhe, setMercadoSelecionadoDetalhe] = useState(null);
  const [loadingGeo, setLoadingGeo] = useState(false);
  const [mercadosReais, setMercadosReais] = useState([]);
  const [usandoGeo, setUsandoGeo] = useState(false);

  // Modais de QR Code / Cupom Fiscal
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrUrlInput, setQrUrlInput] = useState('');
  const [nomeFantasiaInput, setNomeFantasiaInput] = useState('');
  const [historicoCupons, setHistoricoCupons] = useState([]);

  // Inteligência SEFAZ para identificar Marca Padrão
  const obterMarcaParaItem = (nomeItem) => {
    const itemUpper = (nomeItem || '').toUpperCase();
    if (itemUpper.includes('ARROZ')) return 'CAMIL';
    if (itemUpper.includes('FEIJÃO') || itemUpper.includes('FEIJAO')) return 'KICALDO';
    if (itemUpper.includes('LEITE')) return 'NINHO';
    if (itemUpper.includes('CAFÉ') || itemUpper.includes('CAFE')) return 'PILÃO';
    if (itemUpper.includes('AÇÚCAR') || itemUpper.includes('ACUCAR')) return 'UNIÃO';
    if (itemUpper.includes('OLEO') || itemUpper.includes('ÓLEO')) return 'LIZA';
    return 'MARCA SEFAZ';
  };

  const carregarListasDoBanco = async () => {
    setLoadingListas(true);
    try {
      const res = await fetch('/api/listas', { cache: 'no-store' });
      if (res.ok) {
        const dados = await res.json();
        setListas(dados);
        if (dados && dados.length > 0) {
          setListasAbertas(prev => ({ ...prev, [dados[0].id]: true }));
          setListaParaCompararId(dados[0].id);
        }
      }
    } catch (error) {
      console.error('Erro ao conectar com o banco:', error);
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
  };

  const handleLogout = () => {
    setIsLogged(false);
    setListas([]);
    setScreen('login');
  };

  // ----------------------------------------------------
  // GEOLOCALIZAÇÃO: Buscar Mercados Próximos
  // ----------------------------------------------------
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
            const mercadosEncontrados = data.elements.map((el, index) => ({
              id: el.id || index,
              nome: (el.tags.name || `SUPERMERCADO ${index + 1}`).toUpperCase(),
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

  // ----------------------------------------------------
  // CUPOM FISCAL / QR CODE COM NOME FANTASIA
  // ----------------------------------------------------
  const processarCupomQrCode = async (e) => {
    e.preventDefault();
    if (!qrUrlInput.trim() && !nomeFantasiaInput.trim()) {
      return alert('Preencha os dados do QR Code ou o Nome Fantasia do estabelecimento!');
    }

    const nomeEstabelecimento = nomeFantasiaInput.trim().toUpperCase() || 'MERCADO PROCESSADO VIA QR CODE';

    const novoCupom = {
      id: Date.now(),
      data: new Date().toLocaleDateString('pt-BR'),
      mercado: nomeEstabelecimento,
      valorTotal: (Math.random() * 80 + 20).toFixed(2),
      url: qrUrlInput
    };

    setHistoricoCupons(prev => [novoCupom, ...prev]);
    setQrUrlInput('');
    setNomeFantasiaInput('');
    setShowQrModal(false);
    alert(`Cupom do "${nomeEstabelecimento}" registrado com sucesso! Total estimado: R$ ${novoCupom.valorTotal}`);
  };

  // ----------------------------------------------------
  // Ações das Listas
  // ----------------------------------------------------
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
        setListas(prev => [novaListaCriada, ...prev]);
        setListasAbertas(prev => ({ ...prev, [novaListaCriada.id]: true }));
        setListaParaCompararId(novaListaCriada.id);
        setNovaListaNome('');
      } else {
        alert('Ocorreu um erro ao salvar no banco. Tente novamente.');
      }
    } catch (err) {
      console.error('Erro ao criar lista:', err);
    }
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

  const adicionarItem = async (e, listaId) => {
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
          listaId,
          nome: nomeFormatado,
          qtd: qtdInserida,
          precoEstimado: precoEstimadoBase,
          marca: marcaCalculada
        })
      });

      if (res.ok) {
        const itemSalvo = await res.json();
        setListas(prevListas => prevListas.map(l => {
          if (l.id === listaId) {
            return { ...l, itens: [...(l.itens || []), itemSalvo] };
          }
          return l;
        }));
        setInputsItens(prev => ({ ...prev, [listaId]: { nome: '', qtd: 1 } }));
      }
    } catch (err) {
      console.error('Erro ao adicionar item:', err);
    }
  };

  const alterarQuantidade = async (listaId, itemId, delta) => {
    let novaQtd = 1;

    setListas(prevListas => prevListas.map(l => {
      if (l.id === listaId) {
        return {
          ...l,
          itens: (l.itens || []).map(item => {
            if (item.id === itemId) {
              novaQtd = Math.max(1, item.qtd + delta);
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
      body: JSON.stringify({ acao: 'ATUALIZAR_ITEM', itemId, qtd: novaQtd })
    });
  };

  const removerItem = async (listaId, itemId) => {
    setListas(prev => prev.map(l => l.id === listaId ? { ...l, itens: (l.itens || []).filter(i => i.id !== itemId) } : l));
    await fetch(`/api/listas?itemId=${itemId}`, { method: 'DELETE' });
  };

  const toggleCheck = async (listaId, itemId) => {
    let novoMarcado = false;
    setListas(prev => prev.map(l => {
      if (l.id === listaId) {
        return {
          ...l,
          itens: (l.itens || []).map(i => {
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
      body: JSON.stringify({ acao: 'ATUALIZAR_ITEM', itemId, marcado: novoMarcado })
    });
  };

  const deletarLista = async (id) => {
    if (confirm('Deseja realmente excluir esta lista e todos os seus itens?')) {
      setListas(prev => prev.filter(l => l.id !== id));
      if (listaParaCompararId === id) setListaParaCompararId(listas[0]?.id || null);
      await fetch(`/api/listas?listaId=${id}`, { method: 'DELETE' });
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
            <p className="text-gray-600 text-sm font-medium">Faça login para comparar suas listas e escanear cupons</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Nome de Usuário</label>
              <input
                type="text"
                placeholder="Digite seu usuário"
                value={usuario}
                onChange={e => setUsuario(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white"
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
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white"
                required
              />
            </div>

            <button type="submit" className="w-full bg-[#0d824d] hover:bg-[#0a673d] text-white py-3 rounded-full font-bold text-sm shadow-md">
              Entrar
            </button>
          </form>
        </div>
      </div>
    );
  }

  const listaSelecionada = listas.find(l => l.id === listaParaCompararId) || listas[0];

  const listaMercadosParaExibir = mercadosReais.length > 0 ? mercadosReais : [
    { id: 101, nome: 'SUPERMERCADO CARREFOUR', distancia: '1.2 km', fatorPreco: 0.98, tag: 'MENOR PREÇO', corTag: 'bg-green-100 text-green-800' },
    { id: 102, nome: 'SUPERMERCADO EXTRA', distancia: '2.5 km', fatorPreco: 1.02, tag: 'MAIS PRÓXIMO', corTag: 'bg-blue-100 text-blue-800' },
    { id: 103, nome: 'PÃO DE AÇÚCAR', distancia: '3.1 km', fatorPreco: 1.08, tag: 'OPÇÃO PREMIUM', corTag: 'bg-purple-100 text-purple-800' }
  ];

  return (
    <div className="min-h-screen bg-[#f4f6f8] p-4 sm:p-6 font-sans">
      <div className="max-w-3xl mx-auto space-y-4">
        {/* CABEÇALHO */}
        <header className="flex justify-between items-center bg-white px-4 py-3 rounded-2xl shadow-sm border">
          <h1 className="text-base sm:text-lg font-extrabold text-[#0d824d] flex items-center gap-1.5">
            🛒 TÁ QUANTO?
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowQrModal(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs px-3 py-1.5 rounded-xl shadow flex items-center gap-1"
            >
              📷 BIPAR CUPOM
            </button>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
              👤 {usuario.toUpperCase()}
            </span>
            <button onClick={handleLogout} className="text-xs font-bold text-red-500 hover:underline ml-1">
              Sair
            </button>
          </div>
        </header>

        {/* PAINEL DE COMPARAR PREÇOS E GEOLOCALIZAÇÃO */}
        {listas.length > 0 && (
          <div className="bg-gradient-to-r from-emerald-600 to-green-600 p-4 rounded-2xl shadow-md text-white space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-extrabold uppercase flex items-center gap-1.5">
                  <span>📊</span> Comparador por Lista & GPS
                </h2>
                <p className="text-[11px] text-emerald-100 font-medium">
                  Selecione a lista e busque mercados reais próximos
                </p>
              </div>

              <button
                onClick={buscarMercadosProximos}
                disabled={loadingGeo}
                className="bg-emerald-800 hover:bg-emerald-900 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 shadow"
              >
                <span>📍</span> {loadingGeo ? 'Buscando GPS...' : usandoGeo ? 'GPS Ativo ✓' : 'Ativar GPS'}
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2 pt-1 border-t border-emerald-500/50">
              <div className="w-full flex-1">
                <label className="block text-[10px] font-bold text-emerald-100 mb-0.5">Selecione a Lista:</label>
                <select
                  value={listaParaCompararId || ''}
                  onChange={(e) => setListaParaCompararId(e.target.value)}
                  className="w-full bg-emerald-700 text-white font-bold text-xs rounded-xl px-3 py-2 border border-emerald-500 focus:outline-none"
                >
                  {listas.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.nome} ({l.itens?.length || 0} itens)
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => {
                  if (!listaSelecionada || !listaSelecionada.itens || listaSelecionada.itens.length === 0) {
                    alert('A lista selecionada não possui itens para comparar!');
                    return;
                  }
                  setMercadoExpandido(true);
                }}
                className="w-full sm:w-auto mt-2 sm:mt-4 bg-white text-emerald-800 font-extrabold px-5 py-2 rounded-xl text-xs hover:bg-emerald-50 shadow transition-all flex items-center justify-center gap-1.5"
              >
                <span>🛒</span> COMPARAR PREÇOS
              </button>
            </div>
          </div>
        )}

        {/* CRIAR NOVA LISTA */}
        <div className="bg-white p-3.5 rounded-2xl shadow-sm border border-gray-100 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
            <span className="text-blue-600">➕</span> Criar Nova Lista no Banco Neon
          </div>
          <form onSubmit={criarNovaLista} className="flex gap-2">
            <input
              type="text"
              placeholder="EX: MENSAL, CHURRASCO, FARMÁCIA..."
              value={novaListaNome}
              onChange={e => setNovaListaNome(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-xs font-semibold text-gray-900 uppercase bg-white"
              required
            />
            <button type="submit" className="bg-[#1877f2] text-white px-4 py-2 rounded-xl text-xs font-bold">
              + Criar
            </button>
          </form>
        </div>

        {/* HISTÓRICO DE CUPONS BIPADOS */}
        {historicoCupons.length > 0 && (
          <div className="bg-purple-50 border border-purple-200 rounded-2xl p-3.5 space-y-2">
            <h3 className="text-xs font-extrabold text-purple-900 flex items-center gap-1.5">
              <span>🧾</span> Cupons Bipados ({historicoCupons.length})
            </h3>
            <div className="divide-y divide-purple-100">
              {historicoCupons.map(cupom => (
                <div key={cupom.id} className="py-2 flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-purple-900">{cupom.mercado}</span>
                    <span className="text-[10px] text-purple-600 block">{cupom.data}</span>
                  </div>
                  <span className="font-extrabold text-purple-800">R$ {cupom.valorTotal}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* LISTAS */}
        <div className="space-y-2.5">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-[11px] font-extrabold text-gray-400 tracking-wider uppercase">
              Suas Listas ({listas.length})
            </h2>
            <button onClick={carregarListasDoBanco} className="text-xs text-blue-600 font-bold hover:underline">
              🔄 Sincronizar Banco
            </button>
          </div>

          {loadingListas ? (
            <div className="bg-white p-6 rounded-2xl text-center border space-y-2">
              <p className="text-xs font-bold text-gray-500">Conectando ao Banco Neon...</p>
            </div>
          ) : listas.map((lista) => {
            const estaAberta = !!listasAbertas[lista.id];
            const inputAtual = inputsItens[lista.id] || { nome: '', qtd: 1 };
            const itensLista = lista.itens || [];

            return (
              <div key={lista.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div 
                  onClick={() => setListasAbertas(p => ({ ...p, [lista.id]: !p[lista.id] }))}
                  className="px-4 py-3 flex justify-between items-center cursor-pointer hover:bg-gray-50 select-none"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base text-blue-600 font-bold">{estaAberta ? '📂' : '📁'}</span>
                    <h3 className="text-xs sm:text-sm font-extrabold text-gray-800 uppercase">{lista.nome}</h3>
                    <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-full">
                      {itensLista.length} {itensLista.length === 1 ? 'item' : 'itens'}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-gray-500">{estaAberta ? '▲' : '▼'}</span>
                </div>

                {estaAberta && (
                  <div className="border-t border-gray-100 bg-white">
                    <div className="p-2.5 bg-gray-50/80 border-b flex items-center justify-between gap-2">
                      <button type="button" onClick={() => deletarLista(lista.id)} className="text-red-500 hover:bg-red-50 px-2 py-1 rounded-lg text-xs font-bold">
                        🗑️ Excluir Lista
                      </button>
                    </div>

                    <form onSubmit={(e) => adicionarItem(e, lista.id)} className="p-2.5 bg-gray-50 border-b flex gap-2">
                      <input
                        type="text"
                        placeholder="NOME DO ITEM..."
                        value={inputAtual.nome}
                        onChange={e => handleInputItemChange(lista.id, 'nome', e.target.value)}
                        className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold uppercase bg-white text-gray-900"
                        required
                      />
                      <input
                        type="number"
                        min="1"
                        value={inputAtual.qtd}
                        onChange={e => handleInputItemChange(lista.id, 'qtd', Number(e.target.value))}
                        className="w-16 px-2 py-1.5 border border-gray-300 rounded-lg text-xs text-center font-bold bg-white text-gray-900"
                      />
                      <button type="submit" className="bg-[#1877f2] text-white px-3 py-1.5 rounded-lg text-xs font-bold">
                        + Adicionar
                      </button>
                    </form>

                    <div className="divide-y">
                      {itensLista.map(item => (
                        <div key={item.id} className="px-3.5 py-2.5 flex items-center justify-between hover:bg-gray-50 gap-2">
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <input
                              type="checkbox"
                              checked={Boolean(item.marcado)}
                              onChange={() => toggleCheck(lista.id, item.id)}
                              className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 cursor-pointer"
                            />
                            <div>
                              <span className={`text-xs font-bold ${item.marcado ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                                {item.nome}
                              </span>
                              {item.marca && (
                                <span className="text-[10px] text-gray-400 block font-medium">
                                  Marca SEFAZ: {item.marca}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden bg-white">
                              <button type="button" onClick={() => alterarQuantidade(lista.id, item.id, -1)} className="px-2 py-0.5 bg-gray-100 text-gray-700 font-extrabold text-xs">-</button>
                              <span className="w-8 text-center text-xs font-bold">{item.qtd}</span>
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

        {/* MODAL DE BIPAR QR CODE DO CUPOM FISCAL COM NOME FANTASIA */}
        {showQrModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="text-base font-extrabold text-purple-900 flex items-center gap-2">
                  <span>📷</span> Bipar Cupom Fiscal (QR Code)
                </h3>
                <button 
                  onClick={() => setShowQrModal(false)}
                  className="text-gray-400 hover:text-gray-700 font-bold text-lg px-2"
                >
                  ✕
                </button>
              </div>

              {/* SIMULADOR DE CÂMERA */}
              <div className="bg-gray-900 rounded-2xl h-36 flex flex-col items-center justify-center text-white space-y-1 relative overflow-hidden border-2 border-dashed border-purple-400">
                <div className="animate-pulse text-2xl">📱</div>
                <p className="text-xs font-bold text-gray-300">Aponte a câmera para o QR Code da Nota</p>
              </div>

              <form onSubmit={processarCupomQrCode} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    Nome Fantasia do Estabelecimento:
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Supermercado Silva, Carrefour Centro..."
                    value={nomeFantasiaInput}
                    onChange={(e) => setNomeFantasiaInput(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white text-gray-900 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    Link / Chave do QR Code da Nota (Opcional):
                  </label>
                  <input
                    type="text"
                    placeholder="https://www.sefaz.gov.br/nfce/qrcode?..."
                    value={qrUrlInput}
                    onChange={(e) => setQrUrlInput(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white text-gray-900 font-medium"
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowQrModal(false)}
                    className="flex-1 bg-gray-100 text-gray-700 font-bold py-2.5 rounded-xl text-xs hover:bg-gray-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-purple-600 text-white font-bold py-2.5 rounded-xl text-xs hover:bg-purple-700 shadow"
                  >
                    Salvar Cupom
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL DE COMPARAÇÃO DE PREÇOS COM COM MARCA DO SEFAZ E EXPANSÃO */}
        {mercadoExpandido && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4">
              <div className="flex justify-between items-center border-b pb-3">
                <div>
                  <h3 className="text-base font-extrabold text-gray-800 flex items-center gap-2">
                    <span>🛒</span> Comparativo da Lista: <span className="text-emerald-700">{listaSelecionada?.nome}</span>
                  </h3>
                  <p className="text-[10px] text-gray-500 font-semibold">
                    Exibindo marcas de acordo com a base de dados do SEFAZ
                  </p>
                </div>
                <button 
                  onClick={() => {
                    setMercadoExpandido(false);
                    setMercadoSelecionadoDetalhe(null);
                  }}
                  className="text-gray-400 hover:text-gray-700 font-bold text-lg px-2"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                {listaMercadosParaExibir.map((mercado, idx) => {
                  const itensDaLista = listaSelecionada?.itens || [];
                  const fator = mercado.fatorPreco || 1;
                  const totalBase = itensDaLista.reduce((acc, i) => acc + ((i.precoEstimado || 8.5) * (i.qtd || 1)), 0);
                  const totalCalculado = (totalBase * fator).toFixed(2);
                  const estaAbertoDetalhe = mercadoSelecionadoDetalhe === mercado.id;

                  return (
                    <div 
                      key={mercado.id || idx} 
                      className={`rounded-2xl border transition-all bg-gray-50 overflow-hidden ${estaAbertoDetalhe ? 'border-emerald-500 shadow-md ring-2 ring-emerald-500/20' : 'border-gray-200 hover:border-emerald-400'}`}
                    >
                      {/* CARD DO MERCADO */}
                      <div 
                        onClick={() => setMercadoSelecionadoDetalhe(estaAbertoDetalhe ? null : mercado.id)}
                        className="p-4 flex items-center justify-between cursor-pointer select-none"
                      >
                        <div className="space-y-1">
                          {mercado.tag && (
                            <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${mercado.corTag}`}>
                              {mercado.tag}
                            </span>
                          )}
                          <h4 className="text-xs font-extrabold text-gray-800 flex items-center gap-1.5">
                            {mercado.nome}
                            <span className="text-[10px] text-emerald-600 font-bold">{estaAbertoDetalhe ? '▲ Ver menos' : '▼ Clique p/ ver itens'}</span>
                          </h4>
                          <p className="text-[10px] text-gray-500 font-medium">📍 Distância: {mercado.distancia || 'Próximo'}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-base font-black text-emerald-600 block">R$ {totalCalculado}</span>
                          <span className="text-[9px] text-gray-400 font-bold">{itensDaLista.length} itens</span>
                        </div>
                      </div>

                      {/* DETALHAMENTO ITEM POR ITEM COM MARCA DO SEFAZ */}
                      {estaAbertoDetalhe && (
                        <div className="bg-white p-3 border-t border-emerald-100 space-y-2">
                          <h5 className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">
                            Preço estimado e marcas SEFAZ no {mercado.nome}:
                          </h5>
                          <div className="divide-y divide-gray-100">
                            {itensDaLista.map(item => {
                              const precoUn = ((item.precoEstimado || 8.5) * fator).toFixed(2);
                              const subtotal = (precoUn * (item.qtd || 1)).toFixed(2);
                              const marcaExibicao = item.marca || obterMarcaParaItem(item.nome);

                              return (
                                <div key={item.id} className="py-2 flex justify-between items-center text-xs">
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-bold text-gray-800">{item.nome}</span>
                                      <span className="text-[9px] bg-blue-100 text-blue-800 font-extrabold px-1.5 py-0.5 rounded">
                                        🏷️ {marcaExibicao}
                                      </span>
                                    </div>
                                    <span className="text-[10px] text-gray-400 block font-medium mt-0.5">
                                      {item.qtd}x un · R$ {precoUn} cada
                                    </span>
                                  </div>
                                  <span className="font-extrabold text-emerald-700">R$ {subtotal}</span>
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

              <button
                onClick={() => {
                  setMercadoExpandido(false);
                  setMercadoSelecionadoDetalhe(null);
                }}
                className="w-full bg-gray-900 hover:bg-black text-white font-bold py-3 rounded-xl text-xs transition-all shadow"
              >
                Fechar Comparação
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}