'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import DistributionChart from '@/components/statistics/DistributionChart';
import ViolatorsTable from '@/components/statistics/ViolatorsTable';
import TimeFilter from '@/components/statistics/TimeFilter';
import { Button, Loading } from '@/components/ui';
import { useToastHelpers } from '@/components/ui';

interface StatisticsData {
  factoryDistribution: Array<{
    factory: string;
    count: number;
    rate: number;
  }>;
  departmentDistribution: Array<{
    factory: string;
    department: string;
    count: number;
    rate: number;
  }>;
  repeatedViolators: Array<{
    personName: string;
    personId?: number;
    count: number;
    lastViolationDate: string;
    recentViolations: Array<{
      date: string;
      violationDesc: string;
    }>;
  }>;
}

interface StatisticsClientProps {
  initialData: StatisticsData | null;
  initialStartDate?: string;
  initialEndDate?: string;
  initialFactory?: string;
  initialDepartment?: string;
}

export default function StatisticsClient({
  initialData,
  initialStartDate = '',
  initialEndDate = '',
  initialFactory = '',
  initialDepartment = '',
}: StatisticsClientProps) {
  const router = useRouter();
  const toast = useToastHelpers();

  // 筛选状态
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);

  // 数据状态
  const [data, setData] = useState<StatisticsData | null>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 获取数据
  const fetchData = useCallback(async (start: string, end: string) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (start) params.append('startDate', start);
      if (end) params.append('endDate', end);

      const response = await fetch(`/api/7s-inspections/statistics?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('数据加载失败');
      }

      const result = await response.json();
      setData(result);

      // 更新URL
      const urlParams = new URLSearchParams();
      if (start) urlParams.append('startDate', start);
      if (end) urlParams.append('endDate', end);
      router.push(`/admin/7s-inspections/statistics?${urlParams.toString()}`);
    } catch (err: any) {
      setError(err.message || '数据加载失败');
      toast.error('数据加载失败', err.message);
    } finally {
      setLoading(false);
    }
  }, [router, toast]);

  // 处理筛选变化
  const handleFilterChange = useCallback((start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
    fetchData(start, end);
  }, [fetchData]);

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/7s-inspections">
            <Button variant="outline" size="sm">
              <ArrowLeftIcon className="w-4 h-4 mr-2" />
              返回列表
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-blue-900">统计分析</h1>
            <p className="text-sm text-slate-500 mt-1">7S检查记录数据分析和趋势报告</p>
          </div>
        </div>
      </div>

      {/* 时间筛选 */}
      <TimeFilter
        startDate={startDate}
        endDate={endDate}
        onFilterChange={handleFilterChange}
      />

      {/* 加载状态 */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loading />
        </div>
      )}

      {/* 错误状态 */}
      {error && !loading && (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-red-900 mb-2">数据加载失败</h3>
          <p className="text-slate-500 mb-4">{error}</p>
          <Button onClick={() => fetchData(startDate, endDate)}>重新加载</Button>
        </div>
      )}

      {/* 数据展示 */}
      {!loading && !error && data && (
        <div className="space-y-6">
          {/* 分布图表 */}
          <DistributionChart
            factoryDistribution={data.factoryDistribution}
            departmentDistribution={data.departmentDistribution}
          />

          {/* 重点关注人员 */}
          <ViolatorsTable repeatedViolators={data.repeatedViolators} />
        </div>
      )}

      {/* 空数据状态 */}
      {!loading && !error && !data && (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">📊</div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">暂无统计数据</h3>
          <p className="text-slate-500">请调整时间筛选或检查是否有检查记录</p>
        </div>
      )}
    </div>
  );
}
