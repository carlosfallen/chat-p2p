import { io, Socket } from 'socket.io-client';

// Interfaces
interface PeerConnection {
  id: string;
  connection: RTCPeerConnection;
  dataChannel?: RTCDataChannel;
  status: 'connecting' | 'connected' | 'disconnected';
}

interface Message {
  id: string;
  text: string;
  sender: string;
  timestamp: number;
  type: 'text' | 'system';
}

export class P2PManager {
  private socket: Socket | null = null;
  private peers: Map<string, PeerConnection> = new Map();
  private localStream: MediaStream | null = null;
  private isInitialized = false;
  private isCleaningUp = false;
  private messageHandlers: ((message: Message) => void)[] = [];
  private connectionHandlers: ((peerId: string, status: string) => void)[] = [];

  // Configuração WebRTC
  private rtcConfig: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  constructor() {
    console.log('🚀 Inicializando P2P Manager...');
  }

  async initialize(): Promise<void> {
    try {
      if (this.isInitialized) {
        console.warn('⚠️ P2P Manager já está inicializado');
        return;
      }

      // Conectar ao discovery server
      await this.connectToDiscoveryServer();
      
      // Configurar eventos do socket
      this.setupSocketEvents();

      this.isInitialized = true;
      console.log('✅ P2P Manager inicializado com sucesso');
    } catch (error) {
      console.error('❌ Erro ao inicializar P2P Manager:', error);
      await this.cleanup();
      throw error;
    }
  }

  private async connectToDiscoveryServer(): Promise<void> {
    const serverUrl = import.meta.env.VITE_DISCOVERY_SERVER || 'http://localhost:3003';
    
    return new Promise((resolve, reject) => {
      console.log('🔗 Conectando ao Discovery Server:', serverUrl);
      
      this.socket = io(serverUrl, {
        timeout: 10000,
        forceNew: true
      });

      this.socket.on('connect', () => {
        console.log('✅ Conectado ao Discovery Server:', this.socket?.id);
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ Erro ao conectar ao Discovery Server:', error);
        reject(new Error(`Falha na conexão com o servidor: ${error.message}`));
      });

      this.socket.on('disconnect', (reason) => {
        console.log('🔌 Desconectado do Discovery Server:', reason);
      });
    });
  }

  private setupSocketEvents(): void {
    if (!this.socket) return;

    // Eventos de descoberta de peers
    this.socket.on('peer-joined', (peerId: string) => {
      console.log('👤 Novo peer descoberto:', peerId);
      this.connectToPeer(peerId, true);
    });

    this.socket.on('peer-left', (peerId: string) => {
      console.log('👋 Peer saiu:', peerId);
      this.removePeer(peerId);
    });

    // Eventos de sinalização WebRTC
    this.socket.on('webrtc-offer', async (data: { from: string; offer: RTCSessionDescriptionInit }) => {
      console.log('📨 Recebida oferta WebRTC de:', data.from);
      await this.handleWebRTCOffer(data.from, data.offer);
    });

    this.socket.on('webrtc-answer', async (data: { from: string; answer: RTCSessionDescriptionInit }) => {
      console.log('📨 Recebida resposta WebRTC de:', data.from);
      await this.handleWebRTCAnswer(data.from, data.answer);
    });

    this.socket.on('webrtc-ice-candidate', async (data: { from: string; candidate: RTCIceCandidateInit }) => {
      console.log('🧊 Recebido ICE candidate de:', data.from);
      await this.handleICECandidate(data.from, data.candidate);
    });
  }

