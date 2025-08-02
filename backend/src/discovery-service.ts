import { Server as SocketIOServer } from 'socket.io';
import { PeerRegistryManager } from './peer-registry';
import { Peer, WebRTCSignal, RoomInfo, ServerToClientEvents, ClientToServerEvents } from './types';

export class DiscoveryService {
  private peerRegistry = new PeerRegistryManager();
  private heartbeatInterval: number;

  constructor(
    private io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>,
    heartbeatInterval: number = 30000
  ) {
    this.heartbeatInterval = heartbeatInterval;
    this.setupSocketHandlers();
  }

  private setupSocketHandlers(): void {
    this.io.on('connection', (socket) => {
      console.log(`Socket conectado: ${socket.id}`);

      // Registro de peer
      socket.on('peer_register', (data) => {
        const peer: Peer = {
          id: `peer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          socketId: socket.id,
          ip: socket.handshake.address,
          rooms: data.rooms || ['general'],
          lastSeen: Date.now(),
          nickname: data.nickname,
          publicKey: data.publicKey
        };

        this.peerRegistry.registerPeer(peer, socket);

        // Configurar heartbeat
        const heartbeatTimer = setTimeout(() => {
          console.log(`Peer ${peer.id} timeout - removendo`);
          this.peerRegistry.unregisterPeer(peer.id);
          socket.disconnect();
        }, this.heartbeatInterval * 2);

        this.peerRegistry.setHeartbeatTimer(peer.id, heartbeatTimer);

        // Notificar outros peers na sala
        peer.rooms.forEach(roomId => {
          socket.join(roomId);
          socket.to(roomId).emit('peer_joined', peer);
        });

        // Enviar lista de peers existentes
        const roomPeers = this.peerRegistry.getPeersInRoom(peer.rooms[0] || 'general');
        socket.emit('peer_list', roomPeers.filter(p => p.id !== peer.id));
      });

      // Discovery de peers
      socket.on('peer_discover', (roomId) => {
        const peers = this.peerRegistry.getPeersInRoom(roomId);
        socket.emit('peer_list', peers);
      });

      // Sinalização WebRTC
      socket.on('webrtc_signal', (signal: WebRTCSignal) => {
        const targetPeer = this.peerRegistry.getPeer(signal.to);
        if (targetPeer) {
          this.io.to(targetPeer.socketId).emit('webrtc_signal', {
            ...signal,
            timestamp: Date.now()
          });
        }
      });

      // Heartbeat
      socket.on('peer_heartbeat', () => {
        const peer = this.peerRegistry.getPeerBySocket(socket.id);
        if (peer) {
          this.peerRegistry.updateHeartbeat(peer.id);
          
          // Resetar timer de heartbeat
          const peerData = this.peerRegistry.getPeer(peer.id);
          if (peerData) {
            const heartbeatTimer = setTimeout(() => {
              console.log(`Peer ${peer.id} timeout - removendo`);
              this.peerRegistry.unregisterPeer(peer.id);
              socket.disconnect();
            }, this.heartbeatInterval * 2);

            this.peerRegistry.setHeartbeatTimer(peer.id, heartbeatTimer);
          }
        }
      });

      // Gerenciamento de salas
      socket.on('join_room', (roomId) => {
        const peer = this.peerRegistry.getPeerBySocket(socket.id);
        if (peer) {
          socket.join(roomId);
          this.peerRegistry.addPeerToRoom(peer.id, roomId);
          socket.to(roomId).emit('peer_joined', peer);
        }
      });

      socket.on('leave_room', (roomId) => {
        const peer = this.peerRegistry.getPeerBySocket(socket.id);
        if (peer) {
          socket.leave(roomId);
          this.peerRegistry.removePeerFromRoom(peer.id, roomId);
          socket.to(roomId).emit('peer_left', peer.id);
        }
      });

      socket.on('create_room', (data) => {
        const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const roomInfo: RoomInfo = {
          id: roomId,
          name: data.name,
          peers: [],
          createdAt: Date.now(),
          isPrivate: data.isPrivate
        };

        this.peerRegistry.createRoom(roomInfo);
        socket.emit('room_created', roomInfo);
      });

      // Desconexão
      socket.on('disconnect', () => {
        console.log(`Socket desconectado: ${socket.id}`);
        const peer = this.peerRegistry.getPeerBySocket(socket.id);
        if (peer) {
          // Notificar outros peers
          peer.rooms.forEach(roomId => {
            socket.to(roomId).emit('peer_left', peer.id);
          });
          
          this.peerRegistry.unregisterPeer(peer.id);
        }
      });
    });
  }

  getStats() {
    return this.peerRegistry.getStats();
  }
}