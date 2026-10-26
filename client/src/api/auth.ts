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

export const authApi = {
  login: (data: { email: string; password: string }): Promise<LoginResponse> =>
    apiClient.post('/auth/login', data) as any,

  register: (data: { name: string; email: string; password: string }): Promise<RegisterResponse> =>
    apiClient.post('/auth/register', data) as any,

  getMe: (): Promise<MeResponse> =>
    apiClient.get('/auth/me') as any,
};
