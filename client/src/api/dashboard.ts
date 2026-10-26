import { apiClient } from './client';
import { DashboardSummary, Activity } from '../types';

export const dashboardApi = {
  getSummary: (): Promise<{ success: boolean; data: DashboardSummary }> =>
    apiClient.get('/dashboard/summary') as any,

  getActivity: (limit: number = 20): Promise<{ success: boolean; data: { activities: Activity[] } }> =>
    apiClient.get('/activity', { params: { limit } }) as any,
};
