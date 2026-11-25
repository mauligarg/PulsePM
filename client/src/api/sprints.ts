import { apiClient } from './client';
import { Sprint } from '../types';

export const sprintApi = {
  listByProject: (projectId: string): Promise<{ success: boolean; data: Sprint[] }> =>
    apiClient.get(`/projects/${projectId}/sprints`) as any,

  create: (payload: {
    projectId: string;
    name: string;
    goal?: string;
    startDate?: string;
    endDate?: string;
    status?: 'planned' | 'active';
  }): Promise<{ success: boolean; data: Sprint }> =>
    apiClient.post('/sprints', payload) as any,

  update: (id: string, payload: Partial<Sprint>): Promise<{ success: boolean; data: Sprint }> =>
    apiClient.patch(`/sprints/${id}`, payload) as any,

  start: (
    id: string,
    payload?: { startDate?: string; endDate?: string }
  ): Promise<{ success: boolean; data: Sprint }> =>
    apiClient.post(`/sprints/${id}/start`, payload || {}) as any,

  complete: (
    id: string,
    moveUnfinishedTo: string = 'backlog'
  ): Promise<{ success: boolean; data: { sprint: Sprint; movedUnfinishedCount: number } }> =>
    apiClient.post(`/sprints/${id}/complete`, { moveUnfinishedTo }) as any,

  assignTasks: (sprintIdOrBacklog: string, taskIds: string[]): Promise<{ success: boolean }> =>
    apiClient.post(`/sprints/${sprintIdOrBacklog}/tasks`, { taskIds }) as any,

  delete: (id: string): Promise<{ success: boolean }> =>
    apiClient.delete(`/sprints/${id}`) as any,
};
