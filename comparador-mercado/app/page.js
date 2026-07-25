'use client';
import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

export default function Home() {
  const [screen, setScreen] = useState('login'); // 'login', 'register', 'dashboard', 'comparison'
  const [isLogged, setIsLogged] = useState(false);

  // Autenticação
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [cpf, setCpf] = useState('');
  const [aceitaLgpd, setAceitaLgpd] = useState(false);

  // Listas
  const [listas, setListas] = useState([
    {
      id: 1,
      nome: 'MINHA LISTA PRINCIPAL',
      data: '21/07/2026',
      itens: [
        { id: 1, nome: 'ARROZ', qtd: 1, un: 'UN', marcado: false },
        { id: 2, nome: 'FEIJÃO', qtd: 1, un: 'UN', marcado: false },
        { id: 3, nome: 'LEITE', qtd: 1, un: 'UN', marcado: false },
        { id: 4, nome: 'AÇÚCAR', qtd: 1, un: 'UN', marcado: false },
        { id: 5, nome: 'CAFÉ', qtd: 1, un: 'UN', marcado: false },
      ]
    }
  ]);
  const [novaListaNome, setNovaListaNome] = useState('');
  const [novoItemNome, setNovoItemNome] = useState('');
  const [novoItemQtd, setNovoItemQtd] = useState(1);
  const [listaAtivaId, setListaAtivaId] = useState(1);

  // Cupom / QR Code / Câmera
  const [showQrModal, setShowQrModal] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [qrUrl, setQrUrl] = useState('');
  const html5QrCodeRef = useRef(null);

  // Comparação & Geolocalização
  const [usandoGeo, setUsandoGeo] = useState(false);
  const [mercadosSelecionados, setMercadosSelecionados] = useState(['ASSAÍ INTERLAGOS', 'FORT ATACADISTA NAÇÕES UNIDAS']);

  // Controle de ativação/desativação da Câmera no Modal
  useEffect(() => {
    if (showQrModal && cameraActive) {
      const qrScanner = new Html5Qrcode("reader");
      html5QrCodeRef.current = qrScanner;

      qrScanner.start(
        { facingMode: "environment" }, // Usa a câmera traseira do celular
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decodedText) => {
          // Quando lê o QR Code com sucesso:
          setQrUrl(decodedText);
          stopCamera();
          alert(`Cupom lido com sucesso!\nURL: ${decodedText}`);
        },
        (errorMessage) => {
          // Leitura contínua em progresso...
        }
      ).catch((err) => {
        console.error("Erro ao iniciar câmera:", err);
        setCameraActive(false);
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

  const handleCloseModal = () => {
    stopCamera();
    setShowQrModal(false);
  };

  // Funções de Autenticação
  const handleLogin = (e) => {
    e.preventDefault();
    setIsLogged(true);
    setScreen('dashboard');
  };

  const handleRegister = (e) => {
    e.preventDefault();
    if (!aceitaLgpd) {
      alert('Você precisa aceitar os Termos de Privacidade (LGPD) para prosseguir com o cadastro.');
      return;
    }
    alert('Cadastro realizado com sucesso! Faça login.');
    setScreen('login');
  };

  // Funções de Lista
  const adicionarItem = (e) => {
    e.preventDefault();
    if (!novoItemNome.trim()) return;
    setListas(listas.map(l => {
      if (l.id === listaAtivaId) {
        return {
          ...l,
          itens: [...l.itens, { id: Date.now(), nome: novoItemNome.toUpperCase(), qtd: novoItemQtd, un: 'UN', marcado: false }]
        };
      }
      return l;
    }));
    setNovoItemNome('');
    setNovoItemQtd(1);
  };

  const removerItem = (listaId, itemId) => {
    setListas(listas.map(l => {
      if (l.id === listaId) {
        return { ...l, itens: l.itens.filter(i => i.id !== itemId) };
      }
      return l;
    }));
  };

  const toggleCheck = (listaId, itemId) => {
    setListas(listas.map(l => {
      if (l.id === listaId) {
        return {
          ...l,
          itens: l.itens.map(i => i.id === itemId ? { ...i, marcado: !i.marcado } : i)
        };
      }
      return l;
    }));
  };

  // Geolocalização
  const obterLocalizacao = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUsandoGeo(true);
          alert(`Localização obtida com sucesso! Buscando mercados próximos.`);
        },
        () => alert('Não foi possível obter sua localização.')
      );
    } else {
      alert('Seu navegador não suporta geolocalização.');
    }
  };

  const listaAtual = listas.find(l => l.id === listaAtivaId) || listas[0];

  // -------------------------------------------------------------
  // TELA DE LOGIN
  // -------------------------------------------------------------
  if (screen === 'login' && !isLogged) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0066a1] p-4 font-sans">
        <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-extrabold text-[#0d824d] flex items-center justify-center gap-2">
              <span className="text-3xl">🛒</span> TÁ QUANTO?
            </h1>
            <p className="text-gray-600 text-sm font-medium">Faça login para gerenciar suas economias</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Nome de Usuário</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">👤</span>
                <input
                  type="text"
                  placeholder="Digite seu usuário"
                  value={usuario}
                  onChange={e => setUsuario(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#0d824d]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Senha</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">🔒</span>
                <input
                  type="password"
                  placeholder="Digite sua senha"
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#0d824d]"
                  required
                />
              </div>
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

  // -------------------------------------------------------------
  // TELA DE CADASTRO COM LGPD
  // -------------------------------------------------------------
  if (screen === 'register' && !isLogged) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0066a1] p-4 font-sans">
        <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-[#0066a1] flex items-center justify-center gap-2">
              <span className="text-2xl">👤⁺</span> Criar Conta
            </h1>
            <p className="text-gray-500 text-xs">Preencha seus dados para começar a poupar</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Nome Completo</label>
              <input
                type="text"
                placeholder="Ex: JOÃO DA SILVA"
                value={nomeCompleto}
                onChange={e => setNomeCompleto(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#0066a1]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">CPF (Apenas números)</label>
              <input
                type="text"
                placeholder="Ex: 12345678901"
                value={cpf}
                onChange={e => setCpf(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#0066a1]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Nome de Usuário (Username)</label>
              <input
                type="text"
                placeholder="Ex: jsilva"
                value={usuario}
                onChange={e => setUsuario(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#0066a1]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Senha</label>
              <input
                type="password"
                placeholder="Crie uma senha forte"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#0066a1]"
                required
              />
            </div>

            {/* Aceite de LGPD */}
            <div className="flex items-start gap-2 pt-2">
              <input
                type="checkbox"
                id="lgpd"
                checked={aceitaLgpd}
                onChange={e => setAceitaLgpd(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-[#0066a1] focus:ring-[#0066a1]"
                required
              />
              <label htmlFor="lgpd" className="text-xs text-gray-600 leading-tight">
                Li e concordo com os <span className="text-[#0066a1] font-bold underline cursor-pointer">Termos de Uso</span> e a Política de Privacidade (LGPD) para o tratamento dos meus dados.
              </label>
            </div>

            <button type="submit" className="w-full bg-[#1877f2] hover:bg-[#1162cd] text-white py-3 rounded-full font-bold text-sm transition-colors shadow-md mt-4">
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

  // -------------------------------------------------------------
  // TELA DE COMPARAÇÃO DE PREÇOS
  // -------------------------------------------------------------
  if (screen === 'comparison') {
    return (
      <div className="min-h-screen bg-[#f4f6f8] p-6 font-sans">
        <div className="max-w-5xl mx-auto space-y-6">
          <header className="flex justify-between items-center">
            <div>
              <span className="text-xs font-bold text-gray-400 tracking-wider uppercase">Análise de Economia Avançada</span>
              <h1 className="text-2xl font-black text-gray-800">{listaAtual.nome}</h1>
            </div>
            <button onClick={() => setScreen('dashboard')} className="text-sm font-bold text-[#0066a1] hover:underline">
              ← Voltar para Minha Lista
            </button>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-semibold">Produtos na Lista</p>
                <p className="text-2xl font-black text-gray-800">{listaAtual.itens.length}</p>
              </div>
              <span className="text-3xl text-blue-200">🧺</span>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-semibold">Mercados Avaliados</p>
                <p className="text-2xl font-black text-gray-800">{mercadosSelecionados.length}</p>
              </div>
              <span className="text-3xl text-emerald-200">🏪</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border-2 border-blue-500 space-y-4">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
              <div>
                <h2 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                  <span className="text-red-500">📍</span> Mercados Próximos e Filtros
                </h2>
                <p className="text-xs text-gray-500">Selecione quais estabelecimentos deseja incluir na comparação</p>
              </div>

              <button
                onClick={obterLocalizacao}
                className="border-2 border-blue-500 text-blue-600 font-bold px-4 py-2 rounded-full text-xs hover:bg-blue-50 transition-colors flex items-center gap-2 self-start md:self-auto"
              >
                <span>🌐</span> {usandoGeo ? 'Localização Ativada' : 'Usar Minha Localização'}
              </button>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {['ASSAÍ INTERLAGOS', 'FORT ATACADISTA NAÇÕES UNIDAS'].map((mercado, idx) => (
                <label key={idx} className="flex items-center gap-2 bg-blue-50 text-blue-900 text-xs font-bold px-3 py-2 rounded-lg border border-blue-200 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded text-blue-600 focus:ring-0" />
                  {mercado}
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center space-y-3 min-h-[250px]">
              <span className="text-4xl text-gray-400">⚖️</span>
              <h3 className="font-bold text-gray-700 text-sm">Dados insuficientes ou nenhum mercado selecionado</h3>
              <p className="text-xs text-gray-400 max-w-sm">
                Selecione pelo menos um mercado na caixa acima ou insira cupons fiscais para gerar o comparativo.
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="text-xs font-bold text-gray-700 flex items-center gap-1">
                  ≡ Produtos Solicitados
                </h3>
                <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full font-bold">
                  {listaAtual.itens.length}
                </span>
              </div>

              <div className="space-y-3">
                {listaAtual.itens.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 text-xs font-bold text-gray-700 border-b pb-2 last:border-b-0">
                    <span className="text-blue-600 font-extrabold">{item.qtd}x</span>
                    <span>{item.nome}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // TELA DE DASHBOARD / LISTA PRINCIPAL
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#f4f6f8] p-6 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <header className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border">
          <h1 className="text-xl font-extrabold text-[#0d824d] flex items-center gap-2">
            🛒 TÁ QUANTO?
          </h1>
          <button onClick={() => { setIsLogged(false); setScreen('login'); }} className="text-xs font-bold text-red-500 hover:underline">
            Sair da Conta
          </button>
        </header>

        {/* Seção Criar Nova Lista */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
            <span className="text-blue-600">➕</span> Criar Nova Lista de Compras
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="EX: COMPRAS DO MÊS, CHURRASCO, LIMPEZA..."
              value={novaListaNome}
              onChange={e => setNovaListaNome(e.target.value)}
              className="flex-1 px-4 py-2 border rounded-xl text-xs uppercase focus:outline-none focus:border-blue-500"
            />
            <button className="bg-[#1877f2] hover:bg-[#1162cd] text-white px-5 py-2 rounded-xl text-xs font-bold transition-colors">
              + Criar Lista
            </button>
          </div>
        </div>

        {/* Card Principal da Lista */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div>
              <h2 className="text-lg font-black text-gray-800">{listaAtual.nome}</h2>
              <p className="text-xs text-gray-400">Criada em: {listaAtual.data}</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setScreen('comparison')}
                className="bg-[#0d824d] hover:bg-[#0a673d] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors flex items-center gap-2 shadow-sm"
              >
                📊 Comparar Preços
              </button>

              <button
                onClick={() => setShowQrModal(true)}
                className="border border-blue-500 text-blue-600 hover:bg-blue-50 text-xs font-bold px-4 py-2.5 rounded-xl transition-colors flex items-center gap-2"
              >
                📱 Bipar Cupom
              </button>

              <button className="border border-red-200 text-red-500 hover:bg-red-50 p-2.5 rounded-xl transition-colors text-xs">
                🗑️
              </button>
            </div>
          </div>

          <form onSubmit={adicionarItem} className="p-4 bg-gray-50 border-b flex gap-2">
            <input
              type="text"
              placeholder="DIGITE O NOME DO ITEM..."
              value={novoItemNome}
              onChange={e => setNovoItemNome(e.target.value)}
              className="flex-1 px-4 py-2 border rounded-xl text-xs uppercase bg-white focus:outline-none focus:border-blue-500"
            />
            <input
              type="number"
              min="1"
              value={novoItemQtd}
              onChange={e => setNovoItemQtd(Number(e.target.value))}
              className="w-16 px-3 py-2 border rounded-xl text-xs text-center font-bold bg-white focus:outline-none"
            />
            <button type="submit" className="bg-[#1877f2] hover:bg-[#1162cd] text-white px-5 py-2 rounded-xl text-xs font-bold transition-colors">
              + Adicionar
            </button>
          </form>

          <div className="divide-y">
            {listaAtual.itens.map(item => (
              <div key={item.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={item.marcado}
                    onChange={() => toggleCheck(listaAtual.id, item.id)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-0 cursor-pointer"
                  />
                  <span className={`text-xs font-bold ${item.marcado ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                    {item.nome}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={item.qtd}
                    readOnly
                    className="w-8 text-center border rounded py-0.5 text-xs font-bold text-gray-600 bg-white"
                  />
                  <span className="text-xs text-gray-400 font-bold">UN</span>
                  <button onClick={() => removerItem(listaAtual.id, item.id)} className="text-red-500 text-xs font-bold hover:underline">
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal Bipar QR Code COM CÂMERA AO VIVO */}
        {showQrModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
              <div className="flex justify-between items-center border-b pb-2">
                <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                  📱 Bipar QR Code do Cupom Fiscal
                </h3>
                <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
              </div>

              {/* Área do leitor de Câmera */}
              <div className="space-y-3">
                {!cameraActive ? (
                  <button
                    onClick={() => setCameraActive(true)}
                    className="w-full bg-[#1877f2] hover:bg-[#1162cd] text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm"
                  >
                    📷 Abrir Câmera do Celular
                  </button>
                ) : (
                  <div className="space-y-2">
                    <div id="reader" className="w-full overflow-hidden rounded-xl border-2 border-blue-500 bg-black"></div>
                    <button
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
                  className="w-full px-3 py-2 border rounded-xl text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button onClick={handleCloseModal} className="px-4 py-2 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-100">
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (!qrUrl) return alert('Por favor, leia o QR Code ou cole a URL.');
                    alert('Cupom processado com sucesso!');
                    handleCloseModal();
                    setQrUrl('');
                  }}
                  className="bg-[#0d824d] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#0a673d]"
                >
                  Importar Cupom
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}