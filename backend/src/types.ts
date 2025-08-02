export * from '../../shared/types';

export interface ServerConfig {
  port: number;
  corsOrigin: string;
  maxPeersPerRoom: number;
  heartbeatInterval: number;
  rateLimitWindow: number;
  rateLimitMax: number;
}

export interface PeerRegistry {
  [peerId: string]: {
    peer: import('../../shared/types').Peer;
    socket: any;
    heartbeatTimer?: NodeJS.Timeout;
  };
}

export interface RoomRegistry {
  [roomId: string]: {
    info: import('../../shared/types').RoomInfo;
    peers: Set<string>;
  };
}