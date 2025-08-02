import React from 'react';
import { useP2PChat } from './hooks/useP2PChat';
import MessageList from './components/MessageList';
import MessageInput from './components/MessageInput';
import ConnectionStatus from './components/ConnectionStatus';

function App() {
  // Verificar se o hook está sendo importado corretamente
  if (typeof useP2PChat !== 'function') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <strong className="font-bold">Erro de Importação!</strong>
          <span className="block sm:inline"> O hook useP2PChat não foi importado corretamente.</span>
        </div>
      </div>
    );
  }

  let hookResult;
  try {
    hookResult = useP2PChat();
  } catch (error) {
    console.error('Erro ao executar useP2PChat:', error);
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <strong className="font-bold">Erro de Execução!</strong>
          <span className="block sm:inline"> {error instanceof Error ? error.message : 'Erro desconhecido'}</span>
        </div>
      </div>
    );
  }

  // Verificar se o hook retornou um resultado válido
  if (!hookResult || typeof hookResult !== 'object') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          <strong className="font-bold">Resultado Inválido!</strong>
          <span className="block sm:inline"> O hook useP2PChat não retornou um objeto válido.</span>
        </div>
      </div>
    );
  }

  const { 
    p2pManager, 
    isInitialized, 
    isLoading, 
    error, 
    connectionStatus, 
    reconnect 
  } = hookResult;

  // Exibir erro se houver
  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-6 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              <strong className="font-bold">Erro de Conexão</strong>
              <p className="mt-2">{error}</p>
            </div>
            <button 
              onClick={reconnect}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Tentar Reconectar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Exibir loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            <span className="text-gray-700">Inicializando Chat P2P...</span>
          </div>
        </div>
      </div>
    );
  }

  // Interface principal
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-800">
                Chat P2P
              </h1>
              <ConnectionStatus status={connectionStatus} />
            </div>
          </div>
        </header>

        {/* Main Chat Area */}
        <main className="flex flex-col h-[calc(100vh-80px)]">
          {isInitialized && p2pManager ? (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-hidden">
                <MessageList p2pManager={p2pManager} />
              </div>
              
              {/* Message Input */}
              <div className="bg-white border-t p-4">
                <MessageInput p2pManager={p2pManager} />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-gray-500">
                <p className="text-lg mb-2">Chat P2P não inicializado</p>
                <p className="text-sm">Aguardando conexão...</p>
                <button 
                  onClick={reconnect}
                  className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                >
                  Tentar Conectar
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;