export * from '../../../shared/types';

export interface P2PClientConfig {
  discoveryServerUrl: string;
  maxMessageSize: number;
  maxPeers: number;
  reconnectAttempts: number;
  heartbeatInterval: number;
  stunServers: string[];
  turnServers?: RTCIceServer[];
}

export interface WebRTCConfig {
  iceServers: RTCIceServer[];
  iceCandidatePoolSize: number;
}

export interface DataChannelConfig {
  ordered: boolean;
  maxRetransmits: number;
  maxPacketLifeTime: number;
  binaryType: 'blob' | 'arraybuffer';
}

export interface EncryptionKeys {
  privateKey: CryptoKey;
  publicKey: CryptoKey;
  sharedKeys: Map<string, CryptoKey>;
}

export interface MessageQueueItem {
  message: import('../../../shared/types').ChatMessage;
  targetPeers: string[];
  retryCount: number;
  timestamp: number;
}

export interface LocalMessage extends import('../../../shared/types').ChatMessage {
  localId: string;
  status: 'sending' | 'sent' | 'delivered' | 'failed';
  retryCount: number;
}