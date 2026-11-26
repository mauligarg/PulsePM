import { apiClient } from './client';
import { DashboardSummary, Activity } from '../types';

export const dashboardApi = {
  getSummary: (): Promise<{ success: boolean; data: DashboardSummary }> =>
    apiClient.get('/dashboard/summary') as any,

  getActivity: (
    paramsOrLimit?: number | { limit?: number; page?: number; actorId?: string; entityType?: string; entityId?: string; from?: string; to?: string }
  ): Promise<{ success: boolean; data: { activities: Activity[]; pagination?: any } }> => {
    const params = typeof paramsOrLimit === 'number' ? { limit: paramsOrLimit } : paramsOrLimit;
    return apiClient.get('/activity', { params }) as any;
  },

  getBurndown: (sprintId?: string): Promise<{ success: boolean; data: any }> =>
    apiClient.get('/reports/burndown', { params: sprintId ? { sprintId } : undefined }) as any,

  getVelocity: (limit: number = 6): Promise<{ success: boolean; data: any[] }> =>
    apiClient.get('/reports/velocity', { params: { limit } }) as any,

  getWorkload: (): Promise<{ success: boolean; data: any[] }> =>
    apiClient.get('/reports/workload') as any,
};
