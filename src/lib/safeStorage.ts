/**
 * Sistema de storage seguro que nunca quebra a aplicação
 * Testa localStorage, sessionStorage e fallback para memória
 */

type StorageType = 'localStorage' | 'sessionStorage' | 'memory';

class SafeStorage {
  private storageType: StorageType = 'memory';
  private memoryStorage: Map<string, string> = new Map();

  constructor() {
    this.detectAvailableStorage();
  }

  /**
   * Detecta qual storage está disponível
   */
  private detectAvailableStorage(): void {
    // Testa localStorage
    if (this.testStorage('localStorage')) {
      this.storageType = 'localStorage';
      return;
    }

    // Testa sessionStorage
    if (this.testStorage('sessionStorage')) {
      this.storageType = 'sessionStorage';
      return;
    }

    // Fallback para memória (não persiste entre recargas)
    this.storageType = 'memory';
    console.warn('Neither localStorage nor sessionStorage available. Using memory storage (data will not persist).');
  }

  /**
   * Testa se um storage específico funciona
   */
  private testStorage(type: 'localStorage' | 'sessionStorage'): boolean {
    try {
      const storage = window[type];
      const testKey = '__storage_test__';
      storage.setItem(testKey, 'test');
      storage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Obtém o storage real baseado no tipo detectado
   */
  private getStorage(): Storage | null {
    if (this.storageType === 'localStorage') {
      return window.localStorage;
    }
    if (this.storageType === 'sessionStorage') {
      return window.sessionStorage;
    }
    return null;
  }

  /**
   * Salva um item no storage disponível
   */
  public setItem(key: string, value: string): boolean {
    try {
      const storage = this.getStorage();
      if (storage) {
        storage.setItem(key, value);
        return true;
      } else {
        // Fallback para memória
        this.memoryStorage.set(key, value);
        return true;
      }
    } catch (e) {
      console.warn(`Failed to save to storage: ${key}`, e);
      // Tenta salvar em memória como último recurso
      try {
        this.memoryStorage.set(key, value);
        return true;
      } catch (memError) {
        return false;
      }
    }
  }

  /**
   * Obtém um item do storage disponível
   */
  public getItem(key: string): string | null {
    try {
      const storage = this.getStorage();
      if (storage) {
        return storage.getItem(key);
      } else {
        // Fallback para memória
        return this.memoryStorage.get(key) || null;
      }
    } catch (e) {
      console.warn(`Failed to read from storage: ${key}`, e);
      // Tenta ler da memória como último recurso
      try {
        return this.memoryStorage.get(key) || null;
      } catch (memError) {
        return null;
      }
    }
  }

  /**
   * Remove um item do storage disponível
   */
  public removeItem(key: string): boolean {
    try {
      const storage = this.getStorage();
      if (storage) {
        storage.removeItem(key);
        return true;
      } else {
        // Fallback para memória
        this.memoryStorage.delete(key);
        return true;
      }
    } catch (e) {
      console.warn(`Failed to remove from storage: ${key}`, e);
      // Tenta remover da memória como último recurso
      try {
        this.memoryStorage.delete(key);
        return true;
      } catch (memError) {
        return false;
      }
    }
  }

  /**
   * Limpa todo o storage
   */
  public clear(): boolean {
    try {
      const storage = this.getStorage();
      if (storage) {
        storage.clear();
        return true;
      } else {
        // Fallback para memória
        this.memoryStorage.clear();
        return true;
      }
    } catch (e) {
      console.warn('Failed to clear storage', e);
      try {
        this.memoryStorage.clear();
        return true;
      } catch (memError) {
        return false;
      }
    }
  }

  /**
   * Retorna o tipo de storage sendo usado
   */
  public getStorageType(): StorageType {
    return this.storageType;
  }

  /**
   * Verifica se algum storage persistente está disponível
   */
  public isPersistent(): boolean {
    return this.storageType !== 'memory';
  }
}

// Exporta uma instância única
export const safeStorage = new SafeStorage();
