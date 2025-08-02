import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: string;
  sector: string;
}

interface Conversation {
  contactId: string;
  contactName: string;
  lastMessage: string;
  timestamp: number;
}

interface Message {
  id: string;
  from: string;
  to: string;
  content: string;
  timestamp: number;
}

export class StorageService {
  private static readonly USER_KEY = 'user';
  private static readonly CONVERSATIONS_KEY = 'conversations';
  private static readonly MESSAGES_KEY = 'messages';

  static async saveUser(user: User): Promise<void> {
    try {
      await AsyncStorage.setItem(this.USER_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('Erro ao salvar usuário:', error);
    }
  }

  static async getUser(): Promise<User | null> {
    try {
      const userData = await AsyncStorage.getItem(this.USER_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Erro ao carregar usuário:', error);
      return null;
    }
  }

  static async saveConversations(conversations: Conversation[]): Promise<void> {
    try {
      await AsyncStorage.setItem(this.CONVERSATIONS_KEY, JSON.stringify(conversations));
    } catch (error) {
      console.error('Erro ao salvar conversas:', error);
    }
  }

  static async getConversations(): Promise<Conversation[]> {
    try {
      const data = await AsyncStorage.getItem(this.CONVERSATIONS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Erro ao carregar conversas:', error);
      return [];
    }
  }

  static async saveMessages(messages: { [key: string]: Message[] }): Promise<void> {
    try {
      await AsyncStorage.setItem(this.MESSAGES_KEY, JSON.stringify(messages));
    } catch (error) {
      console.error('Erro ao salvar mensagens:', error);
    }
  }

  static async getMessages(): Promise<{ [key: string]: Message[] }> {
    try {
      const data = await AsyncStorage.getItem(this.MESSAGES_KEY);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
      return {};
    }
  }

  static async clearAll(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([this.USER_KEY, this.CONVERSATIONS_KEY, this.MESSAGES_KEY]);
    } catch (error) {
      console.error('Erro ao limpar dados:', error);
    }
  }
}