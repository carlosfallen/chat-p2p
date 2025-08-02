import { io, Socket } from 'socket.io-client';

interface Message {
  id: string;
  from: string;
  to: string;
  content: string;
  timestamp: number;
}

export class P2PService {
  private socket: Socket | null = null;
  private userId: string = '';
  private userSector: string = '';
  private messageHandlers: ((message: Message) => void)[] = [];
  private connectionHandlers: ((connected: boolean) => void)[] = [];

  async connect(userId: string, sector: string): Promise<void> {
    this.userId = userId;
    this.userSector = sector;
    
    const serverUrl = 'http://10.0.11.150:3003';
    
    this.socket = io(serverUrl, {
      timeout: 10000,
      forceNew: true
    });

    this.socket.on('connect', () => {
      console.log('Conectado ao servidor P2P');
      this.notifyConnectionHandlers(true);
      
      this.socket?.emit('peer_register', {
        nickname: userId,
        rooms: [sector],
        publicKey: 'mock-key'
      });
    });

    this.socket.on('disconnect', () => {
      console.log('Desconectado do servidor P2P');
      this.notifyConnectionHandlers(false);
    });

    this.socket.on('message', (data: any) => {
      const message: Message = {
        id: data.id || Date.now().toString(),
        from: data.from,
        to: this.userId,
        content: data.content,
        timestamp: data.timestamp || Date.now()
      };
      this.notifyMessageHandlers(message);
    });
  }

  sendMessage(to: string, content: string): void {
    if (!this.socket?.connected) return;

    const message = {
      id: Date.now().toString(),
      from: this.userId,
      to,
      content,
      timestamp: Date.now()
    };

    this.socket.emit('message', message);
  }

  async getContactsBySector(sector: string): Promise<string[]> {
    return new Promise((resolve) => {
      if (!this.socket?.connected) {
        resolve([]);
        return;
      }

      this.socket.emit('get_contacts_by_sector', sector);
      
      this.socket.once('contacts_list', (contacts: string[]) => {
        resolve(contacts.filter(c => c !== this.userId));
      });

      setTimeout(() => resolve([]), 5000);
    });
  }

  onMessage(handler: (message: Message) => void): void {
    this.messageHandlers.push(handler);
  }

  onConnectionChange(handler: (connected: boolean) => void): void {
    this.connectionHandlers.push(handler);
  }

  private notifyMessageHandlers(message: Message): void {
    this.messageHandlers.forEach(handler => handler(message));
  }

  private notifyConnectionHandlers(connected: boolean): void {
    this.connectionHandlers.forEach(handler => handler(connected));
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}