import React, { useState } from 'react';

interface P2PManager {
  connectedPeers: string[];
  sendMessage: (message: string) => void;
}

interface MessageInputProps {
  p2pManager: P2PManager | null;
  disabled?: boolean;
}

const MessageInput: React.FC<MessageInputProps> = ({ p2pManager, disabled = false }) => {
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || !p2pManager || disabled) {
      return;
    }

    p2pManager.sendMessage(message.trim());
    setMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const isConnected = p2pManager?.connectedPeers?.length > 0;
  const isDisabled = disabled || !p2pManager || !isConnected;

  return (
    <div className="border-t bg-white p-4">
      <div className="flex space-x-2">
        <div className="flex-1">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              !p2pManager 
                ? "Conectando..." 
                : !isConnected 
                  ? "Aguardando conexão..." 
                  : "Digite sua mensagem..."
            }
            disabled={isDisabled}
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              isDisabled ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
            rows={1}
            style={{ minHeight: '40px', maxHeight: '120px' }}
          />
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isDisabled || !message.trim()}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            isDisabled || !message.trim()
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
        >
          Enviar
        </button>
      </div>
      
      {p2pManager && (
        <div className="mt-2 text-xs text-gray-500">
          {isConnected 
            ? `Conectado a ${p2pManager.connectedPeers.length} peer${p2pManager.connectedPeers.length !== 1 ? 's' : ''}`
            : 'Desconectado'
          }
        </div>
      )}
    </div>
  );
};

export default MessageInput;