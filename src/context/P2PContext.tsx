import React, { createContext, useContext, useEffect, useState } from 'react';
import { P2PService } from '../services/P2PService';
import { StorageService } from '../services/StorageService';

interface User {
  id: string;
  sector: string;
}

interface Message {
  id: string;
  from: string;
  to: string;
  content: string;
  timestamp: number;
}

interface Conversation {
  contactId: string;
  contactName: string;
  lastMessage: string;
  timestamp: number;
}

interface P2PContextType {
  user: User | null;
  conversations: Conversation[];
  messages: { [key: string]: Message[] };
  isConnected: boolean;
  login: (id: string, sector: string) => Promise<void>;
  sendMessage: (to: string, content: string) => void;
  getContactsBySector: (sector: string) => Promise<string[]>;
  addContact: (contactId: string) => void;
}

const P2PContext = createContext<P2PContextType | undefined>(undefined);

export const P2PProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<{ [key: string]: Message[] }>({});
  const [isConnected, setIsConnected] = useState(false);
  const [p2pService] = useState(() => new P2PService());

  useEffect(() => {
    loadStoredData();
    
    p2pService.onMessage((message: Message) => {
      setMessages(prev => ({
        ...prev,
        [message.from]: [...(prev[message.from] || []), message]
      }));
      
      updateConversation(message.from, message.content, message.timestamp);
    });

    p2pService.onConnectionChange((connected: boolean) => {
      setIsConnected(connected);
    });
  }, []);

  const loadStoredData = async () => {
    const storedUser = await StorageService.getUser();
    const storedConversations = await StorageService.getConversations();
    const storedMessages = await StorageService.getMessages();
    
    if (storedUser) setUser(storedUser);
    if (storedConversations) setConversations(storedConversations);
    if (storedMessages) setMessages(storedMessages);
  };

  const login = async (id: string, sector: string) => {
    const userData = { id, sector };
    setUser(userData);
    await StorageService.saveUser(userData);
    await p2pService.connect(id, sector);
  };

  const sendMessage = (to: string, content: string) => {
    if (!user) return;
    
    const message: Message = {
      id: Date.now().toString(),
      from: user.id,
      to,
      content,
      timestamp: Date.now()
    };

    setMessages(prev => ({
      ...prev,
      [to]: [...(prev[to] || []), message]
    }));

    updateConversation(to, content, message.timestamp);
    p2pService.sendMessage(to, content);
  };

  const updateConversation = (contactId: string, lastMessage: string, timestamp: number) => {
    setConversations(prev => {
      const existing = prev.find(c => c.contactId === contactId);
      const updated = existing 
        ? prev.map(c => c.contactId === contactId 
            ? { ...c, lastMessage, timestamp }
            : c)
        : [...prev, { contactId, contactName: contactId, lastMessage, timestamp }];
      
      StorageService.saveConversations(updated);
      return updated.sort((a, b) => b.timestamp - a.timestamp);
    });
  };

  const getContactsBySector = async (sector: string): Promise<string[]> => {
    return p2pService.getContactsBySector(sector);
  };

  const addContact = (contactId: string) => {
    const exists = conversations.find(c => c.contactId === contactId);
    if (!exists) {
      const newConversation: Conversation = {
        contactId,
        contactName: contactId,
        lastMessage: '',
        timestamp: Date.now()
      };
      setConversations(prev => [newConversation, ...prev]);
    }
  };

  return (
    <P2PContext.Provider value={{
      user,
      conversations,
      messages,
      isConnected,
      login,
      sendMessage,
      getContactsBySector,
      addContact
    }}>
      {children}
    </P2PContext.Provider>
  );
};

export const useP2P = () => {
  const context = useContext(P2PContext);
  if (!context) {
    throw new Error('useP2P must be used within P2PProvider');
  }
  return context;
};