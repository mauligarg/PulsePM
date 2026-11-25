import { apiClient } from './client';
import { TimeLog, TimesheetData } from '../types';

export const timeLogApi = {
  listByTask: (taskId: string): Promise<{ success: boolean; data: { logs: TimeLog[]; totalHours: number } }> =>
    apiClient.get(`/tasks/${taskId}/timelogs`) as any,

  createOnTask: (
    taskId: string,
    payload: { hours: number; date?: string; note?: string }
  ): Promise<{ success: boolean; data: TimeLog }> =>
    apiClient.post(`/tasks/${taskId}/timelogs`, payload) as any,

  update: (
    id: string,
    payload: { hours?: number; date?: string; note?: string }
  ): Promise<{ success: boolean; data: TimeLog }> =>
    apiClient.patch(`/timelogs/${id}`, payload) as any,

  delete: (id: string): Promise<{ success: boolean }> =>
    apiClient.delete(`/timelogs/${id}`) as any,

  getTimesheet: (params?: { weekStart?: string; userId?: string }): Promise<{ success: boolean; data: TimesheetData }> =>
    apiClient.get('/timelogs/timesheet', { params }) as any,
};
