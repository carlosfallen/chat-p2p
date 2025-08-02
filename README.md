# Chat P2P Mobile

Aplicação mobile React Native para chat peer-to-peer em tempo real.

## Arquitetura

### Estrutura Simplificada
```
src/
├── context/          # Context API para estado global
├── services/         # Serviços P2P e armazenamento
└── screens/          # Telas da aplicação
```

### Fluxo de Navegação
1. **Login** - ID + Setor do usuário
2. **Conversas** - Lista com última mensagem por contato
3. **Contatos** - Busca por setor ou adição direta por ID
4. **Chat** - Mensagens em tempo real

## Funcionalidades

- ✅ Login com ID e setor
- ✅ Lista de conversas ordenada por timestamp
- ✅ Busca de contatos por setor
- ✅ Adição direta de contatos por ID
- ✅ Chat em tempo real
- ✅ Persistência local com AsyncStorage
- ✅ Interface mobile-first otimizada

## Tecnologias

- **React Native** com Expo
- **React Navigation** para navegação
- **Socket.io** para comunicação P2P
- **AsyncStorage** para persistência
- **TypeScript** para tipagem

## Instalação

```bash
npm install
npm start
```

## Compatibilidade

Mantém total compatibilidade com o backend P2P existente através do `P2PService`.