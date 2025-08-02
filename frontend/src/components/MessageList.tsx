import React, { useState, useEffect, useRef } from 'react';
import { P2PManager } from '../p2p/P2PManager';

interface Message {
  id: string;
  text: string;
  sender: string;
  timestamp: number;
  type: 'text' | 'system';
}

interface MessageListProps {
  p2pManager: P2PManager;
}

const MessageList: React.FC<MessageListProps> = ({ p2pManager }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [connectedPeers, setConnectedPeers] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const welcomeMessage: Message = {
      id: 'welcome',
      text: 'Bem-vindo ao Chat P2P! 🚀',
      sender: 'Sistema',
      timestamp: Date.now(),
      type: 'system'
    };
    setMessages([welcomeMessage]);

    const handleMessage = (message: Message) => {
      setMessages(prev => {
        if (prev.some(m => m.id === message.id)) {
          return prev;
        }
        return [...prev, message];
      });
    };

    const handleConnectionChange = (peerId: string, status: string) => {
      const systemMessage: Message = {
        id: `connection-${peerId}-${Date.now()}`,
        text: status === 'connected' 
          ? `🟢 Usuário ${peerId.slice(-6)} se conectou`
          : `🔴 Usuário ${peerId.slice(-6)} se desconectou`,
        sender: 'Sistema',
        timestamp: Date.now(),
        type: 'system'
      };
      setMessages(prev => [...prev, systemMessage]);
      setConnectedPeers(p2pManager.connectedPeers);
    };

    p2pManager.onMessage(handleMessage);
    p2pManager.onConnectionChange(handleConnectionChange);
    setConnectedPeers(p2pManager.connectedPeers);

    return () => {};
  }, [p2pManager]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (timestamp: number) => {
    const messageDate = new Date(timestamp).toDateString();
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    
    if (messageDate === today) return 'Hoje';
    if (messageDate === yesterday) return 'Ontem';
    return new Date(timestamp).toLocaleDateString('pt-BR');
  };

  const groupedMessages = messages.reduce((groups: { [key: string]: Message[] }, message) => {
    const date = formatDate(message.timestamp);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {});

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-lg mb-2">Carregando chat...</p>
          <p className="text-sm">Conectando aos peers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {Object.entries(groupedMessages).map(([date, dateMessages]) => (
          <div key={date}>
            <div className="flex justify-center mb-4">
              <span className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full">
                {date}
              </span>
            </div>
            
            {dateMessages.map((message) => (
              <div
                key={message.id}
                className={`flex mb-3 ${
                  message.type === 'system' ? 'justify-center' : 
                  message.sender === p2pManager.peerId ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.type === 'system' ? (
                  <div className="bg-gray-100 text-gray-600 text-sm px-3 py-2 rounded-lg max-w-xs text-center">
                    {message.text}
                  </div>
                ) : (
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.sender === p2pManager.peerId
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-800'
                    }`}
                  >
                    {message.sender !== p2pManager.peerId && (
                      <div className="text-xs font-semibold mb-1 opacity-75">
                        {message.sender.slice(-6)}
                      </div>
                    )}
                    <div className="break-words">{message.text}</div>
                    <div
                      className={`text-xs mt-1 ${
                        message.sender === p2pManager.peerId
                          ? 'text-blue-100'
                          : 'text-gray-500'
                      }`}
                    >
                      {formatTime(message.timestamp)}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      {connectedPeers.length > 0 && (
        <div className="bg-gray-50 px-4 py-2 border-t">
          <div className="text-xs text-gray-600">
            Online: {connectedPeers.length} peer{connectedPeers.length !== 1 ? 's' : ''}
            {connectedPeers.length > 0 && (
              <span className="ml-2">
                ({connectedPeers.map(id => id.slice(-6)).join(', ')})
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageList;