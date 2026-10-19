'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import { useToastHelpers } from '@/components/ui';

// 通用 API 请求 Hook
export function useApi<T, D extends React.DependencyList = []>(
  fetchFn: () => Promise<T>,
  deps: D = [] as unknown as D
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFnRef = useRef(fetchFn);
  fetchFnRef.current = fetchFn;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetchFnRef.current();
      setData(response);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '请求失败';
      setError(message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// 人员列表 Hook
export function usePersons(params?: { page?: number; pageSize?: number; search?: string; status?: string }) {
  return useApi(
    () => api.persons.list(params),
    [params?.page, params?.pageSize, params?.search, params?.status]
  );
}

// 楼栋列表 Hook
export function useBuildings() {
  return useApi(() => api.buildings.list(), []);
}

// 统计概览 Hook
export function useStatistics() {
  return useApi(() => api.statistics.overview(), []);
}

export function useDistribution() {
  return useApi(() => api.statistics.distribution(), []);
}

export function useOccupancyTrend(days: number = 7) {
  return useApi(() => api.statistics.occupancyTrend(days), [days]);
}

export function useDashboardStats() {
  return useApi(() => api.statistics.dashboard(), []);
}

// 工单列表 Hook
export function useMaintenanceTickets(params?: { page?: number; pageSize?: number; status?: string }) {
  return useApi(
    () => api.maintenance.list(params),
    [params?.page, params?.pageSize, params?.status]
  );
}

// 账单列表 Hook
export function useBills(params?: { page?: number; pageSize?: number; status?: string }) {
  return useApi(
    () => api.bills.list(params),
    [params?.page, params?.pageSize, params?.status]
  );
}

// 访客列表 Hook
export function useVisitors(params?: { page?: number; pageSize?: number; status?: string }) {
  return useApi(
    () => api.visitors.list(params),
    [params?.page, params?.pageSize, params?.status]
  );
}

// 申请列表 Hook
export function useApplications(params?: { page?: number; pageSize?: number; type?: string }) {
  return useApi(
    () => api.applications.list(params),
    [params?.page, params?.pageSize, params?.type]
  );
}

// 报表数据 Hook
export function useReports(type: string, period?: string) {
  return useApi(
    () => api.statistics.reports(type, period),
    [type, period]
  );
}

// 设置数据 Hook
export function useSettings(category?: string) {
  return useApi(
    () => api.settings.get(category),
    [category]
  );
}
