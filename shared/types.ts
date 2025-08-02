// Tipos compartilhados entre backend e frontend
export interface Peer {
  id: string;
  socketId: string;
  ip: string;
  rooms: string[];
  lastSeen: number;
  nickname?: string;
  publicKey?: string;
}

export interface WebRTCSignal {
  from: string;
  to: string;
  type: 'offer' | 'answer' | 'ice-candidate';
  data: any;
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  from: string;
  to?: string; // Para mensagens privadas
  room: string;
  content: string;
  timestamp: number;
  vectorClock: Record<string, number>;
  encrypted: boolean;
  signature?: string;
  type: 'text' | 'file' | 'system';
}

export interface PerformanceMetrics {
  latency: number[];
  throughput: number;
  memoryUsage: number;
  connectionQuality: 'excellent' | 'good' | 'poor';
  messagesPerSecond: number;
  peersConnected: number;
  dataTransferred: number;
}

export interface ConnectionState {
  peerId: string;
  state: RTCPeerConnectionState;
  latency: number;
  lastMessage: number;
  dataChannel?: RTCDataChannel;
}

export interface RoomInfo {
  id: string;
  name: string;
  peers: string[];
  createdAt: number;
  isPrivate: boolean;
}

// Socket.io eventos
export interface ServerToClientEvents {
  peer_list: (peers: Peer[]) => void;
  webrtc_signal: (signal: WebRTCSignal) => void;
  peer_joined: (peer: Peer) => void;
  peer_left: (peerId: string) => void;
  room_created: (room: RoomInfo) => void;
  error: (message: string) => void;
}

export interface ClientToServerEvents {
  peer_register: (data: { nickname: string; rooms: string[]; publicKey: string }) => void;
  peer_discover: (roomId: string) => void;
  webrtc_signal: (signal: WebRTCSignal) => void;
  peer_heartbeat: () => void;
  join_room: (roomId: string) => void;
  leave_room: (roomId: string) => void;
  create_room: (data: { name: string; isPrivate: boolean }) => void;
}