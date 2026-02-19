/**
 * User role
 */
export enum UserRole {
  ADMIN = 'admin',
}

/**
 * User entity
 */
export interface User {
  id: string;
  username: string;
  passwordHash: string;
  role: UserRole;
  createdAt: Date;
  updatedAt?: Date;
}

/**
 * Login credentials
 */
export interface LoginCredentials {
  username: string;
  password: string;
}

/**
 * Auth token response
 */
export interface AuthTokenResponse {
  token: string;
  expiresIn: number;
}

/**
 * JWT payload
 */
export interface JWTPayload {
  userId: string;
  username: string;
  role: UserRole;
}
