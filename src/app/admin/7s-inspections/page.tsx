import InspectionsClient from './InspectionsClient';

interface PageProps {
  searchParams: {
    page?: string;
    search?: string;
    factory?: string;
    department?: string;
    startDate?: string;
    endDate?: string;
    categoryId?: string;
  };
}

// 服务端组件 - 禁用缓存
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function InspectionsPage({ searchParams }: PageProps) {
  const search = searchParams.search || '';
  const factory = searchParams.factory || '';
  const department = searchParams.department || '';
  const startDate = searchParams.startDate || '';
  const endDate = searchParams.endDate || '';
  const categoryId = searchParams.categoryId || '';

  // 不传递初始数据，让客户端完全控制
  return (
    <InspectionsClient
      initialData={{ data: [], pagination: undefined }}
      initialSearch={search}
      initialFactory={factory}
      initialDepartment={department}
      initialStartDate={startDate}
      initialEndDate={endDate}
      initialCategoryId={categoryId}
    />
  );
}
