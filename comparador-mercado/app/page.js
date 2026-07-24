'use client';
import { useState, useEffect } from 'react';

export default function Home() {
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [isLogged, setIsLogged] = useState(false);

  // Estado das listas
  const [listas, setListas] = useState([]);
  const [novaListaNome, setNovaListaNome] = useState('');
  const [novosItens, setNovosItens] = useState('');
  
  // Estado SEFAZ
  const [qrUrl, setQrUrl] = useState('');
  const [nomeFantasia, setNomeFantasia] = useState('');

  // Comparação
  const [comparacao, setComparacao] = useState(null);

  // Manipular Login/Cadastro
  const handleAuth = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: authMode, email, senha })
    });
    const data = await res.json();
    if (res.ok) {
      if (authMode === 'login') {
        setIsLogged(true);
        carregarListas();
      } else {
        alert('Cadastro realizado com sucesso! Faça login.');
        setAuthMode('login');
      }
    } else {
      alert(data.error);
    }
  };

  const carregarListas = async () => {
    const res = await fetch('/api/listas');
    if (res.ok) {
      const data = await res.json();
      setListas(data);
    }
  };

  const criarLista = async (e) => {
    e.preventDefault();
    const arrayItens = novosItens.split(',').map(i => i.trim()).filter(Boolean);
    const res = await fetch('/api/listas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: novaListaNome, itens: arrayItens })
    });
    if (res.ok) {
      setNovaListaNome('');
      setNovosItens('');
      carregarListas();
    }
  };

  const enviarSefaz = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/sefaz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urlQrCode: qrUrl, nomeFantasiaManual: nomeFantasia })
    });
    const data = await res.json();
    if (res.ok) {
      alert(data.message);
      setQrUrl('');
      setNomeFantasia('');
    } else {
      alert(data.error);
    }
  };

  const compararPrecos = async (listaId) => {
    const res = await fetch(`/api/comparar/${listaId}`);
    const data = await res.json();
    setComparacao(data);
  };

  if (!isLogged) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <form onSubmit={handleAuth} className="bg-white p-8 rounded shadow-md w-96 space-y-4">
          <h2 className="text-2xl font-bold text-center text-gray-800">
            {authMode === 'login' ? 'Login' : 'Criar Conta'}
          </h2>
          <input
            type="email"
            placeholder="Seu E-mail"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full border p-2 rounded"
            required
          />
          <input
            type="password"
            placeholder="Sua Senha"
            value={senha}
            onChange={e => setSenha(e.target.value)}
            className="w-full border p-2 rounded"
            required
          />
          <button className="w-full bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700">
            {authMode === 'login' ? 'Entrar' : 'Cadastrar'}
          </button>
          <p className="text-sm text-center cursor-pointer text-blue-500 hover:underline" onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}>
            {authMode === 'login' ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entre'}
          </p>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 max-w-4xl mx-auto space-y-8">
      <header className="flex justify-between items-center border-b pb-4">
        <h1 className="text-3xl font-bold text-gray-800">EconomizaComunidade 🛒</h1>
        <button onClick={() => setIsLogged(false)} className="text-red-500 hover:underline">Sair</button>
      </header>

      {/* Seção 1: Alimentar com QR Code */}
      <section className="bg-white p-6 rounded shadow space-y-4">
        <h2 className="text-xl font-bold text-gray-700">1. Alimentar com Cupom SEFAZ (QR Code)</h2>
        <form onSubmit={enviarSefaz} className="space-y-3">
          <input
            type="url"
            placeholder="Cole a URL lida do QR Code da Nota Fiscal"
            value={qrUrl}
            onChange={e => setQrUrl(e.target.value)}
            className="w-full border p-2 rounded"
            required
          />
          <input
            type="text"
            placeholder="Nome Fantasia do Mercado (Opcional)"
            value={nomeFantasia}
            onChange={e => setNomeFantasia(e.target.value)}
            className="w-full border p-2 rounded"
          />
          <button className="bg-green-600 text-white px-4 py-2 rounded font-semibold hover:bg-green-700">
            Importar Preços
          </button>
        </form>
      </section>

      {/* Seção 2: Minhas Listas */}
      <section className="bg-white p-6 rounded shadow space-y-4">
        <h2 className="text-xl font-bold text-gray-700">2. Criar Nova Lista de Compras</h2>
        <form onSubmit={criarLista} className="space-y-3">
          <input
            type="text"
            placeholder="Nome da Lista (ex: Compras do Mês)"
            value={novaListaNome}
            onChange={e => setNovaListaNome(e.target.value)}
            className="w-full border p-2 rounded"
            required
          />
          <input
            type="text"
            placeholder="Itens separados por vírgula (ex: leite, arroz, feijao, cafe)"
            value={novosItens}
            onChange={e => setNovosItens(e.target.value)}
            className="w-full border p-2 rounded"
            required
          />
          <button className="bg-blue-600 text-white px-4 py-2 rounded font-semibold hover:bg-blue-700">
            Salvar Lista
          </button>
        </form>

        <div className="mt-6 space-y-4">
          <h3 className="font-semibold text-lg text-gray-600">Minhas Listas:</h3>
          {listas.map(lista => (
            <div key={lista.id} className="border p-4 rounded flex justify-between items-center bg-gray-50">
              <div>
                <p className="font-bold text-gray-800">{lista.nome}</p>
                <p className="text-sm text-gray-500">Itens: {lista.itens.map(i => i.produtoNome).join(', ')}</p>
              </div>
              <button
                onClick={() => compararPrecos(lista.id)}
                className="bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700"
              >
                Comparar Mercados
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Seção 3: Comparador */}
      {comparacao && (
        <section className="bg-white p-6 rounded shadow space-y-4 border-2 border-purple-500">
          <h2 className="text-xl font-bold text-purple-700">3. Resultado da Comparação</h2>
          {comparacao.length === 0 ? (
            <p className="text-gray-500">Nenhum mercado com esses produtos cadastrados até o momento.</p>
          ) : (
            <div className="space-y-3">
              {comparacao.map((res, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-purple-50 rounded border">
                  <div>
                    <span className="font-bold text-lg text-gray-800">{index + 1}º - {res.mercado}</span>
                    <p className="text-xs text-gray-500">Encontrados {res.qtdItensEncontrados} de {res.totalItensLista} itens da sua lista</p>
                  </div>
                  <span className="text-xl font-extrabold text-green-600">R$ {res.totalEstimado}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}