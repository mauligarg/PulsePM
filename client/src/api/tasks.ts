import { apiClient } from './client';
import { Task, Comment, Attachment } from '../types';

export const taskApi = {
  listByProject: (
    projectId: string,
    filters?: { status?: string; assignee?: string; sprint?: string; search?: string }
  ): Promise<{ success: boolean; data: Task[] }> =>
    apiClient.get(`/projects/${projectId}/tasks`, { params: filters }) as any,

  getById: (id: string): Promise<{ success: boolean; data: Task & { subtasks: Task[]; comments: Comment[] } }> =>
    apiClient.get(`/tasks/${id}`) as any,

  create: (data: Omit<Partial<Task>, 'assigneeId'> & { assigneeId?: string }): Promise<{ success: boolean; data: Task }> =>
    apiClient.post('/tasks', data) as any,

  update: (id: string, updates: Partial<Task>): Promise<{ success: boolean; data: Task }> =>
    apiClient.patch(`/tasks/${id}`, updates) as any,

  move: (
    id: string,
    data: { status?: string; newOrder?: number; prevTaskId?: string; nextTaskId?: string }
  ): Promise<{ success: boolean; data: Task }> =>
    apiClient.patch(`/tasks/${id}/move`, data) as any,

  delete: (id: string): Promise<{ success: boolean; message: string }> =>
    apiClient.delete(`/tasks/${id}`) as any,

  getMyTasks: (): Promise<{ success: boolean; data: Task[] }> =>
    apiClient.get('/tasks/mine') as any,

  addComment: (taskId: string, content: string): Promise<{ success: boolean; data: Comment }> =>
    apiClient.post(`/tasks/${taskId}/comments`, { content }) as any,

  getComments: (taskId: string): Promise<{ success: boolean; data: Comment[] }> =>
    apiClient.get(`/tasks/${taskId}/comments`) as any,

  uploadAttachment: (taskId: string, file: File): Promise<{ success: boolean; data: Attachment }> => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post(`/tasks/${taskId}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }) as any;
  },

  deleteAttachment: (taskId: string, attachmentId: string): Promise<{ success: boolean }> =>
    apiClient.delete(`/tasks/${taskId}/attachments/${attachmentId}`) as any,
};
