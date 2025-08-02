/**
 * Sistema de sincronização distribuída de mensagens usando Vector Clocks
 */

import { ChatMessage, LocalMessage } from '../types';

export interface VectorClock {
  [peerId: string]: number;
}

export interface SyncMessage extends ChatMessage {
  vectorClock: VectorClock;
  causality: string[]; // IDs de mensagens que causaram esta
}

export class MessageSync {
  private vectorClock: VectorClock = {};
  private peerId: string;
  private messageHistory = new Map<string, SyncMessage>();
  private pendingMessages = new Map<string, SyncMessage>();
  private maxHistorySize = 1000;

  // Callbacks
  public onMessageReady?: (message: SyncMessage) => void;
  public onConflictResolved?: (messages: SyncMessage[]) => void;

  constructor(peerId: string) {
    this.peerId = peerId;
    this.vectorClock[peerId] = 0;
  }

  createMessage(content: string, room: string, type: 'text' | 'file' | 'system' = 'text'): SyncMessage {
    // Incrementar nosso relógio vetorial
    this.vectorClock[this.peerId]++;

    const message: SyncMessage = {
      id: `${this.peerId}_${this.vectorClock[this.peerId]}_${Date.now()}`,
      from: this.peerId,
      room,
      content,
      timestamp: Date.now(),
      vectorClock: { ...this.vectorClock },
      encrypted: false,
      type,
      causality: this.getRecentCausality()
    };

    this.addToHistory(message);
    return message;
  }

  private getRecentCausality(): string[] {
    // Pegar IDs das últimas 5 mensagens como causalidade
    const recent = Array.from(this.messageHistory.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5)
      .map(msg => msg.id);
    
    return recent;
  }

  receiveMessage(message: SyncMessage): void {
    // Verificar se já processamos esta mensagem
    if (this.messageHistory.has(message.id)) {
      return;
    }

    // Verificar se podemos processar a mensagem agora
    if (this.canProcessMessage(message)) {
      this.processMessage(message);
    } else {
      // Adicionar às mensagens pendentes
      this.pendingMessages.set(message.id, message);
      console.log(`Mensagem ${message.id} adicionada às pendentes`);
    }

    // Tentar processar mensagens pendentes
    this.processPendingMessages();
  }

  private canProcessMessage(message: SyncMessage): boolean {
    // Uma mensagem pode ser processada se:
    // 1. Todas as mensagens causais já foram processadas
    // 2. O relógio vetorial está consistente

    // Verificar causalidade
    for (const causalId of message.causality) {
      if (!this.messageHistory.has(causalId)) {
        return false;
      }
    }

    // Verificar relógio vetorial
    for (const [peerId, clock] of Object.entries(message.vectorClock)) {
      if (peerId === message.from) {
        // Para o remetente, deve ser exatamente o próximo
        const ourClock = this.vectorClock[peerId] || 0;
        if (clock !== ourClock + 1) {
          return false;
        }
      } else {
        // Para outros peers, não pode ser maior que o nosso
        const ourClock = this.vectorClock[peerId] || 0;
        if (clock > ourClock) {
          return false;
        }
      }
    }

    return true;
  }

  private processMessage(message: SyncMessage): void {
    // Atualizar nosso relógio vetorial
    this.updateVectorClock(message.vectorClock);

    // Adicionar ao histórico
    this.addToHistory(message);

    // Detectar e resolver conflitos
    const conflicts = this.detectConflicts(message);
    if (conflicts.length > 0) {
      this.resolveConflicts([message, ...conflicts]);
    }

    // Notificar que a mensagem está pronta
    this.onMessageReady?.(message);

    console.log(`Mensagem processada: ${message.id}`);
  }

  private updateVectorClock(receivedClock: VectorClock): void {
    for (const [peerId, clock] of Object.entries(receivedClock)) {
      this.vectorClock[peerId] = Math.max(this.vectorClock[peerId] || 0, clock);
    }
  }

