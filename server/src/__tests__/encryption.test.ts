import { describe, it, expect, beforeEach } from 'vitest';
import { EncryptionService } from '../lib/encryption.js';

describe('EncryptionService', () => {
  let encryptionService: EncryptionService;
  const testKey = 'test-encryption-key-minimum-32-characters-long-for-security';

  beforeEach(() => {
    encryptionService = new EncryptionService(testKey);
  });

  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt a simple string', () => {
      const plaintext = 'Hello, World!';
      const encrypted = encryptionService.encrypt(plaintext);
      const decrypted = encryptionService.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
      expect(encrypted).not.toBe(plaintext);
    });

    it('should encrypt and decrypt a complex string', () => {
      const plaintext = 'Complex string with special chars: !@#$%^&*()_+-=[]{}|;:",.<>?/~`';
      const encrypted = encryptionService.encrypt(plaintext);
      const decrypted = encryptionService.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertext for the same plaintext', () => {
      const plaintext = 'Same plaintext';
      const encrypted1 = encryptionService.encrypt(plaintext);
      const encrypted2 = encryptionService.encrypt(plaintext);

      expect(encrypted1).not.toBe(encrypted2);
      expect(encryptionService.decrypt(encrypted1)).toBe(plaintext);
      expect(encryptionService.decrypt(encrypted2)).toBe(plaintext);
    });

    it('should handle empty strings', () => {
      const plaintext = '';
      const encrypted = encryptionService.encrypt(plaintext);
      const decrypted = encryptionService.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle long strings', () => {
      const plaintext = 'A'.repeat(10000);
      const encrypted = encryptionService.encrypt(plaintext);
      const decrypted = encryptionService.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });
  });

  describe('encryptObject and decryptObject', () => {
    it('should encrypt and decrypt a simple object', () => {
      const obj = { name: 'John', age: 30 };
      const encrypted = encryptionService.encryptObject(obj);
      const decrypted = encryptionService.decryptObject(encrypted);

      expect(decrypted).toEqual(obj);
    });

    it('should encrypt and decrypt a complex object', () => {
      const obj = {
        string: 'value',
        number: 42,
        boolean: true,
        null: null,
        array: [1, 2, 3],
        nested: {
          deep: {
            value: 'nested',
          },
        },
      };
      const encrypted = encryptionService.encryptObject(obj);
      const decrypted = encryptionService.decryptObject(encrypted);

      expect(decrypted).toEqual(obj);
    });

    it('should handle objects with special characters', () => {
      const obj = {
        apiKey: 'sk_test_1234567890',
        password: 'P@ssw0rd!',
        url: 'https://example.com:8443/api',
      };
      const encrypted = encryptionService.encryptObject(obj);
      const decrypted = encryptionService.decryptObject(encrypted);

      expect(decrypted).toEqual(obj);
    });
  });

  describe('error handling', () => {
    it('should throw error for short encryption key', () => {
      expect(() => {
        new EncryptionService('short');
      }).toThrow('Encryption key must be at least 32 characters');
    });

    it('should throw error for invalid encrypted data', () => {
      expect(() => {
        encryptionService.decrypt('invalid-base64-data');
      }).toThrow('Failed to decrypt data');
    });

    it('should throw error for tampered data', () => {
      const plaintext = 'Original text';
      const encrypted = encryptionService.encrypt(plaintext);
      const tampered = encrypted.substring(0, encrypted.length - 5) + 'XXXXX';

      expect(() => {
        encryptionService.decrypt(tampered);
      }).toThrow('Failed to decrypt data');
    });
  });
});
