/**
 * Utilitários de monitoramento de performance
 */

import { PerformanceMetrics } from '../types';

export class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    latency: [],
    throughput: 0,
    memoryUsage: 0,
    connectionQuality: 'good',
    messagesPerSecond: 0,
    peersConnected: 0,
    dataTransferred: 0
  };

  private messageCount = 0;
  private lastSecond = Date.now();
  private dataTransferredBytes = 0;

  recordLatency(latency: number): void {
    this.metrics.latency.push(latency);
    
    // Manter apenas os últimos 100 valores
    if (this.metrics.latency.length > 100) {
      this.metrics.latency.shift();
    }

    // Atualizar qualidade da conexão
    const avgLatency = this.getAverageLatency();
    if (avgLatency < 10) {
      this.metrics.connectionQuality = 'excellent';
    } else if (avgLatency < 50) {
      this.metrics.connectionQuality = 'good';
    } else {
      this.metrics.connectionQuality = 'poor';
    }
  }

  recordMessage(): void {
    this.messageCount++;
    const now = Date.now();
    
    if (now - this.lastSecond >= 1000) {
      this.metrics.messagesPerSecond = this.messageCount;
      this.messageCount = 0;
      this.lastSecond = now;
    }
  }

  recordDataTransfer(bytes: number): void {
    this.dataTransferredBytes += bytes;
    this.metrics.dataTransferred = this.dataTransferredBytes;
  }

  updatePeerCount(count: number): void {
    this.metrics.peersConnected = count;
  }

  updateMemoryUsage(): void {
    if ('memory' in performance) {
      const memInfo = (performance as any).memory;
      this.metrics.memoryUsage = memInfo.usedJSHeapSize / 1024 / 1024; // MB
    }
  }

  getAverageLatency(): number {
    if (this.metrics.latency.length === 0) return 0;
    return this.metrics.latency.reduce((a, b) => a + b, 0) / this.metrics.latency.length;
  }

  getMaxLatency(): number {
    return this.metrics.latency.length > 0 ? Math.max(...this.metrics.latency) : 0;
  }

  getMinLatency(): number {
    return this.metrics.latency.length > 0 ? Math.min(...this.metrics.latency) : 0;
  }

  getMetrics(): PerformanceMetrics {
    this.updateMemoryUsage();
    return { ...this.metrics };
  }

  reset(): void {
    this.metrics = {
      latency: [],
      throughput: 0,
      memoryUsage: 0,
      connectionQuality: 'good',
      messagesPerSecond: 0,
      peersConnected: 0,
      dataTransferred: 0
    };
    this.messageCount = 0;
    this.dataTransferredBytes = 0;
  }

  // Métodos para profiling de performance
  startTimer(label: string): void {
    console.time(label);
  }

  endTimer(label: string): void {
    console.timeEnd(label);
  }

  measureAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    return fn().finally(() => {
      const duration = performance.now() - start;
      console.log(`${label}: ${duration.toFixed(2)}ms`);
    });
  }

  // Benchmark de throughput
  async benchmarkThroughput(messageSize: number, duration: number = 5000): Promise<number> {
    const startTime = Date.now();
    let messagesSent = 0;
    
    const testMessage = 'x'.repeat(messageSize);
    
    while (Date.now() - startTime < duration) {
      // Simular envio de mensagem
      await new Promise(resolve => setTimeout(resolve, 1));
      messagesSent++;
    }
    
    const actualDuration = Date.now() - startTime;
    return (messagesSent / actualDuration) * 1000; // mensagens por segundo
  }
}

// Instância global do monitor
export const performanceMonitor = new PerformanceMonitor();