  private async connectToPeer(peerId: string, isInitiator: boolean): Promise<void> {
    try {
      console.log(`🤝 Conectando ao peer ${peerId} (initiator: ${isInitiator})`);

      const peerConnection = new RTCPeerConnection(this.rtcConfig);
      
      const peer: PeerConnection = {
        id: peerId,
        connection: peerConnection,
        status: 'connecting'
      };

      this.peers.set(peerId, peer);

      // Configurar eventos da conexão
      this.setupPeerConnectionEvents(peer);

      if (isInitiator) {
        // Criar data channel
        const dataChannel = peerConnection.createDataChannel('messages', {
          ordered: true
        });
        
        peer.dataChannel = dataChannel;
        this.setupDataChannelEvents(peer, dataChannel);

        // Criar oferta
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);

        // Enviar oferta via socket
        this.socket?.emit('webrtc-offer', {
          to: peerId,
          offer: offer
        });
      }

    } catch (error) {
      console.error(`❌ Erro ao conectar ao peer ${peerId}:`, error);
      this.removePeer(peerId);
    }
  }

  private setupPeerConnectionEvents(peer: PeerConnection): void {
    const { connection } = peer;

    connection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('🧊 Enviando ICE candidate para:', peer.id);
        this.socket?.emit('webrtc-ice-candidate', {
          to: peer.id,
          candidate: event.candidate
        });
      }
    };

    connection.onconnectionstatechange = () => {
      console.log(`🔄 Estado da conexão com ${peer.id}:`, connection.connectionState);
      
      if (connection.connectionState === 'connected') {
        peer.status = 'connected';
        this.notifyConnectionHandlers(peer.id, 'connected');
      } else if (connection.connectionState === 'disconnected' || connection.connectionState === 'failed') {
        peer.status = 'disconnected';
        this.notifyConnectionHandlers(peer.id, 'disconnected');
      }
    };

    connection.ondatachannel = (event) => {
      console.log('📡 Data channel recebido de:', peer.id);
      peer.dataChannel = event.channel;
      this.setupDataChannelEvents(peer, event.channel);
    };
  }

  private setupDataChannelEvents(peer: PeerConnection, dataChannel: RTCDataChannel): void {
    dataChannel.onopen = () => {
      console.log('✅ Data channel aberto com:', peer.id);
      peer.status = 'connected';
      this.notifyConnectionHandlers(peer.id, 'connected');
    };

    dataChannel.onclose = () => {
      console.log('❌ Data channel fechado com:', peer.id);
      peer.status = 'disconnected';
      this.notifyConnectionHandlers(peer.id, 'disconnected');
    };

    dataChannel.onmessage = (event) => {
      try {
        const message: Message = JSON.parse(event.data);
        console.log('📨 Mensagem recebida de', peer.id, ':', message.text);
        this.notifyMessageHandlers(message);
      } catch (error) {
        console.error('❌ Erro ao processar mensagem:', error);
      }
    };

    dataChannel.onerror = (error) => {
      console.error('❌ Erro no data channel com', peer.id, ':', error);
    };
  }

  private async handleWebRTCOffer(fromPeer: string, offer: RTCSessionDescriptionInit): Promise<void> {
    try {
      let peer = this.peers.get(fromPeer);
      
      if (!peer) {
        await this.connectToPeer(fromPeer, false);
        peer = this.peers.get(fromPeer);
      }

      if (!peer) {
        throw new Error('Falha ao criar conexão com peer');
      }

      await peer.connection.setRemoteDescription(offer);
      
      const answer = await peer.connection.createAnswer();
      await peer.connection.setLocalDescription(answer);

      this.socket?.emit('webrtc-answer', {
        to: fromPeer,
        answer: answer
      });

    } catch (error) {
      console.error('❌ Erro ao processar oferta WebRTC:', error);
    }
  }

  private async handleWebRTCAnswer(fromPeer: string, answer: RTCSessionDescriptionInit): Promise<void> {
    try {
      const peer = this.peers.get(fromPeer);
      if (peer) {
        await peer.connection.setRemoteDescription(answer);
      }
    } catch (error) {
      console.error('❌ Erro ao processar resposta WebRTC:', error);
    }
  }

  private async handleICECandidate(fromPeer: string, candidate: RTCIceCandidateInit): Promise<void> {
    try {
      const peer = this.peers.get(fromPeer);
      if (peer) {
        await peer.connection.addIceCandidate(candidate);
      }
    } catch (error) {
      console.error('❌ Erro ao processar ICE candidate:', error);
    }
  }

  private removePeer(peerId: string): void {
    const peer = this.peers.get(peerId);
    if (peer) {
      peer.dataChannel?.close();
      peer.connection.close();
      this.peers.delete(peerId);
      this.notifyConnectionHandlers(peerId, 'disconnected');
      console.log('🗑️ Peer removido:', peerId);
    }
  }

  // Métodos públicos
  async sendMessage(text: string): Promise<void> {
    const message: Message = {
      id: Date.now().toString(),
      text,
      sender: 'Você',
      timestamp: Date.now(),
      type: 'text'
    };

    console.log('📤 Enviando mensagem:', text);

    // Enviar para todos os peers conectados
    let sentCount = 0;
    for (const peer of this.peers.values()) {
      if (peer.status === 'connected' && peer.dataChannel?.readyState === 'open') {
        try {
          peer.dataChannel.send(JSON.stringify(message));
          sentCount++;
        } catch (error) {
          console.error(`❌ Erro ao enviar mensagem para ${peer.id}:`, error);
        }
      }
    }

    if (sentCount === 0) {
      console.warn('⚠️ Nenhum peer conectado para receber a mensagem');
    } else {
      console.log(`✅ Mensagem enviada para ${sentCount} peer(s)`);
    }

    // Notificar handlers localmente (para exibir a mensagem enviada)
    this.notifyMessageHandlers(message);
  }

  joinRoom(roomId: string): void {
    console.log('🚪 Entrando na sala:', roomId);
    this.socket?.emit('join-room', roomId);
  }

  leaveRoom(roomId: string): void {
    console.log('🚪 Saindo da sala:', roomId);
    this.socket?.emit('leave-room', roomId);
  }

  onMessage(handler: (message: Message) => void): void {
    this.messageHandlers.push(handler);
  }

  onConnectionChange(handler: (peerId: string, status: string) => void): void {
    this.connectionHandlers.push(handler);
  }

  private notifyMessageHandlers(message: Message): void {
    this.messageHandlers.forEach(handler => {
      try {
        handler(message);
      } catch (error) {
        console.error('❌ Erro no handler de mensagem:', error);
      }
    });
  }

  private notifyConnectionHandlers(peerId: string, status: string): void {
    this.connectionHandlers.forEach(handler => {
      try {
        handler(peerId, status);
      } catch (error) {
        console.error('❌ Erro no handler de conexão:', error);
      }
    });
  }

  async cleanup(): Promise<void> {
    if (this.isCleaningUp) {
      console.warn('⚠️ Cleanup já está em andamento');
      return;
    }

    this.isCleaningUp = true;
    console.log('🧹 Limpando P2P Manager...');

    try {
      // Fechar todas as conexões peer
      for (const peer of this.peers.values()) {
        peer.dataChannel?.close();
        peer.connection.close();
      }
      this.peers.clear();

      // Desconectar do discovery server
      if (this.socket) {
        this.socket.disconnect();
        this.socket = null;
      }

      // Limpar handlers
      this.messageHandlers = [];
      this.connectionHandlers = [];

      this.isInitialized = false;
      console.log('✅ P2P Manager limpo com sucesso');
      
    } catch (error) {
      console.error('❌ Erro durante cleanup do P2P Manager:', error);
    } finally {
      this.isCleaningUp = false;
    }
  }

  // Getters
  get isReady(): boolean {
    return this.isInitialized && this.socket?.connected === true;
  }

  get connectedPeers(): string[] {
    return Array.from(this.peers.values())
      .filter(peer => peer.status === 'connected')
      .map(peer => peer.id);
  }

  get stats() {
    return {
      totalPeers: this.peers.size,
      connectedPeers: this.connectedPeers.length,
      isConnectedToServer: this.socket?.connected || false
    };
  }
}