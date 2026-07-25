'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plus, ShoppingCart, Trash2, CheckCircle2, Circle, 
  ChevronDown, ChevronUp, ArrowRightLeft, Sparkles, LogOut, User 
} from 'lucide-react';

export default function Home() {
  const [listas, setListas] = useState([]);
  const [novaListaNome, setNovaListaNome] = useState('');
  const [inputsItens, setInputsItens] = useState({});
  const [listasAbertas, setListasAbertas] = useState({});
  const [listaParaCompararId, setListaParaCompararId] = useState('');
  const [carregando, setCarregando] = useState(true);

  // --- CARREGAR DADOS DO BANCO NEON VIA API ---
  const carregarListas = async () => {
    try {
      const res = await fetch('/api/listas');
      if (res.ok) {
        const dados = await res.json();
        setListas(dados);
        if (dados.length > 0 && Object.keys(listasAbertas).length === 0) {
          setListasAbertas({ [dados[0].id]: true });
          setListaParaCompararId(dados[0].id);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar listas:', error);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarListas();
  }, []);

  // Auxiliar para gerar marcas automáticas
  const obterMarcaParaItem = (nome) => {
    const nomeUpper = nome.toUpperCase();
    if (nomeUpper.includes('ARROZ')) return 'TIO JOÃO';
    if (nomeUpper.includes('FEIJÃO') || nomeUpper.includes('FEIJAO')) return 'CAMIL';
    if (nomeUpper.includes('LEITE')) return 'NINHO';
    if (nomeUpper.includes('OVO')) return 'MANTIQUEIRA';
    if (nomeUpper.includes('ÓLEO') || nomeUpper.includes('OLEO')) return 'LIZA';
    if (nomeUpper.includes('CAFÉ') || nomeUpper.includes('CAFE')) return 'PILÃO';
    if (nomeUpper.includes('AÇÚCAR') || nomeUpper.includes('ACUCAR')) return 'UNIÃO';
    return 'PADRÃO';
  };

  // --- 1. CRIAR NOVA LISTA ---
  const criarNovaLista = async (e) => {
    e.preventDefault();
    if (!novaListaNome.trim()) return;

    try {
      const res = await fetch('/api/listas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: novaListaNome })
      });

      if (res.ok) {
        const novaLista = await res.json();
        setListas([novaLista, ...listas]);
        setListasAbertas(prev => ({ ...prev, [novaLista.id]: true }));
        setNovaListaNome('');
      }
    } catch (error) {
      alert('Erro ao criar lista.');
    }
  };

  // --- 2. DELETAR LISTA ---
  const deletarLista = async (listaId) => {
    if (!confirm('Deseja realmente apagar esta lista?')) return;

    setListas(listas.filter(l => l.id !== listaId));
    await fetch(`/api/listas?listaId=${listaId}`, { method: 'DELETE' });
  };

  // --- 3. ADICIONAR ITEM À LISTA ---
  const adicionarItem = async (e, listaId) => {
    e.preventDefault();
    const input = inputsItens[listaId];
    if (!input || !input.nome || !input.nome.trim()) return;

    const nomeFormatado = input.nome.toUpperCase();
    const marcaCalculada = obterMarcaParaItem(nomeFormatado);
    const precoEstimado = (Math.random() * 15 + 3).toFixed(2);

    try {
      const res = await fetch('/api/listas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ação: 'ADICIONAR_ITEM',
          listaId,
          nome: nomeFormatado,
          qtd: input.qtd || 1,
          precoEstimado,
          marca: marcaCalculada
        })
      });

      if (res.ok) {
        const novoItem = await res.json();
        setListas(listas.map(l => l.id === listaId ? { ...l, itens: [...l.itens, novoItem] } : l));
        setInputsItens(prev => ({ ...prev, [listaId]: { nome: '', qtd: 1 } }));
      }
    } catch (error) {
      alert('Erro ao adicionar item.');
    }
  };

  // --- 4. ALTERAR QUANTIDADE DE UM ITEM ---
  const alterarQuantidade = async (listaId, itemId, delta) => {
    let novaQtd = 1;

    setListas(listas.map(l => {
      if (l.id === listaId) {
        return {
          ...l,
          itens: l.itens.map(item => {
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
      body: JSON.stringify({ ação: 'ATUALIZAR_ITEM', itemId, qtd: novaQtd })
    });
  };

  // --- 5. MARCAR / DESMARCAR ITEM (CHECKBOX) ---
  const toggleItemMarcado = async (listaId, itemId) => {
    let novoMarcado = false;

    setListas(listas.map(l => {
      if (l.id === listaId) {
        return {
          ...l,
          itens: l.itens.map(item => {
            if (item.id === itemId) {
              novoMarcado = !item.marcado;
              return { ...item, marcado: novoMarcado };
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
      body: JSON.stringify({ ação: 'ATUALIZAR_ITEM', itemId, marcado: novoMarcado })
    });
  };

  // --- 6. REMOVER ITEM DA LISTA ---
  const removerItem = async (listaId, itemId) => {
    setListas(listas.map(l => l.id === listaId ? { ...l, itens: l.itens.filter(i => i.id !== itemId) } : l));
    await fetch(`/api/listas?itemId=${itemId}`, { method: 'DELETE' });
  };

  // --- CONTROLES DE INTERFACE ---
  const toggleListaAberta = (listaId) => {
    setListasAbertas(prev => ({ ...prev, [listaId]: !prev[listaId] }));
  };

  const handleInputChange = (listaId, field, value) => {
    setInputsItens(prev => ({
      ...prev,
      [listaId]: {
        ...prev[listaId],
        [field]: value
      }
    }));
  };

  // Métricas para a tela
  const listaComparada = listas.find(l => l.id === listaParaCompararId) || listas[0];
  const totalEstimado = listaComparada ? listaComparada.itens.reduce((acc, i) => acc + (i.precoEstimado * i.qtd), 0) : 0;

  if (carregando) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <p className="animate-pulse">Carregando suas listas...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* CABEÇALHO DA APLICAÇÃO */}
        <header className="flex justify-between items-center bg-slate-800/80 p-4 rounded-xl border border-slate-700 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent">
                Comparador de Mercado
              </h1>
              <p className="text-xs text-slate-400">Sincronizado via Banco Neon</p>
            </div>
          </div>
        </header>

        {/* CADASTRAR NOVA LISTA */}
        <section className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/60">
          <form onSubmit={criarNovaLista} className="flex gap-2">
            <input
              type="text"
              placeholder="Nome da nova lista (ex: Feira da Semana, Churrasco...)"
              value={novaListaNome}
              onChange={(e) => setNovaListaNome(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
            />
            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" /> Criar Lista
            </button>
          </form>
        </section>

        {/* PAINEL DE COMPARADOR RÁPIDO */}
        {listas.length > 0 && (
          <section className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <div className="flex items-center gap-2 text-emerald-400 font-medium text-sm">
                <Sparkles className="w-4 h-4" />
                <span>Resumo da Lista Ativa</span>
              </div>
              <select 
                value={listaParaCompararId} 
                onChange={(e) => setListaParaCompararId(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-md text-xs px-2 py-1 text-slate-300"
              >
                {listas.map(l => (
                  <option key={l.id} value={l.id}>{l.nome}</option>
                ))}
              </select>
            </div>

            {listaComparada && (
              <div className="flex justify-between items-center text-sm pt-1">
                <span className="text-slate-400">Total Estimado ({listaComparada.itens.length} itens):</span>
                <span className="text-lg font-bold text-emerald-400">R$ {totalEstimado.toFixed(2)}</span>
              </div>
            )}
          </section>
        )}

        {/* EXIBIÇÃO DAS LISTAS */}
        <main className="space-y-4">
          {listas.length === 0 ? (
            <div className="text-center py-12 text-slate-500 border border-dashed border-slate-800 rounded-xl">
              Nenhuma lista criada ainda. Crie uma acima para começar!
            </div>
          ) : (
            listas.map(lista => {
              const estaAberta = listasAbertas[lista.id];
              const inputAtual = inputsItens[lista.id] || { nome: '', qtd: 1 };

              return (
                <div key={lista.id} className="bg-slate-800/40 rounded-xl border border-slate-700/80 overflow-hidden">
                  
                  {/* BARRA DE TÍTULO DA LISTA */}
                  <div className="p-4 bg-slate-800/90 flex items-center justify-between border-b border-slate-700/50">
                    <button 
                      onClick={() => toggleListaAberta(lista.id)}
                      className="flex items-center gap-3 text-left font-semibold hover:text-emerald-400 transition-colors"
                    >
                      {estaAberta ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                      <span>{lista.nome}</span>
                      <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full font-normal">
                        {lista.itens.length}
                      </span>
                    </button>

                    <button 
                      onClick={() => deletarLista(lista.id)}
                      className="text-slate-500 hover:text-red-400 p-1.5 transition-colors"
                      title="Apagar Lista"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* CONTEÚDO DA LISTA QUANDO EXPANDIDA */}
                  {estaAberta && (
                    <div className="p-4 space-y-4">
                      
                      {/* FORMULÁRIO DE ADICIONAR ITEM */}
                      <form onSubmit={(e) => adicionarItem(e, lista.id)} className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Nome do produto..."
                          value={inputAtual.nome || ''}
                          onChange={(e) => handleInputChange(lista.id, 'nome', e.target.value)}
                          className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-emerald-500"
                        />
                        <input
                          type="number"
                          min="1"
                          value={inputAtual.qtd || 1}
                          onChange={(e) => handleInputChange(lista.id, 'qtd', parseInt(e.target.value) || 1)}
                          className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:border-emerald-500"
                        />
                        <button
                          type="submit"
                          className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                        >
                          + Adicionar
                        </button>
                      </form>

                      {/* TABELA / LISTA DE ITENS */}
                      <div className="space-y-2">
                        {lista.itens.length === 0 ? (
                          <p className="text-xs text-slate-500 text-center py-4">Nenhum item adicionado a esta lista.</p>
                        ) : (
                          lista.itens.map(item => (
                            <div 
                              key={item.id}
                              className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                                item.marcado 
                                  ? 'bg-slate-900/40 border-slate-800/80 text-slate-500 line-through' 
                                  : 'bg-slate-800/60 border-slate-700/50 text-slate-200'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <button onClick={() => toggleItemMarcado(lista.id, item.id)} className="text-slate-400 hover:text-emerald-400">
                                  {item.marcado ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Circle className="w-5 h-5" />}
                                </button>
                                <div>
                                  <p className="text-sm font-medium">{item.nome}</p>
                                  <span className="text-[10px] bg-slate-700/50 px-1.5 py-0.5 rounded text-slate-400">
                                    {item.marca}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-4">
                                {/* SELETOR DE QUANTIDADE */}
                                <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg">
                                  <button 
                                    type="button" 
                                    onClick={() => alterarQuantidade(lista.id, item.id, -1)}
                                    className="px-2 py-0.5 text-xs text-slate-400 hover:text-white"
                                  >
                                    -
                                  </button>
                                  <span className="px-2 text-xs font-semibold">{item.qtd}</span>
                                  <button 
                                    type="button" 
                                    onClick={() => alterarQuantidade(lista.id, item.id, 1)}
                                    className="px-2 py-0.5 text-xs text-slate-400 hover:text-white"
                                  >
                                    +
                                  </button>
                                </div>

                                {/* PREÇO ESTIMADO */}
                                <span className="text-sm font-semibold text-emerald-400 min-w-[60px] text-right">
                                  R$ {(item.precoEstimado * item.qtd).toFixed(2)}
                                </span>

                                {/* DELETAR ITEM */}
                                <button 
                                  onClick={() => removerItem(lista.id, item.id)}
                                  className="text-slate-500 hover:text-red-400 p-1"
                                >
                                  <Trash2 className="w-4 h-4" />
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
            })
          )}
        </main>

      </div>
    </div>
  );
}