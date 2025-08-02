import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { DiscoveryService } from './discovery-service';
import { ServerConfig, ClientToServerEvents, ServerToClientEvents } from './types';

// Carregar variáveis de ambiente
dotenv.config();

const config: ServerConfig = {
  port: parseInt(process.env.PORT || '3003'),
  corsOrigin: process.env.CORS_ORIGIN || 'http://10.0.11.150:5175',
  maxPeersPerRoom: parseInt(process.env.MAX_PEERS_PER_ROOM || '50'),
  heartbeatInterval: parseInt(process.env.HEARTBEAT_INTERVAL || '30000'),
  rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '60000'),
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '1000')
};

// Configurar Express
const app = express();
const server = createServer(app);

// Middlewares de segurança
app.use(helmet());
app.use(cors({
  origin: config.corsOrigin,
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimitWindow,
  max: config.rateLimitMax,
  message: 'Muitas requisições - tente novamente mais tarde',
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api', limiter);
app.use(express.json({ limit: '1mb' }));

// Configurar Socket.IO
const io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: {
    origin: config.corsOrigin,
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

// Inicializar serviço de discovery
const discoveryService = new DiscoveryService(io, config.heartbeatInterval);

// Endpoints de status
app.get('/api/health', (_req, res) => {
  const stats = discoveryService.getStats();
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    stats
  });
});

app.get('/api/stats', (_req, res) => {
  const stats = discoveryService.getStats();
  res.json(stats);
});

// Middleware de erro
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Erro no servidor:', err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

// Iniciar servidor
server.listen(config.port, () => {
  console.log(`🚀 Discovery Server rodando na porta ${config.port}`);
  console.log(`📡 CORS configurado para: ${config.corsOrigin}`);
  console.log(`⚡ Heartbeat interval: ${config.heartbeatInterval}ms`);
  console.log(`🔒 Rate limit: ${config.rateLimitMax} req/${config.rateLimitWindow}ms`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Recebido SIGTERM - encerrando servidor...');
  server.close(() => {
    console.log('Servidor encerrado com sucesso');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('Recebido SIGINT - encerrando servidor...');
  server.close(() => {
    console.log('Servidor encerrado com sucesso');
    process.exit(0);
  });
});