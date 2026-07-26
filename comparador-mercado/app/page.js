'use client';
import { useState, useEffect, useRef } from 'react';

export default function Home() {
  const [screen, setScreen] = useState('login');
  const [isLogged, setIsLogged] = useState(false);
  const [loadingListas, setLoadingListas] = useState(false);

  // Autenticação
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [cpf, setCpf] = useState('');
  const [aceitaLgpd, setAceitaLgpd] = useState(false);

  // Listas de Compras
  const [listas, setListas] = useState([]);
  const [listasAbertas, setListasAbertas] = useState({});
  const [novaListaNome, setNovaListaNome] = useState('');
  const [inputsItens, setInputsItens] = useState({});

  // Comparação
  const [listaParaCompararId, setListaParaCompararId] = useState(null);
  const [historicoCupons, setHistoricoCupons] = useState([]);

  // Modais
  const [showQrModal, setShowQrModal] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [qrUrl, setQrUrl] = useState('');
  const html5QrCodeRef = useRef(null);

  const [showNomeFantasiaModal, setShowNomeFantasiaModal] = useState(false);
  const [nomeFantasiaInput, setNomeFantasiaInput] = useState('');
  const [cupomPendente, setCupomPendente] = useState(null);

  const [usandoGeo, setUsandoGeo] = useState(false);
  const [loadingGeo, setLoadingGeo] = useState(false);
  const [mercadosReais, setMercadosReais] = useState([]);
  const [mercadoExpandido, setMercadoExpandido] = useState(null);

  const obterMarcaParaItem = (nomeItem) => {
    const itemUpper = (nomeItem || '').toUpperCase();
    if (itemUpper.includes('ARROZ')) return 'CAMIL';
    if (itemUpper.includes('FEIJÃO') || itemUpper.includes('FEIJAO')) return 'KICALDO';
    if (itemUpper.includes('LEITE')) return 'NINHO';
    if (itemUpper.includes('CAFÉ') || itemUpper.includes('CAFE')) return 'PILÃO';
    return 'MARCA PADRÃO';
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
            <p className="text-gray-600 text-sm font-medium">Faça login para salvar suas listas no banco Neon</p>
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

  return (
    <div className="min-h-screen bg-[#f4f6f8] p-4 sm:p-6 font-sans">
      <div className="max-w-3xl mx-auto space-y-4">
        <header className="flex justify-between items-center bg-white px-4 py-3 rounded-2xl shadow-sm border">
          <h1 className="text-base sm:text-lg font-extrabold text-[#0d824d] flex items-center gap-1.5">
            🛒 TÁ QUANTO?
          </h1>
          <div className="flex items-center gap-3">
            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
              👤 {usuario.toUpperCase()}
            </span>
            <button onClick={handleLogout} className="text-xs font-bold text-red-500 hover:underline">
              Sair
            </button>
          </div>
        </header>

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
                            <span className={`text-xs font-bold ${item.marcado ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                              {item.nome}
                            </span>
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
      </div>
    </div>
  );
}