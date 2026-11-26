import { apiClient } from './client';
import { User, Workspace, Role } from '../types';

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    token: string;
    activeWorkspace: Workspace | null;
    role: Role | null;
  };
}

export interface RegisterResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    token: string;
  };
}

export interface MeResponse {
  success: boolean;
  data: {
    user: User;
    activeWorkspace: Workspace | null;
    role: Role | null;
    workspacesCount: number;
  };
}

export interface BasicAuthResponse {
  success: boolean;
  message: string;
}

export interface ChangePasswordResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
  };
}

export const authApi = {
  login: (data: { email: string; password: string }): Promise<LoginResponse> =>
    apiClient.post('/auth/login', data) as any,

  register: (data: { name: string; email: string; password: string }): Promise<RegisterResponse> =>
    apiClient.post('/auth/register', data) as any,

  getMe: (): Promise<MeResponse> =>
    apiClient.get('/auth/me') as any,

  forgotPassword: (email: string): Promise<BasicAuthResponse> =>
    apiClient.post('/auth/forgot-password', { email }) as any,

  verifyResetToken: (token: string): Promise<BasicAuthResponse> =>
    apiClient.get(`/auth/reset-password/verify?token=${encodeURIComponent(token)}`) as any,

  resetPassword: (data: { token: string; password: string }): Promise<BasicAuthResponse> =>
    apiClient.post('/auth/reset-password', data) as any,

  changePassword: (data: {
    currentPassword: string;
    newPassword: string;
  }): Promise<ChangePasswordResponse> =>
    apiClient.post('/auth/change-password', data) as any,
};
