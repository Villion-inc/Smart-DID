import { authService } from '../services/auth.service';
import { db } from '../db';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { User, UserRole } from '@smart-did/shared';

describe('AuthService', () => {
  beforeEach(async () => {
    await db.clear();

    const passwordHash = await bcrypt.hash('testpass123', 10);
    const testUser: User = {
      id: uuidv4(),
      username: 'testadmin',
      passwordHash,
      role: UserRole.ADMIN,
      createdAt: new Date(),
    };
    await db.createUser(testUser);
  });

  describe('login', () => {
    it('should return token for valid credentials', async () => {
      const result = await authService.login({
        username: 'testadmin',
        password: 'testpass123',
      });

      expect(result.token).toBeDefined();
      expect(result.expiresIn).toBe(3600);
    });

    it('should throw error for invalid username', async () => {
      await expect(
        authService.login({
          username: 'wronguser',
          password: 'testpass123',
        })
      ).rejects.toThrow('Invalid credentials');
    });

    it('should throw error for invalid password', async () => {
      await expect(
        authService.login({
          username: 'testadmin',
          password: 'wrongpassword',
        })
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('verifyToken', () => {
    it('should verify valid token', async () => {
      const loginResult = await authService.login({
        username: 'testadmin',
        password: 'testpass123',
      });

      const payload = authService.verifyToken(loginResult.token);

      expect(payload.username).toBe('testadmin');
      expect(payload.role).toBe(UserRole.ADMIN);
    });

    it('should throw error for invalid token', () => {
      expect(() => {
        authService.verifyToken('invalid-token');
      }).toThrow('Invalid or expired token');
    });
  });
});
