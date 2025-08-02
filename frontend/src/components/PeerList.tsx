/**
 * Lista de peers conectados
 */

import React from 'react';
import { Users, Wifi, Signal } from 'lucide-react';
import { Peer, ConnectionState } from '../types';

interface PeerListProps {
  peers: Peer[];
  connectionStates?: ConnectionState[];
  currentUserId?: string;
  className?: string;
}

export function PeerList({ 
  peers, 
  connectionStates = [], 
  currentUserId,
  className = '' 
}: PeerListProps) {
  const getConnectionState = (peerId: string): ConnectionState | undefined => {
    return connectionStates.find(state => state.peerId === peerId);
  };

  const getConnectionIcon = (state?: ConnectionState) => {
    if (!state) return <div className="h-2 w-2 bg-gray-400 rounded-full" />;
    
    switch (state.state) {
      case 'connected':
        return <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />;
      case 'connecting':
        return <div className="h-2 w-2 bg-yellow-500 rounded-full animate-pulse" />;
      case 'disconnected':
      case 'failed':
        return <div className="h-2 w-2 bg-red-500 rounded-full" />;
      default:
        return <div className="h-2 w-2 bg-gray-400 rounded-full" />;
    }
  };

  const getLatencyColor = (latency: number) => {
    if (latency < 10) return 'text-green-500';
    if (latency < 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  const formatLatency = (latency: number) => {
    return latency > 0 ? `${latency.toFixed(0)}ms` : 'N/A';
  };

  if (peers.length === 0) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 ${className}`}>
        <div className="flex items-center mb-4">
          <Users className="h-5 w-5 text-gray-500 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Peers Conectados
          </h3>
        </div>
        
        <div className="text-center text-gray-500 dark:text-gray-400">
          <Wifi className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Nenhum peer conectado</p>
          <p className="text-sm">Aguardando outras pessoas entrarem...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md ${className}`}>
      {/* Cabeçalho */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center">
          <Users className="h-5 w-5 text-gray-500 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Peers Conectados
          </h3>
        </div>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {peers.length} online
        </span>
      </div>

      {/* Lista de peers */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {peers.map((peer) => {
          const connectionState = getConnectionState(peer.id);
          const isCurrentUser = peer.id === currentUserId;
          
          return (
            <div
              key={peer.id}
              className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center justify-between">
                {/* Info do peer */}
                <div className="flex items-center space-x-3">
                  {/* Avatar/Status */}
                  <div className="relative">
                    <div className="h-8 w-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-medium text-sm">
                      {peer.nickname ? peer.nickname.charAt(0).toUpperCase() : 'P'}
                    </div>
                    <div className="absolute -bottom-1 -right-1">
                      {getConnectionIcon(connectionState)}
                    </div>
                  </div>

                  {/* Nome e ID */}
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {peer.nickname || 'Peer Anônimo'}
                      </span>
                      {isCurrentUser && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                          Você
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                      {peer.id.slice(0, 12)}...
                    </span>
                  </div>
                </div>

                {/* Métricas de conexão */}
                <div className="flex items-center space-x-4 text-sm">
                  {/* Latência */}
                  {connectionState && connectionState.latency > 0 && (
                    <div className="flex items-center space-x-1">
                      <Signal className="h-4 w-4 text-gray-400" />
                      <span className={getLatencyColor(connectionState.latency)}>
                        {formatLatency(connectionState.latency)}
                      </span>
                    </div>
                  )}

                  {/* Tipo de conexão */}
                  <div className="flex items-center space-x-1">
                    <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-2 py-1 rounded">
                      P2P
                    </span>
                  </div>
                </div>
              </div>

              {/* Informações adicionais */}
              {connectionState && (
                <div className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>
                    Estado: <span className="capitalize">{connectionState.state}</span>
                  </span>
                  {connectionState.lastMessage > 0 && (
                    <span>
                      Última msg: {new Date(connectionState.lastMessage).toLocaleTimeString()}
                    </span>
                  )}
                </div>
              )}

              {/* Salas em comum */}
              {peer.rooms.length > 0 && (
                <div className="mt-2">
                  <div className="flex flex-wrap gap-1">
                    {peer.rooms.slice(0, 3).map((room) => (
                      <span
                        key={room}
                        className="text-xs bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 px-2 py-1 rounded"
                      >
                        #{room}
                      </span>
                    ))}
                    {peer.rooms.length > 3 && (
                      <span className="text-xs text-gray-500">
                        +{peer.rooms.length - 3} mais
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}