import { apiClient } from './client';
import { Workspace, Role } from '../types';

export const invitesApi = {
  getDetails: (token: string): Promise<{ success: boolean; data: { email: string; role: Role; workspaceName: string; inviterName: string; expiresAt: string } }> =>
    apiClient.get('/invites/details', { params: { token } }) as any,

  accept: (token: string): Promise<{ success: boolean; message: string; data: { workspace: Workspace; role: Role; token: string } }> =>
    apiClient.post('/invites/accept', { token }) as any,
};
