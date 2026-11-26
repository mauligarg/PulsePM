import { apiClient } from './client';
import { Project } from '../types';

export const projectApi = {
  list: (status?: string): Promise<{ success: boolean; data: Project[] }> =>
    apiClient.get('/projects', { params: { status } }) as any,

  create: (data: { name: string; key?: string; description?: string; leadId?: string }): Promise<{ success: boolean; data: Project }> =>
    apiClient.post('/projects', data) as any,

  update: (id: string, data: Partial<Project>): Promise<{ success: boolean; data: Project }> =>
    apiClient.patch(`/projects/${id}`, data) as any,

  delete: (id: string, permanent: boolean = false): Promise<{ success: boolean; message: string }> =>
    apiClient.delete(`/projects/${id}`, { params: { permanent } }) as any,
};
