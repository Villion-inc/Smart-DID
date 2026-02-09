import bcrypt from 'bcrypt';
import { AdminUser } from '@prisma/client';
import { userRepository } from '../repositories/user.repository';

export class AuthService {
  async validateUser(username: string, password: string): Promise<AdminUser | null> {
    const user = await userRepository.findByUsername(username);
    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  async createUser(data: { username: string; password: string; role?: string }): Promise<AdminUser> {
    const passwordHash = await this.hashPassword(data.password);
    return userRepository.create({
      username: data.username,
      passwordHash,
      role: data.role || 'admin',
    });
  }

  async getUserById(id: string): Promise<AdminUser | null> {
    return userRepository.findById(id);
  }
}

export const authService = new AuthService();
