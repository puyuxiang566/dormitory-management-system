import { api } from '@/lib/api';
import PersonsClient from './PersonsClient';

interface PageProps {
  searchParams: {
    page?: string;
    search?: string;
    status?: string;
  };
}

// 服务端组件 - 禁用缓存
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function PersonsPage({ searchParams }: PageProps) {
  const search = searchParams.search || '';
  const status = searchParams.status || '';

  // 不传递初始数据，让客户端完全控制
  return (
    <PersonsClient
      initialData={{ data: [], pagination: undefined }}
      initialSearch={search}
      initialStatus={status}
    />
  );
}
