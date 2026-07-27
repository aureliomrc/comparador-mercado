'use client';
import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

export default function Home() {
  const [screen, setScreen] = useState('login');
  const [activeTab, setActiveTab] = useState('listas'); // 'listas' | 'comparar' | 'historico'
  const [isLogged, setIsLogged] = useState(false);

  // Estados dos dados
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [listas, setListas] = useState([]);
  const [listaSelecionadaId, setListaSelecionadaId] = useState(null);
  const [novaListaNome, setNovaListaNome] = useState('');
  const [novoItemNome, setNovoItemNome] = useState('');
  const [novoItemQtd, setNovoItemQtd] = useState(1);
  const [historicoCupons, setHistoricoCupons] = useState([]);

  // Modais leves apenas para Leitor QR
  const [showQrModal, setShowQrModal] = useState(false);
  const qrScannerRef = useRef(null);

  const obterMarcaParaItem = (nomeItem) => {
    const itemUpper = (nomeItem || '').toUpperCase();
    if (itemUpper.includes('ARROZ')) return 'CAMIL';
    if (itemUpper.includes('FEIJÃO') || itemUpper.includes('FEIJAO')) return 'KICALDO';
    if (itemUpper.includes('LEITE')) return 'NINHO';
    if (itemUpper.includes('CAFÉ') || itemUpper.includes('CAFE')) return 'PILÃO';
    return 'MARCA SEFAZ';
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (!usuario.trim()) return;
    setIsLogged(true);
    setScreen('dashboard');
  };

  const criarNovaLista = (e) => {
    e.preventDefault();
    if (!novaListaNome.trim()) return;
    const nova = { id: Date.now(), nome: novaListaNome.toUpperCase(), itens: [] };
    setListas([nova, ...listas]);
    setListaSelecionadaId(nova.id);
    setNovaListaNome('');
  };

  const adicionarItem = (e) => {
    e.preventDefault();
    if (!novoItemNome.trim() || !listaSelecionadaId) return;
    const item = {
      id: Date.now(),
      nome: novoItemNome.toUpperCase(),
      qtd: Number(novoItemQtd) || 1,
      precoEstimado: (Math.random() * 12 + 3).toFixed(2),
      marca: obterMarcaParaItem(novoItemNome)
    };
    setListas(listas.map(l => l.id === listaSelecionadaId ? { ...l, itens: [...l.itens, item] } : l));
    setNovoItemNome('');
    setNovoItemQtd(1);
  };

  const listaAtiva = listas.find(l => l.id === listaSelecionadaId) || listas[0];
  const totalBase = (listaAtiva?.itens || []).reduce((acc, i) => acc + (i.precoEstimado * i.qtd), 0);

  // Simulação de Mercados e Cupons no Ranking
  const mercados = [
    { id: 1, nome: 'CARREFOUR', fator: 0.95 },
    { id: 2, nome: 'EXTRA', fator: 1.02 },
    ...historicoCupons.map(c => ({ id: c.id, nome: c.mercado, fator: 0.92, isCupom: true }))
  ].map(m => ({
    ...m,
    total: (totalBase * m.fator).toFixed(2)
  })).sort((a, b) => a.total - b.total);

  if (screen === 'login') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 w-full max-w-sm space-y-6 shadow-xl">
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-black text-emerald-600">🛒 Tá Quanto?</h1>
            <p className="text-xs text-slate-500 font-medium">Economize nas suas compras</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input 
              type="text" 
              placeholder="Usuário" 
              value={usuario} 
              onChange={e => setUsuario(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-emerald-500"
            />
            <input 
              type="password" 
              placeholder="Senha" 
              value={senha} 
              onChange={e => setSenha(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-emerald-500"
            />
            <button className="w-full bg-emerald-600 text-white font-bold py-3 rounded-2xl text-xs shadow-lg shadow-emerald-600/30">
              Entrar
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-24 font-sans">
      {/* CABEÇALHO CLEAN */}
      <header className="bg-white border-b border-slate-100 px-5 py-4 flex justify-between items-center sticky top-0 z-10">
        <div>
          <h1 className="text-lg font-black text-emerald-600">Tá Quanto?</h1>
          <p className="text-[10px] font-bold text-slate-400">Olá, {usuario.toUpperCase()}</p>
        </div>
        <button onClick={() => setScreen('login')} className="text-xs text-slate-400 font-bold hover:text-red-500">
          Sair
        </button>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-4">
        {/* ABA 1: LISTAS DE COMPRAS */}
        {activeTab === 'listas' && (
          <div className="space-y-4">
            {/* Nova Lista */}
            <form onSubmit={criarNovaLista} className="flex gap-2">
              <input 
                type="text" 
                placeholder="Nome da nova lista..." 
                value={novaListaNome}
                onChange={e => setNovaListaNome(e.target.value)}
                className="flex-1 bg-white border border-slate-200 px-4 py-2.5 rounded-2xl text-xs font-semibold shadow-sm focus:outline-none"
              />
              <button className="bg-slate-900 text-white px-4 py-2.5 rounded-2xl text-xs font-bold shadow-sm">
                + Lista
              </button>
            </form>

            {/* Seletor de Listas */}
            {listas.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {listas.map(l => (
                  <button
                    key={l.id}
                    onClick={() => setListaSelecionadaId(l.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                      (listaSelecionadaId || listas[0]?.id) === l.id 
                        ? 'bg-emerald-600 text-white shadow-md' 
                        : 'bg-white border border-slate-200 text-slate-600'
                    }`}
                  >
                    {l.nome} ({l.itens.length})
                  </button>
                ))}
              </div>
            )}

            {/* Adicionar Itens na Lista Ativa */}
            {listaAtiva && (
              <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100 space-y-3">
                <form onSubmit={adicionarItem} className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Adicionar produto..." 
                    value={novoItemNome}
                    onChange={e => setNovoItemNome(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-semibold"
                  />
                  <input 
                    type="number" 
                    min="1"
                    value={novoItemQtd}
                    onChange={e => setNovoItemQtd(e.target.value)}
                    className="w-12 bg-slate-50 border border-slate-200 px-2 py-2 rounded-xl text-xs text-center font-bold"
                  />
                  <button className="bg-emerald-600 text-white px-3 py-2 rounded-xl text-xs font-bold">
                    +
                  </button>
                </form>

                {/* Lista de Produtos */}
                <div className="divide-y divide-slate-100">
                  {listaAtiva.itens.length === 0 ? (
                    <p className="text-center text-xs text-slate-400 py-6">Nenhum item adicionado ainda.</p>
                  ) : (
                    listaAtiva.itens.map(item => (
                      <div key={item.id} className="py-2.5 flex justify-between items-center text-xs">
                        <div>
                          <span className="font-bold text-slate-800">{item.nome}</span>
                          <span className="text-[10px] text-slate-400 block">Marca sugerida: {item.marca}</span>
                        </div>
                        <span className="bg-slate-100 px-2 py-1 rounded-lg font-extrabold text-slate-600">
                          {item.qtd}x
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ABA 2: COMPARATIVO DE PREÇOS (RANKING) */}
        {activeTab === 'comparar' && (
          <div className="space-y-3">
            <div className="flex justify-between items-center bg-white p-3 rounded-2xl border border-slate-100">
              <span className="text-xs font-extrabold text-slate-500">Lista Ativa:</span>
              <span className="text-xs font-bold text-emerald-600">{listaAtiva?.nome || 'Nenhuma selecionada'}</span>
            </div>

            <div className="space-y-2">
              {mercados.map((m, idx) => (
                <div 
                  key={m.id} 
                  className={`bg-white p-4 rounded-2xl border flex justify-between items-center shadow-sm ${
                    idx === 0 ? 'border-emerald-500 ring-1 ring-emerald-500/20' : 'border-slate-100'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-black bg-slate-900 text-white px-1.5 py-0.5 rounded-md">
                        #{idx + 1}
                      </span>
                      {m.isCupom && (
                        <span className="text-[9px] font-bold bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-md">
                          Cupom
                        </span>
                      )}
                    </div>
                    <h4 className="text-xs font-extrabold text-slate-800 pt-1">{m.nome}</h4>
                  </div>

                  <div className="text-right">
                    <span className="text-[9px] text-slate-400 font-bold block uppercase">Total</span>
                    <span className="text-sm font-black text-emerald-600">R$ {m.total}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ABA 3: HISTÓRICO DE CUPONS */}
        {activeTab === 'historico' && (
          <div className="space-y-3">
            <button 
              onClick={() => setShowQrModal(true)}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-2xl text-xs shadow-md flex items-center justify-center gap-2"
            >
              <span>📷</span> Escanear Novo QR Code
            </button>

            <div className="space-y-2">
              {historicoCupons.length === 0 ? (
                <div className="bg-white rounded-3xl p-8 text-center text-slate-400 text-xs">
                  Nenhum cupom salvo no histórico.
                </div>
              ) : (
                historicoCupons.map(c => (
                  <div key={c.id} className="bg-white p-3.5 rounded-2xl border border-slate-100 flex justify-between items-center shadow-sm">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">{c.mercado}</h4>
                      <p className="text-[10px] text-slate-400">{c.data}</p>
                    </div>
                    <button 
                      onClick={() => setHistoricoCupons(historicoCupons.filter(x => x.id !== c.id))}
                      className="text-red-500 text-xs font-bold px-2 py-1 bg-red-50 rounded-lg"
                    >
                      Excluir
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      {/* BARRA DE NAVEGAÇÃO INFERIOR (BOTTOM TAB BAR) */}
      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-100 px-6 py-2 flex justify-around items-center z-40 shadow-lg">
        <button 
          onClick={() => setActiveTab('listas')}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold ${activeTab === 'listas' ? 'text-emerald-600' : 'text-slate-400'}`}
        >
          <span className="text-base">📋</span>
          Listas
        </button>
        <button 
          onClick={() => setActiveTab('comparar')}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold ${activeTab === 'comparar' ? 'text-emerald-600' : 'text-slate-400'}`}
        >
          <span className="text-base">📊</span>
          Comparar
        </button>
        <button 
          onClick={() => setActiveTab('historico')}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold ${activeTab === 'historico' ? 'text-purple-600' : 'text-slate-400'}`}
        >
          <span className="text-base">📜</span>
          Cupons
        </button>
      </nav>
    </div>
  );
}