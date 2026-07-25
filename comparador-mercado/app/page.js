'use client';

import React, { useState } from 'react';

export default function Page() {
  // Estados para controle de tela, modais e dados
  const [screen, setScreen] = useState('comparison'); // 'dashboard' ou 'comparison'
  const [showQrModal, setShowQrModal] = useState(false);
  
  // Exemplo de lista atual para testes
  const [listaAtualComparacao, setListaAtualComparacao] = useState({
    nome: 'Minhas Compras do Mês',
    itens: [
      { id: 1, nome: 'Arroz 5kg', precoMercadoA: 25.90, precoMercadoB: 22.50 },
      { id: 2, nome: 'Feijão 1kg', precoMercadoA: 8.50, precoMercadoB: 9.00 },
      { id: 3, nome: 'Óleo de Soja', precoMercadoA: 6.90, precoMercadoB: 6.20 },
    ],
  });

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 font-sans text-gray-800">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* ==================== TELA 1: DASHBOARD ==================== */}
        {screen === 'dashboard' && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border space-y-4">
            <h1 className="text-2xl font-black text-gray-800">Painel Principal (Dashboard)</h1>
            <p className="text-gray-600 text-sm">
              Selecione uma lista para ver e comparar as economias ou bipar um novo cupom fiscal.
            </p>
            <button
              type="button"
              onClick={() => setScreen('comparison')}
              className="bg-[#1877f2] hover:bg-[#1162cd] text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-colors cursor-pointer"
            >
              Ver Lista de Comparação →
            </button>
          </div>
        )}

        {/* ==================== TELA 2: COMPARAÇÃO ==================== */}
        {screen === 'comparison' && (
          <div className="space-y-6">
            
            {/* CABEÇALHO CORRIGIDO */}
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border">
              <div>
                <span className="text-xs font-bold text-gray-400 tracking-wider uppercase">Análise de Economia</span>
                <h1 className="text-xl sm:text-2xl font-black text-gray-800">{listaAtualComparacao.nome}</h1>
              </div>

              {/* Botoes totalmente independentes e com clique corrigido */}
              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                
                {/* BOTÃO 1: BIPAR CUPOM (Abre o Modal) */}
                <button
                  type="button"
                  onClick={() => setShowQrModal(true)}
                  className="relative z-10 bg-[#1877f2] hover:bg-[#1162cd] text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-sm transition-colors cursor-pointer select-none"
                >
                  <span>📱</span> Bipar Cupom
                </button>

                {/* BOTÃO 2: VOLTAR (Retorna para Dashboard) */}
                <button 
                  type="button"
                  onClick={() => setScreen('dashboard')} 
                  className="relative z-10 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-3 py-2.5 rounded-xl text-xs transition-colors cursor-pointer select-none"
                >
                  ← Voltar
                </button>

              </div>
            </header>

            {/* TABELA DE ITENS DA COMPARACAO */}
            <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b text-xs font-bold text-gray-500 uppercase">
                    <th className="p-4">Produto</th>
                    <th className="p-4">Mercado A</th>
                    <th className="p-4">Mercado B</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-sm">
                  {listaAtualComparacao.itens.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/50">
                      <td className="p-4 font-medium text-gray-800">{item.nome}</td>
                      <td className="p-4 text-gray-600">R$ {item.precoMercadoA.toFixed(2)}</td>
                      <td className="p-4 text-gray-600">R$ {item.precoMercadoB.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* ==================== MODAL DO LEITOR QR CODE ==================== */}
        {showQrModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-xl relative animate-in fade-in zoom-in duration-150">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-800">Escanear Cupom Fiscal</h3>
                <button
                  type="button"
                  onClick={() => setShowQrModal(false)}
                  className="text-gray-400 hover:text-gray-600 font-bold p-1 rounded-lg transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Área Simulada da Câmera */}
              <div className="bg-gray-900 aspect-square rounded-xl flex flex-col items-center justify-center text-white p-4 text-center border-2 border-dashed border-gray-600">
                <span className="text-4xl mb-2">📷</span>
                <p className="text-xs text-gray-300">Aponte a câmera para o QR Code do seu cupom fiscal</p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowQrModal(false)}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl text-xs transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}