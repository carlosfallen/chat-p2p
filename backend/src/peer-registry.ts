import { Peer, RoomInfo } from './types';

export class PeerRegistryManager {
  private peers: Map<string, { peer: Peer; socket: any; heartbeatTimer?: NodeJS.Timeout }> = new Map();
  private rooms: Map<string, { info: RoomInfo; peers: Set<string> }> = new Map();
  private socketToPeer: Map<string, string> = new Map();

  registerPeer(peer: Peer, socket: any): void {
    // Limpar registros anteriores do mesmo socket
    this.unregisterBySocket(socket.id);

    this.peers.set(peer.id, { peer, socket });
    this.socketToPeer.set(socket.id, peer.id);

    // Adicionar às salas
    peer.rooms.forEach(roomId => {
      this.addPeerToRoom(peer.id, roomId);
    });

    console.log(`Peer ${peer.id} registrado com sucesso`);
  }

  unregisterPeer(peerId: string): void {
    const peerData = this.peers.get(peerId);
    if (!peerData) return;

    // Remover das salas
    peerData.peer.rooms.forEach(roomId => {
      this.removePeerFromRoom(peerId, roomId);
    });

    // Limpar heartbeat timer
    if (peerData.heartbeatTimer) {
      clearTimeout(peerData.heartbeatTimer);
    }

    // Remover mappings
    this.socketToPeer.delete(peerData.socket.id);
    this.peers.delete(peerId);

    console.log(`Peer ${peerId} removido do registro`);
  }

  unregisterBySocket(socketId: string): void {
    const peerId = this.socketToPeer.get(socketId);
    if (peerId) {
      this.unregisterPeer(peerId);
    }
  }

  getPeer(peerId: string): Peer | undefined {
    return this.peers.get(peerId)?.peer;
  }

  getPeerBySocket(socketId: string): Peer | undefined {
    const peerId = this.socketToPeer.get(socketId);
    return peerId ? this.getPeer(peerId) : undefined;
  }

  updateHeartbeat(peerId: string): void {
    const peerData = this.peers.get(peerId);
    if (peerData) {
      peerData.peer.lastSeen = Date.now();
    }
  }

  setHeartbeatTimer(peerId: string, timer: NodeJS.Timeout): void {
    const peerData = this.peers.get(peerId);
    if (peerData) {
      if (peerData.heartbeatTimer) {
        clearTimeout(peerData.heartbeatTimer);
      }
      peerData.heartbeatTimer = timer;
    }
  }

  createRoom(roomInfo: RoomInfo): void {
    this.rooms.set(roomInfo.id, {
      info: roomInfo,
      peers: new Set()
    });
    console.log(`Sala ${roomInfo.id} criada`);
  }

  addPeerToRoom(peerId: string, roomId: string): void {
    if (!this.rooms.has(roomId)) {
      // Criar sala automaticamente se não existir
      this.createRoom({
        id: roomId,
        name: roomId,
        peers: [],
        createdAt: Date.now(),
        isPrivate: false
      });
    }

    const room = this.rooms.get(roomId);
    if (room) {
      room.peers.add(peerId);
      room.info.peers = Array.from(room.peers);
    }
  }

  removePeerFromRoom(peerId: string, roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.peers.delete(peerId);
      room.info.peers = Array.from(room.peers);

      // Remover sala vazia (exceto salas nomeadas)
      if (room.peers.size === 0 && roomId.startsWith('temp_')) {
        this.rooms.delete(roomId);
      }
    }
  }

  getPeersInRoom(roomId: string): Peer[] {
    const room = this.rooms.get(roomId);
    if (!room) return [];

    return Array.from(room.peers)
      .map(peerId => this.getPeer(peerId))
      .filter((peer): peer is Peer => peer !== undefined);
  }

  getRoom(roomId: string): RoomInfo | undefined {
    return this.rooms.get(roomId)?.info;
  }

  getAllRooms(): RoomInfo[] {
    return Array.from(this.rooms.values()).map(room => room.info);
  }

  getStats(): { totalPeers: number; totalRooms: number; activeRooms: number } {
    const activeRooms = Array.from(this.rooms.values()).filter(room => room.peers.size > 0).length;
    
    return {
      totalPeers: this.peers.size,
      totalRooms: this.rooms.size,
      activeRooms
    };
  }
}