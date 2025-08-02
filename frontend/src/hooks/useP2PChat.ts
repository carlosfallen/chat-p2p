import { useEffect, useRef, useState } from 'react';

interface P2PManager {
  initialize(): Promise<void>;
  cleanup(): Promise<void>;
  isReady: boolean;
  connectedPeers: string[];
  peerId: string;
  onMessage: (handler: (message: any) => void) => void;
  onConnectionChange: (handler: (peerId: string, status: string) => void) => void;
  sendMessage: (message: string) => void;
}

interface UseP2PChatReturn {
  p2pManager: P2PManager | null;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  connectionStatus: 'disconnected' | 'connecting' | 'connected';
  reconnect: () => Promise<void>;
  cleanup: () => Promise<void>;
}

class MockP2PManager implements P2PManager {
  isReady = false;
  connectedPeers: string[] = [];
  peerId: string = `peer-${Math.random().toString(36).substr(2, 9)}`;
  private messageHandlers: ((message: any) => void)[] = [];
  private connectionHandlers: ((peerId: string, status: string) => void)[] = [];

  async initialize(): Promise<void> {
    console.log('Mock P2P Manager inicializando...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    this.isReady = true;
    this.connectedPeers = [`peer-${Math.random().toString(36).substr(2, 6)}`];
    console.log('Mock P2P Manager inicializado');
  }

  async cleanup(): Promise<void> {
    console.log('Mock P2P Manager fazendo cleanup...');
    this.isReady = false;
    this.connectedPeers = [];
    this.messageHandlers = [];
    this.connectionHandlers = [];
  }

  onMessage(handler: (message: any) => void): void {
    this.messageHandlers.push(handler);
  }

  onConnectionChange(handler: (peerId: string, status: string) => void): void {
    this.connectionHandlers.push(handler);
  }

  sendMessage(message: string): void {
    console.log('Enviando mensagem:', message);
    const messageObj = {
      id: `msg-${Date.now()}`,
      text: message,
      sender: this.peerId,
      timestamp: Date.now(),
      type: 'text' as const
    };
    
    setTimeout(() => {
      this.messageHandlers.forEach(handler => handler(messageObj));
    }, 100);
  }
}

export const useP2PChat = (): UseP2PChatReturn => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  
  const p2pManagerRef = useRef<P2PManager | null>(null);
  const initializationRef = useRef<boolean>(false);

  const initializeP2P = async () => {
    if (initializationRef.current) {
      console.log('Inicialização já em andamento...');
      return;
    }

    initializationRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      console.log('Iniciando P2P Chat (modo mock)...');
      
      if (p2pManagerRef.current) {
        await p2pManagerRef.current.cleanup();
        p2pManagerRef.current = null;
      }

      p2pManagerRef.current = new MockP2PManager();
      
      setConnectionStatus('connecting');
      await p2pManagerRef.current.initialize();
      
      setIsInitialized(true);
      setConnectionStatus('connected');
      console.log('P2P Chat inicializado com sucesso (mock)');
      
    } catch (error) {
      console.error('Erro ao inicializar P2P Chat:', error);
      setError(error instanceof Error ? error.message : 'Erro desconhecido');
      setConnectionStatus('disconnected');
      
      if (p2pManagerRef.current) {
        try {
          await p2pManagerRef.current.cleanup();
        } catch (cleanupError) {
          console.error('Erro durante cleanup:', cleanupError);
        }
        p2pManagerRef.current = null;
      }
    } finally {
      setIsLoading(false);
      initializationRef.current = false;
    }
  };

  const cleanup = async () => {
    if (p2pManagerRef.current) {
      try {
        await p2pManagerRef.current.cleanup();
      } catch (error) {
        console.error('Erro durante cleanup:', error);
      } finally {
        p2pManagerRef.current = null;
        setIsInitialized(false);
        setConnectionStatus('disconnected');
      }
    }
  };

  const reconnect = async () => {
    setError(null);
    await cleanup();
    await initializeP2P();
  };

  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      if (isMounted) {
        await initializeP2P();
      }
    };

    initialize();

    return () => {
      isMounted = false;
      
      setTimeout(() => {
        if (p2pManagerRef.current) {
          cleanup();
        }
      }, 0);
    };
  }, []);

  return {
    p2pManager: p2pManagerRef.current,
    isInitialized,
    isLoading,
    error,
    connectionStatus,
    reconnect,
    cleanup
  };
};

export default useP2PChat;