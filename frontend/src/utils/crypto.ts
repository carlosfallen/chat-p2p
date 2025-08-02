export class CryptoManager {
  private keyPair: CryptoKeyPair | null = null;
  private crypto: Crypto;

  constructor() {
    // Verificar se o crypto está disponível
    this.crypto = window.crypto || (globalThis as any).crypto;
    
    if (!this.crypto) {
      throw new Error('Web Crypto API não está disponível neste ambiente');
    }

    if (!this.crypto.subtle) {
      throw new Error('Web Crypto API Subtle não está disponível');
    }
  }

  async initialize(): Promise<void> {
    try {
      await this.generateKeyPair();
      console.log('CryptoManager inicializado com sucesso');
    } catch (error) {
      console.error('Erro ao inicializar CryptoManager:', error);
      throw error;
    }
  }

  async generateKeyPair(): Promise<void> {
    try {
      // Verificar se crypto.subtle.generateKey está disponível
      if (!this.crypto.subtle.generateKey) {
        throw new Error('crypto.subtle.generateKey não está disponível');
      }

      this.keyPair = await this.crypto.subtle.generateKey(
        {
          name: 'ECDH',
          namedCurve: 'P-256'
        },
        true, // extractable
        ['deriveKey', 'deriveBits']
      );

      console.log('Par de chaves ECDH gerado com sucesso');
    } catch (error) {
      console.error('Erro ao gerar par de chaves:', error);
      throw new Error(`Falha ao gerar chaves criptográficas: ${error.message}`);
    }
  }

  async deriveSharedKey(publicKey: CryptoKey): Promise<CryptoKey> {
    if (!this.keyPair || !this.keyPair.privateKey) {
      throw new Error('Par de chaves não foi inicializado');
    }

    try {
      const sharedKey = await this.crypto.subtle.deriveKey(
        {
          name: 'ECDH',
          public: publicKey
        },
        this.keyPair.privateKey,
        {
          name: 'AES-GCM',
          length: 256
        },
        false, // não extractable
        ['encrypt', 'decrypt']
      );

      return sharedKey;
    } catch (error) {
      console.error('Erro ao derivar chave compartilhada:', error);
      throw error;
    }
  }

  async encrypt(data: string, sharedKey: CryptoKey): Promise<{
    ciphertext: ArrayBuffer;
    iv: Uint8Array;
  }> {
    const encoder = new TextEncoder();
    const plaintext = encoder.encode(data);
    const iv = this.crypto.getRandomValues(new Uint8Array(12));

    try {
      const ciphertext = await this.crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        sharedKey,
        plaintext
      );

      return { ciphertext, iv };
    } catch (error) {
      console.error('Erro ao criptografar dados:', error);
      throw error;
    }
  }

  async decrypt(ciphertext: ArrayBuffer, iv: Uint8Array, sharedKey: CryptoKey): Promise<string> {
    try {
      const decrypted = await this.crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        sharedKey,
        ciphertext
      );

      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    } catch (error) {
      console.error('Erro ao descriptografar dados:', error);
      throw error;
    }
  }

  getPublicKey(): CryptoKey | null {
    return this.keyPair?.publicKey || null;
  }

  async exportPublicKey(): Promise<ArrayBuffer> {
    if (!this.keyPair || !this.keyPair.publicKey) {
      throw new Error('Chave pública não está disponível');
    }

    try {
      return await this.crypto.subtle.exportKey('raw', this.keyPair.publicKey);
    } catch (error) {
      console.error('Erro ao exportar chave pública:', error);
      throw error;
    }
  }

  async importPublicKey(keyData: ArrayBuffer): Promise<CryptoKey> {
    try {
      return await this.crypto.subtle.importKey(
        'raw',
        keyData,
        {
          name: 'ECDH',
          namedCurve: 'P-256'
        },
        false,
        []
      );
    } catch (error) {
      console.error('Erro ao importar chave pública:', error);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    this.keyPair = null;
    console.log('CryptoManager limpo');
  }

  // Método para verificar se o ambiente suporta Web Crypto API
  static isSupported(): boolean {
    return !!(window.crypto && window.crypto.subtle);
  }
}