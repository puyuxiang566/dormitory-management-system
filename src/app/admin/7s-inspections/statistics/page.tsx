import StatisticsClient from './StatisticsClient';

interface PageProps {
  searchParams: {
    startDate?: string;
    endDate?: string;
    factory?: string;
    department?: string;
  };
}

// 服务端组件 - 禁用缓存
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function StatisticsPage({ searchParams }: PageProps) {
  const startDate = searchParams.startDate || '';
  const endDate = searchParams.endDate || '';
  const factory = searchParams.factory || '';
  const department = searchParams.department || '';

  // 构建查询参数
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  if (factory) params.append('factory', factory);
  if (department) params.append('department', department);

  // 获取统计数据
  let initialData = null;
  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/7s-inspections/statistics?${params.toString()}`, {
      cache: 'no-store',
    });
    
    if (response.ok) {
      initialData = await response.json();
    }
  } catch (error) {
    console.error('Failed to fetch initial statistics data:', error);
  }

  return (
    <StatisticsClient
      initialData={initialData}
      initialStartDate={startDate}
      initialEndDate={endDate}
      initialFactory={factory}
      initialDepartment={department}
    />
  );
}