  private addToHistory(message: SyncMessage): void {
    this.messageHistory.set(message.id, message);

    // Manter tamanho do histórico
    if (this.messageHistory.size > this.maxHistorySize) {
      const oldest = Array.from(this.messageHistory.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp)[0];
      
      this.messageHistory.delete(oldest[0]);
    }
  }

  private processPendingMessages(): void {
    const processed: string[] = [];

    for (const [messageId, message] of this.pendingMessages.entries()) {
      if (this.canProcessMessage(message)) {
        this.processMessage(message);
        processed.push(messageId);
      }
    }

    // Remover mensagens processadas
    processed.forEach(id => this.pendingMessages.delete(id));

    if (processed.length > 0) {
      console.log(`Processadas ${processed.length} mensagens pendentes`);
    }
  }

  private detectConflicts(message: SyncMessage): SyncMessage[] {
    const conflicts: SyncMessage[] = [];

    // Buscar mensagens concorrentes (mesmo timestamp aproximado, diferentes autores)
    const timeWindow = 1000; // 1 segundo
    
    for (const historyMessage of this.messageHistory.values()) {
      if (historyMessage.id === message.id) continue;
      
      if (Math.abs(historyMessage.timestamp - message.timestamp) < timeWindow &&
          historyMessage.from !== message.from &&
          historyMessage.room === message.room) {
        
        // Verificar se são realmente concorrentes (não têm relação causal)
        if (!this.isCausallyRelated(message, historyMessage)) {
          conflicts.push(historyMessage);
        }
      }
    }

    return conflicts;
  }

  private isCausallyRelated(msg1: SyncMessage, msg2: SyncMessage): boolean {
    // Verificar se msg1 causou msg2 ou vice-versa
    return msg1.causality.includes(msg2.id) || msg2.causality.includes(msg1.id);
  }

  private resolveConflicts(conflictingMessages: SyncMessage[]): void {
    // Estratégia de resolução: ordenar por ID lexicográfico (determinística)
    const resolved = conflictingMessages.sort((a, b) => a.id.localeCompare(b.id));
    
    console.log(`Resolvendo conflito entre ${conflictingMessages.length} mensagens`);
    
    // Notificar sobre a resolução
    this.onConflictResolved?.(resolved);
  }

  getVectorClock(): VectorClock {
    return { ...this.vectorClock };
  }

  getMessageHistory(): SyncMessage[] {
    return Array.from(this.messageHistory.values())
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  getPendingMessagesCount(): number {
    return this.pendingMessages.size;
  }

  // Sincronização com outros peers
  createSyncRequest(peerId: string): VectorClock {
    return { ...this.vectorClock };
  }

  handleSyncRequest(peerClock: VectorClock, peerId: string): SyncMessage[] {
    const messagesToSync: SyncMessage[] = [];

    for (const message of this.messageHistory.values()) {
      // Enviar mensagens que o peer ainda não tem
      const peerLastClock = peerClock[message.from] || 0;
      const messageClock = message.vectorClock[message.from] || 0;
      
      if (messageClock > peerLastClock) {
        messagesToSync.push(message);
      }
    }

    return messagesToSync.slice(0, 100); // Limitar a 100 mensagens por sync
  }

  // Gossip protocol para propagação eficiente
  getGossipMessages(maxMessages: number = 10): SyncMessage[] {
    // Retornar as mensagens mais recentes para gossip
    return Array.from(this.messageHistory.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, maxMessages);
  }

  // Limpeza e manutenção
  cleanup(): void {
    // Remover mensagens muito antigas
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    for (const [id, message] of this.messageHistory.entries()) {
      if (message.timestamp < oneHourAgo) {
        this.messageHistory.delete(id);
      }
    }

    // Limpar mensagens pendentes antigas
    for (const [id, message] of this.pendingMessages.entries()) {
      if (message.timestamp < oneHourAgo) {
        this.pendingMessages.delete(id);
      }
    }
  }

  getStats(): { historySize: number; pendingSize: number; clockSize: number } {
    return {
      historySize: this.messageHistory.size,
      pendingSize: this.pendingMessages.size,
      clockSize: Object.keys(this.vectorClock).length
    };
  }
}