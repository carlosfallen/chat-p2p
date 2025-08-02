# 🚀 P2P Chat Ultra-Rápido

Sistema de chat peer-to-peer em tempo real com latência ultra-baixa (<2ms) usando WebRTC para conexões diretas entre clientes.

## ✨ Características Principais

- **Latência Ultra-Baixa**: <2ms em rede local via WebRTC P2P direto
- **Discovery Server Leve**: Apenas para conexão inicial, não roteia mensagens
- **Sincronização Distribuída**: Vector clocks para ordenação e resolução de conflitos
- **Criptografia End-to-End**: Chaves ECDH + AES-GCM
- **Performance Otimizada**: Cache em memória, virtual scrolling, batch processing
- **Resiliente**: Reconexão automática, queue de mensagens offline
- **Métricas em Tempo Real**: Monitoramento de latência, throughput e qualidade

## 🏗️ Arquitetura

```
📱 Client A ←→ 🔍 Discovery Server ←→ 📱 Client B
     ↓                                    ↓
     └──────── WebRTC P2P Direct ─────────┘
                  (1ms latency)
```

### Componentes

- **Discovery Server** (Node.js + Socket.io): Facilita descoberta e sinalização WebRTC
- **P2P Client** (React + WebRTC): Conexões diretas entre peers
- **Local Database** (IndexedDB): Persistência local ultra-rápida
- **MessageSync**: Sistema distribuído com vector clocks

## 🚀 Inicio Rápido

### Pré-requisitos

- Node.js 18+
- npm ou yarn

### Instalação

```bash
# Instalar todas as dependências
npm run install:all

# Desenvolvimento (backend + frontend)
npm run dev

# Ou separadamente:
npm run dev:backend    # Porta 3001
npm run dev:frontend   # Porta 5173
```

### Docker (Produção)

```bash
# Build e start completo
docker-compose up --build

# Apenas discovery server
docker-compose up discovery-server

# Apenas frontend
docker-compose up frontend
```

## 📊 Performance Targets

- ✅ **Latência**: <2ms em rede local
- ✅ **Throughput**: >1000 mensagens/segundo
- ✅ **Peers simultâneos**: 50+
- ✅ **Conexão**: <500ms para novo peer
- ✅ **Confiabilidade**: 99.9% entrega de mensagens

## 🔧 Configuração

### Backend (.env)

```bash
NODE_ENV=development
PORT=3001
CORS_ORIGIN=http://localhost:5173
MAX_PEERS_PER_ROOM=50
HEARTBEAT_INTERVAL=30000
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX=1000
```

### Frontend (.env)

```bash
VITE_DISCOVERY_SERVER=http://localhost:3001
VITE_MAX_MESSAGE_SIZE=16384
VITE_MAX_PEERS=10
VITE_RECONNECT_ATTEMPTS=5
VITE_HEARTBEAT_INTERVAL=30000
```

## 🛠️ Scripts Disponíveis

```bash
# Instalação
npm run install:all        # Instalar todas as dependências

# Desenvolvimento
npm run dev                 # Backend + Frontend
npm run dev:backend         # Apenas backend
npm run dev:frontend        # Apenas frontend

# Build
npm run build:all           # Build completo
npm run build:backend       # Backend apenas
npm run build:frontend      # Frontend apenas

# Testes
npm run test:all           # Todos os testes
npm run test:backend       # Backend apenas
npm run test:frontend      # Frontend apenas
```

## 🏃‍♂️ Como Usar

1. **Iniciar o sistema**: `npm run dev`
2. **Abrir múltiplas abas**: http://localhost:5173
3. **Definir apelidos diferentes** em cada aba
4. **Começar a conversar**: Mensagens são roteadas P2P diretamente

### Funcionalidades

- **Chat em tempo real** com múltiplos peers
- **Busca de mensagens** instantânea
- **Métricas de performance** em tempo real
- **Tema escuro/claro**
- **Persistência offline** com sincronização automática
- **Indicadores de status** de mensagem (enviando/enviado/entregue)

## 🔒 Segurança

- **Criptografia E2E**: Todas as mensagens são criptografadas
- **Key Exchange**: ECDH para chaves compartilhadas
- **Perfect Forward Secrecy**: Rotação automática de chaves
- **Rate Limiting**: Proteção contra spam
- **Input Validation**: Sanitização de todas as entradas

## 📈 Monitoramento

O sistema inclui métricas em tempo real:

- **Latência média/min/max**
- **Mensagens por segundo**
- **Uso de memória**
- **Qualidade da conexão**
- **Dados transferidos**
- **Status dos peers**

## 🔧 Tecnologias

### Backend
- Node.js + TypeScript
- Express + Socket.io
- Rate limiting + CORS
- Docker ready

### Frontend
- React + TypeScript
- WebRTC nativo
- IndexedDB (Dexie)
- TailwindCSS
- Virtual scrolling (react-window)

### P2P Stack
- WebRTC DataChannels
- STUN/TURN servers
- Vector clocks
- Gossip protocol
- Conflict resolution

## 🤝 Contribuindo

1. Fork o projeto
2. Crie sua branch: `git checkout -b feature/nova-funcionalidade`
3. Commit suas mudanças: `git commit -m 'Adiciona nova funcionalidade'`
4. Push para a branch: `git push origin feature/nova-funcionalidade`
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para detalhes.

## 🚨 Limitações Conhecidas

- **NAT Traversal**: Pode necessitar TURN server em redes restritivas
- **Browser Support**: Requer browsers modernos com WebRTC
- **Escalabilidade**: Otimizado para até 50 peers simultâneos
- **Mobile**: Performance pode variar em dispositivos móveis

## 📞 Suporte

- **Issues**: Use o GitHub Issues para bugs e melhorias
- **Discussões**: GitHub Discussions para perguntas gerais
- **Performance**: Monitore as métricas em tempo real no painel

---

**🎯 Objetivo**: Demonstrar que é possível criar sistemas de chat P2P com latência comparável a aplicações nativas, usando apenas tecnologias web modernas.# Chat
# Chat
# chat-p2p
