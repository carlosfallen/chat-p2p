/**
 * Banco de dados local ultra-rápido com IndexedDB e cache em memória
 */

import Dexie, { Table } from 'dexie';
import { ChatMessage, LocalMessage } from '../types';

interface StoredMessage extends LocalMessage {
  id: string;
  roomId: string;
  searchText: string; // Para busca full-text
}

interface StoredPeer {
  id: string;
  nickname: string;
  publicKey: string;
  lastSeen: number;
  rooms: string[];
}

interface StoredRoom {
  id: string;
  name: string;
  isPrivate: boolean;
  createdAt: number;
  lastActivity: number;
}

class P2PDatabase extends Dexie {
  messages!: Table<StoredMessage>;
  peers!: Table<StoredPeer>;
  rooms!: Table<StoredRoom>;

  constructor() {
    super('P2PChatDB');
    
    this.version(1).stores({
      messages: 'id, roomId, from, timestamp, searchText, localId',
      peers: 'id, nickname, lastSeen',
      rooms: 'id, name, lastActivity'
    });
  }
}

export class LocalDatabase {
  private db = new P2PDatabase();
  private messageCache = new Map<string, StoredMessage>(); // Cache em memória
  private roomCache = new Map<string, StoredMessage[]>(); // Cache por sala
  private maxCacheSize = 1000; // Máximo de mensagens em cache
  private batchQueue: StoredMessage[] = []; // Queue para batch writes
  private batchTimer: number | null = null;

  async initialize(): Promise<void> {
    try {
      await this.db.open();
      console.log('Database inicializado com sucesso');
      
      // Carregar mensagens recentes no cache
      await this.preloadCache();
    } catch (error) {
      console.error('Erro ao inicializar database:', error);
      throw error;
    }
  }

  private async preloadCache(): Promise<void> {
    // Carregar as 100 mensagens mais recentes de cada sala ativa
    const recentRooms = await this.db.rooms
      .orderBy('lastActivity')
      .reverse()
      .limit(5)
      .toArray();

    for (const room of recentRooms) {
      const messages = await this.db.messages
        .where('roomId')
        .equals(room.id)
        .orderBy('timestamp')
        .reverse()
        .limit(100)
        .toArray();

      this.roomCache.set(room.id, messages.reverse());
      
      // Adicionar ao cache individual
      messages.forEach(msg => {
        this.messageCache.set(msg.id, msg);
      });
    }
    
    console.log(`Cache precarregado com ${this.messageCache.size} mensagens`);
  }

  async saveMessage(message: LocalMessage): Promise<void> {
    const storedMessage: StoredMessage = {
      ...message,
      roomId: message.room,
      searchText: `${message.content} ${message.from}`.toLowerCase()
    };

    // Adicionar ao cache
    this.messageCache.set(message.id, storedMessage);
    this.addToRoomCache(message.room, storedMessage);

    // Adicionar à queue de batch
    this.batchQueue.push(storedMessage);
    this.scheduleBatchWrite();

    // Manter cache size
    this.maintainCacheSize();
  }

  private addToRoomCache(roomId: string, message: StoredMessage): void {
    let roomMessages = this.roomCache.get(roomId) || [];
    roomMessages.push(message);
    
    // Manter apenas as últimas 100 mensagens por sala no cache
    if (roomMessages.length > 100) {
      roomMessages = roomMessages.slice(-100);
    }
    
    this.roomCache.set(roomId, roomMessages);
  }

  private scheduleBatchWrite(): void {
    if (this.batchTimer) return;

    this.batchTimer = window.setTimeout(async () => {
      await this.flushBatchQueue();
      this.batchTimer = null;
    }, 100); // Flush a cada 100ms
  }

  private async flushBatchQueue(): Promise<void> {
    if (this.batchQueue.length === 0) return;

    try {
      await this.db.messages.bulkPut(this.batchQueue);
      console.log(`Salvou ${this.batchQueue.length} mensagens em batch`);
      this.batchQueue = [];
    } catch (error) {
      console.error('Erro ao salvar batch:', error);
    }
  }

  private maintainCacheSize(): void {
    if (this.messageCache.size <= this.maxCacheSize) return;

    // Remover mensagens mais antigas do cache
    const entries = Array.from(this.messageCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    const toRemove = entries.slice(0, entries.length - this.maxCacheSize);
    toRemove.forEach(([id]) => {
      this.messageCache.delete(id);
    });
  }

  async getMessagesForRoom(roomId: string, limit: number = 50, offset: number = 0): Promise<LocalMessage[]> {
    // Tentar cache primeiro
    const cachedMessages = this.roomCache.get(roomId);
    if (cachedMessages && offset === 0 && limit <= cachedMessages.length) {
      return cachedMessages.slice(-limit);
    }

    // Buscar no database
    const messages = await this.db.messages
      .where('roomId')
      .equals(roomId)
      .orderBy('timestamp')
      .reverse()
      .offset(offset)
      .limit(limit)
      .toArray();

    return messages.reverse();
  }

  async getMessage(messageId: string): Promise<LocalMessage | undefined> {
    // Tentar cache primeiro
    const cached = this.messageCache.get(messageId);
    if (cached) return cached;

    // Buscar no database
    return await this.db.messages.get(messageId);
  }

  async updateMessageStatus(messageId: string, status: LocalMessage['status']): Promise<void> {
    // Atualizar cache
    const cached = this.messageCache.get(messageId);
    if (cached) {
      cached.status = status;
    }

    // Atualizar database
    await this.db.messages.update(messageId, { status });
  }

  async searchMessages(query: string, roomId?: string): Promise<LocalMessage[]> {
    const searchTerm = query.toLowerCase();
    
    let collection = this.db.messages.where('searchText').startsWithIgnoreCase(searchTerm);
    
    if (roomId) {
      collection = collection.and(msg => msg.roomId === roomId);
    }

    return await collection.limit(50).toArray();
  }

  async savePeer(peer: StoredPeer): Promise<void> {
    await this.db.peers.put(peer);
  }

  async getPeer(peerId: string): Promise<StoredPeer | undefined> {
    return await this.db.peers.get(peerId);
  }

  async saveRoom(room: StoredRoom): Promise<void> {
    await this.db.rooms.put(room);
  }

  async getRoom(roomId: string): Promise<StoredRoom | undefined> {
    return await this.db.rooms.get(roomId);
  }

  async getRoomsWithActivity(): Promise<StoredRoom[]> {
    return await this.db.rooms
      .orderBy('lastActivity')
      .reverse()
      .toArray();
  }

  async updateRoomActivity(roomId: string): Promise<void> {
    await this.db.rooms.update(roomId, { lastActivity: Date.now() });
  }

  async getStorageStats(): Promise<{ messages: number; peers: number; rooms: number; cacheSize: number }> {
    const [messages, peers, rooms] = await Promise.all([
      this.db.messages.count(),
      this.db.peers.count(),
      this.db.rooms.count()
    ]);

    return {
      messages,
      peers,
      rooms,
      cacheSize: this.messageCache.size
    };
  }

  async cleanup(): Promise<void> {
    // Flush pending batches
    await this.flushBatchQueue();
    
    // Limpar cache
    this.messageCache.clear();
    this.roomCache.clear();
    
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
  }

  async compactDatabase(): Promise<void> {
    // Remover mensagens antigas (mais de 30 dias)
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    
    await this.db.messages
      .where('timestamp')
      .below(thirtyDaysAgo)
      .delete();

    console.log('Database compactado');
  }
}