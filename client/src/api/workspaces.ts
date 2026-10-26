import { apiClient } from './client';
import { Workspace, Member, Role } from '../types';

export const workspaceApi = {
  list: (): Promise<{ success: boolean; data: Workspace[] }> =>
    apiClient.get('/workspaces') as any,

  create: (data: { name: string; slug?: string }): Promise<{ success: boolean; data: { workspace: Workspace; role: Role; token: string } }> =>
    apiClient.post('/workspaces', data) as any,

  switch: (workspaceId: string): Promise<{ success: boolean; data: { workspace: Workspace; role: Role; token: string } }> =>
    apiClient.post(`/workspaces/${workspaceId}/switch`) as any,

  getMembers: (workspaceId: string): Promise<{ success: boolean; data: Member[] }> =>
    apiClient.get(`/workspaces/${workspaceId}/members`) as any,

  updateRole: (workspaceId: string, userId: string, role: Role): Promise<{ success: boolean; message: string }> =>
    apiClient.patch(`/workspaces/${workspaceId}/members/${userId}`, { role }) as any,

  removeMember: (workspaceId: string, userId: string): Promise<{ success: boolean; message: string }> =>
    apiClient.delete(`/workspaces/${workspaceId}/members/${userId}`) as any,

  createInvite: (
    workspaceId: string,
    data: { email: string; role: 'admin' | 'member' | 'guest' }
  ): Promise<{ success: boolean; message: string; data: { devInviteLink?: string; devRawToken?: string } }> =>
    apiClient.post(`/workspaces/${workspaceId}/invites`, data) as any,
};
