/**
 * Cliente WebRTC otimizado para ultra-baixa latência
 */

import { WebRTCSignal, ConnectionState, DataChannelConfig } from '../types';
import { performanceMonitor } from '../utils/performance';

export interface WebRTCClientConfig {
  iceServers: RTCIceServer[];
  dataChannelConfig: DataChannelConfig;
  onDataChannelMessage: (peerId: string, data: any) => void;
  onConnectionStateChange: (peerId: string, state: RTCPeerConnectionState) => void;
  onDataChannelOpen: (peerId: string) => void;
  onDataChannelClose: (peerId: string) => void;
}

export class WebRTCClient {
  private connections = new Map<string, RTCPeerConnection>();
  private dataChannels = new Map<string, RTCDataChannel>();
  private connectionStates = new Map<string, ConnectionState>();
  private config: WebRTCClientConfig;
  private isInitiator = new Map<string, boolean>();

  // Pool de objetos para reutilização
  private messagePool: ArrayBuffer[] = [];
  private maxPoolSize = 100;

  constructor(config: WebRTCClientConfig) {
    this.config = config;
  }

  async createPeerConnection(peerId: string, isInitiator: boolean = false): Promise<RTCPeerConnection> {
    if (this.connections.has(peerId)) {
      this.closePeerConnection(peerId);
    }

    // Configuração otimizada para baixa latência
    const rtcConfig: RTCConfiguration = {
      iceServers: this.config.iceServers,
      iceCandidatePoolSize: 10,
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
      iceTransportPolicy: 'all'
    };

    const peerConnection = new RTCPeerConnection(rtcConfig);
    this.connections.set(peerId, peerConnection);
    this.isInitiator.set(peerId, isInitiator);

    // Configurar listeners
    this.setupPeerConnectionListeners(peerId, peerConnection);

    // Criar data channel se for o iniciador
    if (isInitiator) {
      await this.createDataChannel(peerId, peerConnection);
    }

    return peerConnection;
  }

