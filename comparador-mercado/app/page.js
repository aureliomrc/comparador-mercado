'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  // --- Estados Principais ---
  const [usuario, setUsuario] = useState('USUARIO_PADRAO');
  const [listas, setListas] = useState([]);
  const [historicoCupons, setHistoricoCupons] = useState([]);
  const [loadingListas, setLoadingListas] = useState(true);
  const [loadingCupons, setLoadingCupons] = useState(true);

  // --- Estados de Seleção e Modal ---
  const [listaSelecionadaId, setListaSelecionadaId] = useState(null);
  const [listaParaCompararId, setListaParaCompararId] = useState(null);
  const [modalQrAberto, setModalQrAberto] = useState(false);
  const [modalNovaListaAberto, setModalNovaListaAberto] = useState(false);

  // --- Formularies e Inputs ---
  const [nomeNovaLista, setNomeNovaLista] = useState('');
  const [qrUrlInput, setQrUrlInput] = useState('');
  const [nomeFantasiaInput, setNomeFantasiaInput] = useState('');

  // Form de novos itens na lista selecionada
  const [novoItemNome, setNovoItemNome] = useState('');
  const [novoItemQtd, setNovoItemQtd] = useState(1);
  const [novoItemPreco, setNovoItemPreco] = useState('');
  const [novoItemMarca, setNovoItemMarca] = useState('');

  // 1. Carregar dados do Banco de Dados via API ao iniciar ou mudar usuário
  useEffect(() => {
    carregarListasDoBanco();
    carregarCuponsDoBanco();
  }, [usuario]);

  // --- Requisições API ---

  const carregarListasDoBanco = async () => {
    setLoadingListas(true);
    try {
      // Busca a Lista Padrão + listas específicas do usuário
      const res = await fetch(`/api/listas?usuarioId=${encodeURIComponent(usuario)}`, { cache: 'no-store' });
      if (res.ok) {
        const dados = await res.json();
        const listaTratada = Array.isArray(dados) ? dados : [];
        setListas(listaTratada);

        // Seleciona a primeira lista por padrão caso nenhuma esteja selecionada
        if (listaTratada.length > 0) {
          if (!listaSelecionadaId) setListaSelecionadaId(listaTratada[0].id);
          if (!listaParaCompararId) setListaParaCompararId(listaTratada[0].id);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar listas:', error);
    } finally {
      setLoadingListas(false);
    }
  };

  const carregarCuponsDoBanco = async () => {
    setLoadingCupons(true);
    try {
      // Busca todos os cupons salvos no Neon (Crowdsourcing)
      const res = await fetch('/api/cupons', { cache: 'no-store' });
      if (res.ok) {
        const dados = await res.json();
        setHistoricoCupons(Array.isArray(dados) ? dados : []);
      }
    } catch (error) {
      console.error('Erro ao buscar cupons:', error);
    } finally {
      setLoadingCupons(false);
    }
  };

  // --- Operações em Listas ---

  const criarNovaLista = async (e) => {
    e.preventDefault();
    if (!nomeNovaLista.trim()) return;

    try {
      const res = await fetch('/api/listas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: nomeNovaLista.trim(),
          usuarioId: usuario
        })
      });

      if (res.ok) {
        const novaLista = await res.json();
        setListas(prev => [novaLista, ...prev]);
        setListaSelecionadaId(novaLista.id);
        setListaParaCompararId(novaLista.id);
        setNomeNovaLista('');
        setModalNovaListaAberto(false);
      }
    } catch (error) {
      console.error('Erro ao criar lista:', error);
    }
  };

  const adicionarItemALista = async (e) => {
    e.preventDefault();
    if (!novoItemNome.trim() || !listaSelecionadaId) return;

    try {
      const res = await fetch('/api/listas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acao: 'ADICIONAR_ITEM',
          listaId: listaSelecionadaId,
          nome: novoItemNome.trim(),
          qtd: Number(novoItemQtd) || 1,
          precoEstimado: Number(novoItemPreco) || 0,
          marca: novoItemMarca.trim() || 'PADRÃO'
        })
      });

      if (res.ok) {
        const itemCriado = await res.json();

        setListas(prev => prev.map(l => {
          if (l.id === listaSelecionadaId) {
            return { ...l, itens: [...l.itens, itemCriado] };
          }
          return l;
        }));

        setNovoItemNome('');
        setNovoItemQtd(1);
        setNovoItemPreco('');
        setNovoItemMarca('');
      }
    } catch (error) {
      console.error('Erro ao adicionar item:', error);
    }
  };

  const alternarMarcacaoItem = async (itemId, marcadoAtual) => {
    try {
      // Atualização otimista na interface
      setListas(prev => prev.map(lista => ({
        ...lista,
        itens: lista.itens.map(item =>
          item.id === itemId ? { ...item, marcado: !marcadoAtual } : item
        )
      })));

      await fetch('/api/listas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acao: 'ATUALIZAR_ITEM',
          itemId,
          marcado: !marcadoAtual
        })
      });
    } catch (error) {
      console.error('Erro ao atualizar item:', error);
      carregarListasDoBanco(); // Reverte em caso de erro
    }
  };

  const excluirItem = async (itemId) => {
    try {
      setListas(prev => prev.map(lista => ({
        ...lista,
        itens: lista.itens.filter(item => item.id !== itemId)
      })));

      await fetch(`/api/listas?itemId=${itemId}`, { method: 'DELETE' });
    } catch (error) {
      console.error('Erro ao excluir item:', error);
    }
  };

  // --- Operações em Cupons (QR Code / Sefaz) ---

  const processarCupomQrCode = async (e) => {
    e.preventDefault();
    if (!nomeFantasiaInput.trim() && !qrUrlInput.trim()) {
      return alert('Preencha o nome do estabelecimento ou informe a URL do QR Code!');
    }

    const nomeEstabelecimento = nomeFantasiaInput.trim().toUpperCase() || 'MERCADO VIA QR CODE';

    try {
      const res = await fetch('/api/cupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mercado: nomeEstabelecimento,
          url: qrUrlInput,
          usuarioId: usuario
        })
      });

      if (res.ok) {
        const cupomSalvo = await res.json();
        setHistoricoCupons(prev => [cupomSalvo, ...prev]);
        setQrUrlInput('');
        setNomeFantasiaInput('');
        setModalQrAberto(false);
      } else {
        alert('Erro ao processar o cupom fiscal.');
      }
    } catch (err) {
      console.error('Erro ao salvar cupom:', err);
    }
  };

  const excluirCupom = async (cupomId) => {
    try {
      setHistoricoCupons(prev => prev.filter(c => c.id !== cupomId));
      await fetch(`/api/cupons?id=${cupomId}`, { method: 'DELETE' });
    } catch (error) {
      console.error('Erro ao excluir cupom:', error);
    }
  };

  // --- CÁLCULOS DA COMPARÇÃO DE MERCADOS (Crowdsourcing) ---
  const listaAtivaComparacao = listas.find(l => l.id === listaParaCompararId);

  // Mapeia preços do historico global de cupons
  const calcularComparativo = () => {
    if (!listaAtivaComparacao || !listaAtivaComparacao.itens.length) return [];

    const mercadosMap = {};

    historicoCupons.forEach(cupom => {
      if (!mercadosMap[cupom.mercado]) {
        mercadosMap[cupom.mercado] = { mercado: cupom.mercado, total: 0, encontrados: 0, dataUltima: cupom.data };
      }

      listaAtivaComparacao.itens.forEach(itemLista => {
        // Busca o item no cupom por proximidade de nome
        const itemEncontrado = cupom.itens.find(itemCupom =>
          itemCupom.nome.includes(itemLista.nome) || itemLista.nome.includes(itemCupom.nome)
        );

        if (itemEncontrado) {
          mercadosMap[cupom.mercado].total += itemEncontrado.preco * itemLista.qtd;
          mercadosMap[cupom.mercado].encontrados += 1;
        }
      });
    });

    return Object.values(mercadosMap);
  };

  const comparativoMercados = calcularComparativo();
  const listaAtual = listas.find(l => l.id === listaSelecionadaId);

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '1200px', margin: '0 auto', backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      
      {/* HEADER / SESSÃO DO USUÁRIO */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', padding: '15px 20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', marginBottom: '20px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', color: '#1a202c' }}>🛒 EconomizaJá - Comparador Crowdsourced</h1>
          <small style={{ color: '#718096' }}>Banco Neon PostgreSQL Ativo</small>
        </div>
        <div>
          <label style={{ fontSize: '14px', fontWeight: 'bold', marginRight: '8px' }}>Usuário Atual:</label>
          <input
            type="text"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value.toUpperCase())}
            style={{ padding: '6px 12px', border: '1px solid #cbd5e0', borderRadius: '4px', fontWeight: 'bold' }}
          />
        </div>
      </header>

      {/* PAINEL PRINCIPAL EM 2 COLUNAS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

        {/* COLUNA 1: GERENCIADOR DE LISTAS DE COMPRAS */}
        <section style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h2 style={{ margin: 0, fontSize: '18px', color: '#2d3748' }}>📋 Minhas Listas de Compras</h2>
            <button
              onClick={() => setModalNovaListaAberto(true)}
              style={{ padding: '8px 12px', backgroundColor: '#3182ce', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
              + Nova Lista
            </button>
          </div>

          {/* Seleção da Lista Ativa */}
          {loadingListas ? (
            <p>Carregando listas do Neon...</p>
          ) : (
            <div style={{ marginBottom: '15px' }}>
              <select
                value={listaSelecionadaId || ''}
                onChange={(e) => setListaSelecionadaId(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e0', fontSize: '15px' }}>
                {listas.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.nome} {l.isPrincipal ? '(Padrão)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Formulário para Adicionar Item à Lista */}
          {listaAtual && (
            <form onSubmit={adicionarItemALista} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '8px', marginBottom: '20px' }}>
              <input
                type="text"
                placeholder="PRODUTO"
                value={novoItemNome}
                onChange={e => setNovoItemNome(e.target.value)}
                required
                style={{ padding: '6px', border: '1px solid #cbd5e0', borderRadius: '4px' }}
              />
              <input
                type="number"
                placeholder="QTD"
                value={novoItemQtd}
                onChange={e => setNovoItemQtd(e.target.value)}
                min="1"
                style={{ padding: '6px', border: '1px solid #cbd5e0', borderRadius: '4px' }}
              />
              <input
                type="number"
                step="0.01"
                placeholder="R$ EST."
                value={novoItemPreco}
                onChange={e => setNovoItemPreco(e.target.value)}
                style={{ padding: '6px', border: '1px solid #cbd5e0', borderRadius: '4px' }}
              />
              <input
                type="text"
                placeholder="MARCA"
                value={novoItemMarca}
                onChange={e => setNovoItemMarca(e.target.value)}
                style={{ padding: '6px', border: '1px solid #cbd5e0', borderRadius: '4px' }}
              />
              <button type="submit" style={{ padding: '6px 12px', backgroundColor: '#38a169', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                Add
              </button>
            </form>
          )}

          {/* Itens da Lista Ativa */}
          {listaAtual?.itens.length === 0 ? (
            <p style={{ color: '#a0aec0', fontStyle: 'italic' }}>Nenhum item adicionado a esta lista.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {listaAtual?.itens.map(item => (
                <li key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #edf2f7' }}>
                  <div style={{ textDecoration: item.marcado ? 'line-through' : 'none', color: item.marcado ? '#a0aec0' : '#2d3748' }}>
                    <input
                      type="checkbox"
                      checked={item.marcado}
                      onChange={() => alternarMarcacaoItem(item.id, item.marcado)}
                      style={{ marginRight: '10px' }}
                    />
                    <strong>{item.nome}</strong> ({item.qtd}x) - <small>{item.marca}</small>
                  </div>
                  <div>
                    <span style={{ fontWeight: 'bold', marginRight: '10px' }}>R$ {(item.precoEstimado * item.qtd).toFixed(2)}</span>
                    <button onClick={() => excluirItem(item.id)} style={{ backgroundColor: 'transparent', color: '#e53e3e', border: 'none', cursor: 'pointer' }}>✖</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* COLUNA 2: HISTÓRICO DE CUPONS (CROWDSOURCING GLOBAL) */}
        <section style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', color: '#2d3748' }}>🧾 Cupons Bipados (Comunidade)</h2>
              <small style={{ color: '#718096' }}>Base compartilhada do Neon DB</small>
            </div>
            <button
              onClick={() => setModalQrAberto(true)}
              style={{ padding: '8px 12px', backgroundColor: '#805ad5', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
              📷 Ler QR Code
            </button>
          </div>

          {loadingCupons ? (
            <p>Carregando cupons da comunidade...</p>
          ) : historicoCupons.length === 0 ? (
            <p style={{ color: '#a0aec0', fontStyle: 'italic' }}>Nenhum cupom adicionado no sistema ainda.</p>
          ) : (
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {historicoCupons.map(cupom => (
                <div key={cupom.id} style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px', marginBottom: '12px', backgroundColor: '#fff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: '#2b6cb0' }}>
                    <span>{cupom.mercado}</span>
                    <button onClick={() => excluirCupom(cupom.id)} style={{ color: '#e53e3e', border: 'none', background: 'none', cursor: 'pointer' }}>Apagar</button>
                  </div>
                  <small style={{ color: '#a0aec0', display: 'block', marginBottom: '8px' }}>Empréstimo em: {cupom.data} {cupom.hora}</small>

                  <ul style={{ paddingLeft: '15px', margin: 0, fontSize: '13px', color: '#4a5568' }}>
                    {cupom.itens.map(i => (
                      <li key={i.id}>
                        {i.nome} - {i.qtd}x R$ {i.preco.toFixed(2)}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* SEÇÃO INFERIOR: COMPARATIVO CROWDSOURCED DE PREÇOS */}
      <section style={{ marginTop: '20px', backgroundColor: '#ffffff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', color: '#2d3748' }}>💡 Comparador Inteligente por Mercado</h2>
          <div>
            <label style={{ marginRight: '8px', fontSize: '14px' }}>Comparar com a lista:</label>
            <select
              value={listaParaCompararId || ''}
              onChange={(e) => setListaParaCompararId(e.target.value)}
              style={{ padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e0' }}>
              {listas.map(l => (
                <option key={l.id} value={l.id}>{l.nome}</option>
              ))}
            </select>
          </div>
        </div>

        {comparativoMercados.length === 0 ? (
          <p style={{ color: '#a0aec0', fontStyle: 'italic' }}>Bipe cupons fiscais para que o sistema consiga gerar a comparação de preços da sua lista nos supermercados.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' }}>
            {comparativoMercados.map((m, idx) => (
              <div key={idx} style={{ border: '2px solid #4299e1', borderRadius: '8px', padding: '15px', backgroundColor: '#ebf8ff' }}>
                <h3 style={{ margin: '0 0 10px 0', color: '#2b6cb0', fontSize: '16px' }}>{m.mercado}</h3>
                <p style={{ fontSize: '20px', fontWeight: 'bold', margin: '5px 0', color: '#2c5282' }}>
                  Total: R$ {m.total.toFixed(2)}
                </p>
                <small style={{ color: '#4a5568' }}>Itens mapeados: {m.encontrados} de {listaAtivaComparacao?.itens.length || 0}</small>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* MODAL: CRIAR LISTA */}
      {modalNovaListaAberto && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', width: '350px' }}>
            <h3>Nova Lista de Compras</h3>
            <form onSubmit={criarNovaLista}>
              <input
                type="text"
                placeholder="Nome da Lista (ex: COMPRAS DO MÊS)"
                value={nomeNovaLista}
                onChange={e => setNomeNovaLista(e.target.value)}
                required
                style={{ width: '100%', padding: '8px', marginBottom: '15px', borderRadius: '4px', border: '1px solid #cbd5e0' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setModalNovaListaAberto(false)} style={{ padding: '8px 12px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" style={{ padding: '8px 12px', backgroundColor: '#3182ce', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRAR CUPOM SEFAZ */}
      {modalQrAberto && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', width: '400px' }}>
            <h3>Registrar Cupom Fiscal (SEFAZ)</h3>
            <form onSubmit={processarCupomQrCode}>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Nome do Estabelecimento:</label>
                <input
                  type="text"
                  placeholder="EX: SUPERMERCADO CARREFOUR"
                  value={nomeFantasiaInput}
                  onChange={e => setNomeFantasiaInput(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e0' }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold' }}>URL do QR Code (SEFAZ):</label>
                <input
                  type="url"
                  placeholder="https://www mef.fazenda..."
                  value={qrUrlInput}
                  onChange={e => setQrUrlInput(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e0' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setModalQrAberto(false)} style={{ padding: '8px 12px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" style={{ padding: '8px 12px', backgroundColor: '#805ad5', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Processar e Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}