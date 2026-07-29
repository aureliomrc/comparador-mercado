'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  // Controle de Abas Navegáveis: 'listas' | 'comparar' | 'cupons'
  const [abaAtiva, setAbaAtiva] = useState('listas');

  // Estados do Módulo de Listas
  const [listas, setListas] = useState([]);
  const [listaSelecionada, setListaSelecionada] = useState(null);
  const [novoNomeLista, setNovoNomeLista] = useState('');
  const [novoItemNome, setNovoItemNome] = useState('');

  // Estados do Módulo de Cupons / Crowdsourcing
  const [historicoCupons, setHistoricoCupons] = useState([]);
  const [urlQrCode, setUrlQrCode] = useState('');
  const [nomeMercadoCupom, setNomeMercadoCupom] = useState('');

  // Estados do Módulo Comparador de Preços
  const [resultadoComparacao, setResultadoComparacao] = useState(null);
  const [carregandoComparacao, setCarregandoComparacao] = useState(false);

  // Efeito Inicial: Carrega dados do Banco via API
  useEffect(() => {
    carregarListas();
    carregarCupons();
  }, []);

  // ==========================================
  // FUNÇÕES DE INTEGRAÇÃO COM A API (BACKEND)
  // ==========================================

  async function carregarListas() {
    try {
      const res = await fetch('/api/listas');
      if (res.ok) {
        const data = await res.json();
        setListas(data);
        if (data.length > 0 && !listaSelecionada) {
          setListaSelecionada(data[0]);
        }
      }
    } catch (err) {
      console.error('Erro ao carregar listas:', err);
    }
  }

  async function criarLista() {
    if (!novoNomeLista.trim()) return;
    try {
      const res = await fetch('/api/listas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: novoNomeLista }),
      });
      if (res.ok) {
        setNovoNomeLista('');
        carregarListas();
      }
    } catch (err) {
      console.error('Erro ao criar lista:', err);
    }
  }

  async function adicionarItem() {
    if (!novoItemNome.trim() || !listaSelecionada) return;
    try {
      const res = await fetch('/api/listas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listaId: listaSelecionada.id,
          produtoNome: novoItemNome,
        }),
      });
      if (res.ok) {
        setNovoItemNome('');
        carregarListas();
      }
    } catch (err) {
      console.error('Erro ao adicionar item:', err);
    }
  }

  async function carregarCupons() {
    try {
      const res = await fetch('/api/cupons');
      if (res.ok) {
        const data = await res.json();
        setHistoricoCupons(data);
      }
    } catch (err) {
      console.error('Erro ao carregar cupons:', err);
    }
  }

  async function salvarCupom() {
    if (!nomeMercadoCupom.trim()) {
      alert('Por favor, informe o nome do mercado.');
      return;
    }

    try {
      const res = await fetch('/api/cupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mercado: nomeMercadoCupom,
          urlQrCode: urlQrCode,
          usuarioColaborador: 'Comunidade',
        }),
      });

      if (res.ok) {
        setUrlQrCode('');
        setNomeMercadoCupom('');
        alert('Cupom salvo com sucesso! Obrigado por colaborar.');
        carregarCupons();
      } else {
        alert('Erro ao salvar o cupom. Verifique os dados no servidor.');
      }
    } catch (err) {
      console.error('Erro ao salvar cupom:', err);
      alert('Erro de conexão ao salvar o cupom.');
    }
  }

  async function excluirCupom(id) {
    try {
      const res = await fetch(`/api/cupons?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        carregarCupons();
      }
    } catch (err) {
      console.error('Erro ao excluir cupom:', err);
    }
  }

  async function compararPrecos() {
    if (!listaAtual) return;
    setCarregandoComparacao(true);
    setResultadoComparacao(null);

    try {
      const res = await fetch(`/api/comparar/${listaAtual.id}`);
      if (res.ok) {
        const data = await res.json();
        setResultadoComparacao(data);
      } else {
        alert('Não foi possível obter a comparação de preços para esta lista.');
      }
    } catch (err) {
      console.error('Erro ao comparar preços:', err);
    } font-sans {
      setCarregandoComparacao(false);
    }
  }

  // Identifica a lista selecionada ativa com fallback para a primeira
  const listaAtual = listas.find((l) => l.id === listaSelecionada?.id) || listas[0];

  // Helper para formatar datas com segurança
  const formatarData = (dataString) => {
    if (!dataString) return new Date().toLocaleDateString('pt-BR');
    const d = new Date(dataString);
    return isNaN(d.getTime()) ? new Date().toLocaleDateString('pt-BR') : d.toLocaleDateString('pt-BR');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-4 font-sans text-gray-900">
      
      {/* CABEÇALHO */}
      <header className="w-full max-w-xl bg-white shadow-md rounded-2xl p-5 mb-4 text-center border border-gray-100">
        <h1 className="text-2xl font-black text-indigo-600 tracking-tight">🛒 EconomizaJá</h1>
        <p className="text-xs text-gray-500 font-medium mt-1">
          Crie listas, leia cupons fiscais e encontre o menor preço
        </p>
      </header>

      {/* NAVEGAÇÃO ENTRE ABAS */}
      <nav className="w-full max-w-xl flex bg-gray-200 rounded-xl p-1 gap-1 mb-6 shadow-inner">
        <button
          onClick={() => setAbaAtiva('listas')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
            abaAtiva === 'listas' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          📝 Listas
        </button>
        <button
          onClick={() => setAbaAtiva('comparar')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
            abaAtiva === 'comparar' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          📊 Comparador
        </button>
        <button
          onClick={() => setAbaAtiva('cupons')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
            abaAtiva === 'cupons' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          🧾 Enviar Cupons
        </button>
      </nav>

      {/* ABA 1: MINHAS LISTAS */}
      {abaAtiva === 'listas' && (
        <main className="w-full max-w-xl flex flex-col gap-4">
          
          {/* Form de Criação de Lista */}
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-2">
              Criar Nova Lista
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ex: Compras da Semana"
                value={novoNomeLista}
                onChange={(e) => setNovoNomeLista(e.target.value)}
                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={criarLista}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition-all shadow-sm"
              >
                + Criar
              </button>
            </div>
          </div>

          {/* Seleção e Adição de Itens na Lista */}
          {listas.length > 0 && (
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-gray-500">Selecione a Lista:</span>
                <select
                  value={listaAtual?.id || ''}
                  onChange={(e) => setListaSelecionada(listas.find((l) => l.id === e.target.value))}
                  className="bg-gray-100 border border-gray-200 font-bold text-xs rounded-xl px-3 py-1.5 focus:outline-none"
                >
                  {listas.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  placeholder="Adicionar produto (Ex: Arroz, Leite)..."
                  value={novoItemNome}
                  onChange={(e) => setNovoItemNome(e.target.value)}
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={adicionarItem}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition-all shadow-sm"
                >
                  Adicionar
                </button>
              </div>

              {/* Itens Cadastrados */}
              <div className="space-y-2 border-t border-gray-100 pt-3">
                <h4 className="text-xs font-bold text-gray-600">Itens na Lista ({listaAtual?.itens?.length || 0}):</h4>
                {listaAtual?.itens?.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">Nenhum item adicionado ainda.</p>
                ) : (
                  listaAtual?.itens?.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between items-center bg-gray-50 p-2.5 rounded-xl border border-gray-100 text-xs font-semibold text-gray-700"
                    >
                      <span>📦 {item.produtoNome}</span>
                      <span className="text-gray-400 font-normal">{item.un || '1 UN'}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </main>
      )}

      {/* ABA 2: COMPARADOR DE PREÇOS */}
      {abaAtiva === 'comparar' && (
        <main className="w-full max-w-xl bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <h2 className="text-sm font-extrabold text-gray-800 uppercase tracking-wider mb-2">
            Comparar Preços nos Supermercados
          </h2>
          <p className="text-xs text-gray-500 mb-4">
            Analisamos a base de dados pública da SEFAZ e os cupons compartilhados pelos usuários para indicar a opção mais vantajosa.
          </p>

          <button
            onClick={compararPrecos}
            disabled={carregandoComparacao || !listaAtual}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl text-xs transition-all shadow-md disabled:opacity-50 mb-4"
          >
            {carregandoComparacao ? 'Buscando Menor Preço...' : `Comparar Lista Atual: "${listaAtual?.nome || 'Nenhuma'}"`}
          </button>

          {resultadoComparacao && (
            <div className="space-y-3 border-t border-gray-100 pt-4">
              <h3 className="text-xs font-bold text-gray-700">Resultados Encontrados:</h3>
              {resultadoComparacao.length === 0 ? (
                <p className="text-xs text-gray-400">Nenhum mercado com preços correspondentes aos itens da sua lista.</p>
              ) : (
                resultadoComparacao.map((res, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-2xl border ${
                      index === 0
                        ? 'bg-green-50 border-green-300 shadow-sm'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-extrabold text-gray-800">{res.mercado}</h4>
                          {index === 0 && (
                            <span className="bg-green-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full">
                              🏆 MAIS BARATO
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-500 mt-1">
                          Encontrados: <strong>{res.qtdItensEncontrados}</strong> de {res.totalItensLista} itens da sua lista
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-gray-400 block font-medium">Total Estimado</span>
                        <span className="text-base font-black text-green-700">R$ {res.totalEstimado}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </main>
      )}

      {/* ABA 3: ENVIAR CUPONS (CROWDSOURCING) */}
      {abaAtiva === 'cupons' && (
        <main className="w-full max-w-xl flex flex-col gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
            <h2 className="text-sm font-extrabold text-gray-800 uppercase tracking-wider mb-1">
              Colabore Enviando um Cupom Fiscal
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              Digite a URL/QR Code da NFC-e da sua compra para alimentar os preços públicos da comunidade.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-gray-600 block mb-1">Nome do Supermercado *</label>
                <input
                  type="text"
                  placeholder="Ex: Carrefour, Extra, Assaí..."
                  value={nomeMercadoCupom}
                  onChange={(e) => setNomeMercadoCupom(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-600 block mb-1">Link do QR Code ou Chave NFC-e</label>
                <input
                  type="text"
                  placeholder="https://www.sefaz.gov.br/nfce/qrcode?..."
                  value={urlQrCode}
                  onChange={(e) => setUrlQrCode(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <button
                onClick={salvarCupom}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 rounded-xl text-xs transition-all shadow-md"
              >
                💾 Compartilhar Cupom com a Comunidade
              </button>
            </div>
          </div>

          {/* Lista de Cupons Já Enviados */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-3">
              Cupons Compartilhados Recentemente
            </h3>

            <div className="space-y-2">
              {historicoCupons.length === 0 ? (
                <p className="text-xs text-gray-400 italic">Nenhum cupom compartilhado ainda.</p>
              ) : (
                historicoCupons.map((cupom) => (
                  <div
                    key={cupom.id}
                    className="bg-white border border-purple-200 rounded-2xl p-3.5 flex justify-between items-center shadow-sm"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-extrabold text-gray-800">
                          {cupom.mercado?.nome || (typeof cupom.mercado === 'string' ? cupom.mercado : 'MERCADO')}
                        </h4>
                        <span className="text-[9px] bg-purple-100 text-purple-800 font-bold px-1.5 py-0.5 rounded-full">
                          👥 Crowdsourcing
                        </span>
                      </div>
                      <p className="text-[10px] text-purple-700 font-medium mt-0.5">
                        📅 {formatarData(cupom.criadoEm || cupom.dataEmissao)} · 
                        Colaborador: <strong>@{cupom.usuario?.usuario || 'Comunidade'}</strong>
                      </p>
                    </div>

                    <button
                      onClick={() => excluirCupom(cupom.id)}
                      className="text-red-500 hover:bg-red-50 border border-red-200 text-xs font-bold px-3 py-1.5 rounded-xl transition-all"
                    >
                      🗑️ Excluir
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </main>
      )}

    </div>
  );
}