  private setupPeerConnectionListeners(peerId: string, peerConnection: RTCPeerConnection): void {
    // Estado da conexão
    peerConnection.onconnectionstatechange = () => {
      const state = peerConnection.connectionState;
      console.log(`Peer ${peerId} connection state: ${state}`);
      
      this.updateConnectionState(peerId, state);
      this.config.onConnectionStateChange(peerId, state);

      // Limpeza automática de conexões falhas
      if (state === 'failed' || state === 'disconnected') {
        setTimeout(() => {
          if (peerConnection.connectionState === 'failed' || 
              peerConnection.connectionState === 'disconnected') {
            this.closePeerConnection(peerId);
          }
        }, 5000);
      }
    };

    // ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignal(peerId, {
          from: 'local',
          to: peerId,
          type: 'ice-candidate',
          data: event.candidate,
          timestamp: Date.now()
        });
      }
    };

    // Data channel recebido
    peerConnection.ondatachannel = (event) => {
      const dataChannel = event.channel;
      this.setupDataChannel(peerId, dataChannel);
    };

    // Monitoramento de estatísticas
    this.startStatsMonitoring(peerId, peerConnection);
  }

  private async createDataChannel(peerId: string, peerConnection: RTCPeerConnection): Promise<RTCDataChannel> {
    const dataChannel = peerConnection.createDataChannel('chat', {
      ordered: this.config.dataChannelConfig.ordered,
      maxRetransmits: this.config.dataChannelConfig.maxRetransmits,
      maxPacketLifeTime: this.config.dataChannelConfig.maxPacketLifeTime
    });

    dataChannel.binaryType = this.config.dataChannelConfig.binaryType;
    this.setupDataChannel(peerId, dataChannel);
    
    return dataChannel;
  }

  private setupDataChannel(peerId: string, dataChannel: RTCDataChannel): void {
    this.dataChannels.set(peerId, dataChannel);

    dataChannel.onopen = () => {
      console.log(`Data channel aberto para peer ${peerId}`);
      this.config.onDataChannelOpen(peerId);
    };

    dataChannel.onclose = () => {
      console.log(`Data channel fechado para peer ${peerId}`);
      this.dataChannels.delete(peerId);
      this.config.onDataChannelClose(peerId);
    };

    dataChannel.onerror = (error) => {
      console.error(`Erro no data channel para peer ${peerId}:`, error);
    };

    dataChannel.onmessage = (event) => {
      const startTime = performance.now();
      
      try {
        let data;
        if (event.data instanceof ArrayBuffer) {
          // Deserializar dados binários ultra-rápido
          data = this.deserializeMessage(event.data);
        } else {
          data = JSON.parse(event.data);
        }

        // Registrar latência se houver timestamp
        if (data.timestamp) {
          const latency = Date.now() - data.timestamp;
          performanceMonitor.recordLatency(latency);
        }

        this.config.onDataChannelMessage(peerId, data);
        performanceMonitor.recordMessage();

        // Medir tempo de processamento
        const processingTime = performance.now() - startTime;
        if (processingTime > 5) { // Log apenas se demorar mais que 5ms
          console.warn(`Processamento lento da mensagem: ${processingTime.toFixed(2)}ms`);
        }
      } catch (error) {
        console.error('Erro ao processar mensagem:', error);
      }
    };
  }

  async createOffer(peerId: string): Promise<RTCSessionDescriptionInit> {
    const peerConnection = this.connections.get(peerId);
    if (!peerConnection) {
      throw new Error(`Conexão não encontrada para peer ${peerId}`);
    }

    const offer = await peerConnection.createOffer({
      offerToReceiveAudio: false,
      offerToReceiveVideo: false,
      iceRestart: false
    });

    await peerConnection.setLocalDescription(offer);
    return offer;
  }

  async createAnswer(peerId: string, offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    const peerConnection = this.connections.get(peerId);
    if (!peerConnection) {
      throw new Error(`Conexão não encontrada para peer ${peerId}`);
    }

    await peerConnection.setRemoteDescription(offer);
    
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    
    return answer;
  }

  async handleAnswer(peerId: string, answer: RTCSessionDescriptionInit): Promise<void> {
    const peerConnection = this.connections.get(peerId);
    if (!peerConnection) {
      throw new Error(`Conexão não encontrada para peer ${peerId}`);
    }

    await peerConnection.setRemoteDescription(answer);
  }

  async handleIceCandidate(peerId: string, candidate: RTCIceCandidateInit): Promise<void> {
    const peerConnection = this.connections.get(peerId);
    if (!peerConnection) {
      throw new Error(`Conexão não encontrada para peer ${peerId}`);
    }

    await peerConnection.addIceCandidate(candidate);
  }

  sendMessage(peerId: string, data: any): boolean {
    const dataChannel = this.dataChannels.get(peerId);
    if (!dataChannel || dataChannel.readyState !== 'open') {
      return false;
    }

    try {
      // Adicionar timestamp para medição de latência
      const messageWithTimestamp = {
        ...data,
        timestamp: Date.now()
      };

      // Serializar para ArrayBuffer para máxima velocidade
      const serialized = this.serializeMessage(messageWithTimestamp);
      dataChannel.send(serialized);
      
      performanceMonitor.recordDataTransfer(serialized.byteLength);
      return true;
    } catch (error) {
      console.error(`Erro ao enviar mensagem para ${peerId}:`, error);
      return false;
    }
  }

  private serializeMessage(data: any): ArrayBuffer {
    // Reutilizar buffer do pool se possível
    const jsonString = JSON.stringify(data);
    const encoder = new TextEncoder();
    return encoder.encode(jsonString).buffer;
  }

  private deserializeMessage(buffer: ArrayBuffer): any {
    const decoder = new TextDecoder();
    const jsonString = decoder.decode(buffer);
    return JSON.parse(jsonString);
  }

  private updateConnectionState(peerId: string, state: RTCPeerConnectionState): void {
    let connectionState = this.connectionStates.get(peerId);
    if (!connectionState) {
      connectionState = {
        peerId,
        state,
        latency: 0,
        lastMessage: Date.now()
      };
      this.connectionStates.set(peerId, connectionState);
    }

    connectionState.state = state;
    connectionState.lastMessage = Date.now();
  }

  private async startStatsMonitoring(peerId: string, peerConnection: RTCPeerConnection): Promise<void> {
    const intervalId = setInterval(async () => {
      if (peerConnection.connectionState === 'closed') {
        clearInterval(intervalId);
        return;
      }

      try {
        const stats = await peerConnection.getStats();
        
        stats.forEach((report) => {
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            const rtt = report.currentRoundTripTime;
            if (rtt && rtt > 0) {
              performanceMonitor.recordLatency(rtt * 1000); // Converter para ms
              
              // Atualizar estado da conexão
              const connectionState = this.connectionStates.get(peerId);
              if (connectionState) {
                connectionState.latency = rtt * 1000;
              }
            }
          }
        });
      } catch (error) {
        console.error('Erro ao obter estatísticas:', error);
      }
    }, 1000);
  }

  getConnectionState(peerId: string): ConnectionState | undefined {
    return this.connectionStates.get(peerId);
  }

  getAllConnectionStates(): ConnectionState[] {
    return Array.from(this.connectionStates.values());
  }

  isConnected(peerId: string): boolean {
    const dataChannel = this.dataChannels.get(peerId);
    return dataChannel?.readyState === 'open';
  }

  closePeerConnection(peerId: string): void {
    // Fechar data channel
    const dataChannel = this.dataChannels.get(peerId);
    if (dataChannel) {
      dataChannel.close();
      this.dataChannels.delete(peerId);
    }

    // Fechar peer connection
    const peerConnection = this.connections.get(peerId);
    if (peerConnection) {
      peerConnection.close();
      this.connections.delete(peerId);
    }

    // Limpar estados
    this.connectionStates.delete(peerId);
    this.isInitiator.delete(peerId);

    console.log(`Conexão fechada para peer ${peerId}`);
  }

  closeAllConnections(): void {
    const peerIds = Array.from(this.connections.keys());
    peerIds.forEach(peerId => this.closePeerConnection(peerId));
    
    // Limpar pool de mensagens
    this.messagePool = [];
  }

  private sendSignal(peerId: string, signal: WebRTCSignal): void {
    // Este método deve ser implementado pela classe que usa WebRTCClient
    // para enviar sinais através do discovery server
    console.log('Sinal WebRTC deve ser enviado:', signal);
  }

  setSignalSender(signalSender: (peerId: string, signal: WebRTCSignal) => void): void {
    this.sendSignal = signalSender;
  }
}