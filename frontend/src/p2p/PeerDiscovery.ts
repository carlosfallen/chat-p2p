/**
 * Serviço de descoberta de peers via discovery server
 */

import { io, Socket } from 'socket.io-client';
import { Peer, WebRTCSignal, ClientToServerEvents, ServerToClientEvents } from '../types';

export interface PeerDiscoveryConfig {
  discoveryServerUrl: string;
  nickname: string;
  rooms: string[];
  publicKey: string;
  heartbeatInterval: number;
  reconnectAttempts: number;
}

export class PeerDiscovery {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
  private config: PeerDiscoveryConfig;
  private heartbeatTimer: number | null = null;
  private reconnectAttempts = 0;
  private isConnected = false;

  // Callbacks
  public onPeerDiscovered?: (peer: Peer) => void;
  public onPeerJoined?: (peer: Peer) => void;
  public onPeerLeft?: (peerId: string) => void;
  public onWebRTCSignal?: (signal: WebRTCSignal) => void;
  public onConnectionChange?: (connected: boolean) => void;

  constructor(config: PeerDiscoveryConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    if (this.socket?.connected) {
      return;
    }

    try {
      this.socket = io(this.config.discoveryServerUrl, {
        transports: ['websocket', 'polling'],
        timeout: 10000,
        reconnectionAttempts: this.config.reconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000
      });

      this.setupSocketListeners();
      
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Timeout na conexão com discovery server'));
        }, 10000);

        this.socket!.on('connect', () => {
          clearTimeout(timeout);
          console.log('Conectado ao discovery server');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.registerPeer();
          this.startHeartbeat();
          this.onConnectionChange?.(true);
          resolve();
        });

        this.socket!.on('connect_error', (error) => {
          clearTimeout(timeout);
          console.error('Erro na conexão:', error);
          reject(error);
        });
      });
    } catch (error) {
      console.error('Erro ao conectar ao discovery server:', error);
      throw error;
    }
  }

  private setupSocketListeners(): void {
    if (!this.socket) return;

    this.socket.on('peer_list', (peers: Peer[]) => {
      console.log(`Descobertos ${peers.length} peers`);
      peers.forEach(peer => {
        this.onPeerDiscovered?.(peer);
      });
    });

    this.socket.on('peer_joined', (peer: Peer) => {
      console.log(`Peer ${peer.nickname} entrou`);
      this.onPeerJoined?.(peer);
    });

    this.socket.on('peer_left', (peerId: string) => {
      console.log(`Peer ${peerId} saiu`);
      this.onPeerLeft?.(peerId);
    });

    this.socket.on('webrtc_signal', (signal: WebRTCSignal) => {
      console.log(`Sinal WebRTC recebido de ${signal.from}`);
      this.onWebRTCSignal?.(signal);
    });

    this.socket.on('room_created', (room) => {
      console.log('Sala criada:', room);
    });

    this.socket.on('error', (message: string) => {
      console.error('Erro do servidor:', message);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Desconectado do discovery server:', reason);
      this.isConnected = false;
      this.stopHeartbeat();
      this.onConnectionChange?.(false);

      // Tentar reconectar se não foi desconexão intencional
      if (reason !== 'io client disconnect') {
        this.attemptReconnect();
      }
    });

    this.socket.on('reconnect', () => {
      console.log('Reconectado ao discovery server');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.registerPeer();
      this.startHeartbeat();
      this.onConnectionChange?.(true);
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('Erro na reconexão:', error);
      this.reconnectAttempts++;
    });

    this.socket.on('reconnect_failed', () => {
      console.error('Falha na reconexão após várias tentativas');
      this.onConnectionChange?.(false);
    });
  }

  private registerPeer(): void {
    if (!this.socket?.connected) return;

    this.socket.emit('peer_register', {
      nickname: this.config.nickname,
      rooms: this.config.rooms,
      publicKey: this.config.publicKey
    });
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    this.heartbeatTimer = window.setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('peer_heartbeat');
      }
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.config.reconnectAttempts) {
      console.error('Máximo de tentativas de reconexão atingido');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    console.log(`Tentando reconectar em ${delay}ms...`);
    
    setTimeout(() => {
      this.connect().catch(error => {
        console.error('Erro na tentativa de reconexão:', error);
      });
    }, delay);
  }

  sendWebRTCSignal(signal: WebRTCSignal): void {
    if (!this.socket?.connected) {
      console.warn('Socket não conectado - não é possível enviar sinal');
      return;
    }

    this.socket.emit('webrtc_signal', signal);
  }

  discoverPeers(roomId: string): void {
    if (!this.socket?.connected) {
      console.warn('Socket não conectado - não é possível descobrir peers');
      return;
    }

    this.socket.emit('peer_discover', roomId);
  }

  joinRoom(roomId: string): void {
    if (!this.socket?.connected) {
      console.warn('Socket não conectado - não é possível entrar na sala');
      return;
    }

    this.socket.emit('join_room', roomId);
  }

  leaveRoom(roomId: string): void {
    if (!this.socket?.connected) {
      console.warn('Socket não conectado - não é possível sair da sala');
      return;
    }

    this.socket.emit('leave_room', roomId);
  }

  createRoom(name: string, isPrivate: boolean = false): void {
    if (!this.socket?.connected) {
      console.warn('Socket não conectado - não é possível criar sala');
      return;
    }

    this.socket.emit('create_room', { name, isPrivate });
  }

  updateConfig(newConfig: Partial<PeerDiscoveryConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Se mudou as salas, re-registrar
    if (newConfig.rooms && this.isConnected) {
      this.registerPeer();
    }
  }

  getConnectionStatus(): { connected: boolean; attempts: number } {
    return {
      connected: this.isConnected,
      attempts: this.reconnectAttempts
    };
  }

  disconnect(): void {
    this.stopHeartbeat();
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.isConnected = false;
    this.onConnectionChange?.(false);
  }
}