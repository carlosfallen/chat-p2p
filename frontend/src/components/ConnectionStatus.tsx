import React from 'react';

interface ConnectionStatusProps {
  status: 'disconnected' | 'connecting' | 'connected';
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ status }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return 'bg-green-500';
      case 'connecting':
        return 'bg-yellow-500';
      case 'disconnected':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return 'Conectado';
      case 'connecting':
        return 'Conectando...';
      case 'disconnected':
        return 'Desconectado';
      default:
        return 'Desconhecido';
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <div className={`w-3 h-3 rounded-full ${getStatusColor()} ${status === 'connecting' ? 'animate-pulse' : ''}`}></div>
      <span className="text-sm text-gray-600">{getStatusText()}</span>
    </div>
  );
};

export default ConnectionStatus;