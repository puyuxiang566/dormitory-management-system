'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
} from '@heroicons/react/24/outline';
import { Button, Card, DataTable, ConfirmModal, Loading } from '@/components/ui';
import { useToastHelpers } from '@/components/ui';
import { api, Person, ApiResponse } from '@/lib/api';
import { usePersonColumns } from './columns';
import { useDebounce } from '@/hooks/useDebounce';

// 懒加载 Modal 组件
const PersonDetailModal = dynamic(
  () => import('./PersonDetailModal').then(mod => mod.PersonDetailModal),
  {
    loading: () => (
      <div className="flex items-center justify-center p-8">
        <Loading size="lg" />
      </div>
    ),
    ssr: false
  }
);

const ImportModal = dynamic(
  () => import('./ImportModal').then(mod => mod.ImportModal),
  {
    loading: () => (
      <div className="flex items-center justify-center p-8">
        <Loading size="lg" />
      </div>
    ),
    ssr: false
  }
);

interface PersonsClientProps {
  initialData: ApiResponse<Person[]>;
  initialSearch?: string;
  initialStatus?: string;
}

export default function PersonsClient({
  initialData,
  initialSearch = '',
  initialStatus = ''
}: PersonsClientProps) {
  // 搜索和筛选状态
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  
  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // 数据状态 - 初始为空数组，避免闪烁
  const [data, setData] = useState<ApiResponse<Person[]>>({ data: [], pagination: undefined });
  const [loading, setLoading] = useState(true); // 初始为加载状态
  const [error, setError] = useState<string | null>(null);
  
  // 选择状态
  const [selectedRowKeys, setSelectedRowKeys] = useState<(string | number)[]>([]);
  
  // Modal 状态
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [personToDelete, setPersonToDelete] = useState<Person | null>(null);
  const [isBatchDelete, setIsBatchDelete] = useState(false);
  const [batchDeleting, setBatchDeleting] = useState(false);
  const [isBatchCheckout, setIsBatchCheckout] = useState(false);
  const [batchCheckingOut, setBatchCheckingOut] = useState(false);
  const [singleCheckoutModalOpen, setSingleCheckoutModalOpen] = useState(false);
  const [personToCheckout, setPersonToCheckout] = useState<Person | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [personToView, setPersonToView] = useState<Person | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);

  const toast = useToastHelpers();
  const [refreshKey, setRefreshKey] = useState(0);

  // 获取数据 - 只在筛选条件变化或刷新时获取
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await api.persons.list({
          page: currentPage,
          pageSize,
          search: debouncedSearchQuery,
          status: statusFilter,
        });
        setData(response);
      } catch (err: any) {
        setError(err.message || '数据加载失败');
        toast.error('数据加载失败', err.message);
      } finally {
        setLoading(false);
      }
    };

    // 首次加载或条件变化时获取数据
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchQuery, statusFilter, refreshKey, currentPage, pageSize]);

  // 刷新数据函数
  const refetch = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);
  
  // 处理分页变化
  const handlePageChange = useCallback((newPage: number) => {
    setCurrentPage(newPage);
    // 分页时也触发数据获取
    setRefreshKey(prev => prev + 1);
  }, []);
  
  const handlePageSizeChange = useCallback((newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1); // 重置为第一页
    setRefreshKey(prev => prev + 1);
  }, []);

  // 处理查看详情
  const handleViewClick = useCallback(async (person: Person) => {
    try {
      const result = await api.persons.get(person.id);
      // API 直接返回人员对象，不是 { data: Person } 格式
      const personData = (result as any).data || result;
      if (personData) {
        setPersonToView(personData as Person);
        setViewModalOpen(true);
      }
    } catch (err: any) {
      toast.error('获取详情失败', err.message);
    }
  }, [toast]);

  // 处理删除
  const handleDeleteClick = useCallback((person: Person) => {
    setPersonToDelete(person);
    setIsBatchDelete(false);
    setIsBatchCheckout(false);
    setDeleteModalOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!personToDelete) return;

    try {
      await api.persons.delete(personToDelete.id);
      toast.success('删除成功', `人员 ${personToDelete.name} 已删除`);
      refetch();
    } catch (err: any) {
      toast.error('删除失败', err.message);
    } finally {
      setDeleteModalOpen(false);
      setPersonToDelete(null);
    }
  }, [personToDelete, toast, refetch]);

  // 处理一键退宿
  const handleSingleCheckoutClick = useCallback((person: Person) => {
    setPersonToCheckout(person);
    setSingleCheckoutModalOpen(true);
  }, []);

  const handleSingleCheckoutConfirm = useCallback(async () => {
    if (!personToCheckout) return;
    setBatchCheckingOut(true);
    try {
      const result: any = await api.persons.batchCheckout([personToCheckout.id]);
      if (result.error) {
        toast.error('退宿失败', result.error);
      } else {
        toast.success('退宿成功', `${personToCheckout.name} 已退宿`);
        refetch();
      }
    } catch (err: any) {
      toast.error('退宿失败', err.message);
    } finally {
      setBatchCheckingOut(false);
      setSingleCheckoutModalOpen(false);
      setPersonToCheckout(null);
    }
  }, [personToCheckout, toast, refetch]);

  // 处理导出
  const handleExport = useCallback(async () => {
    try {
      const exportParams: any = { search: debouncedSearchQuery, status: statusFilter };
      // 如果有选中的人员，导出选中的人员
      if (selectedRowKeys.length > 0) {
        exportParams.ids = selectedRowKeys;
      }
      await api.persons.export(exportParams);
      toast.success('导出成功', selectedRowKeys.length > 0 ? `已导出 ${selectedRowKeys.length} 名人员` : '人员数据已导出');
    } catch (err: any) {
      toast.error('导出失败', err.message || '未知错误');
    }
  }, [debouncedSearchQuery, statusFilter, selectedRowKeys, toast]);

  // 处理导入
  const handleImport = useCallback(() => {
    setImportModalOpen(true);
  }, []);

  const handleImportSuccess = useCallback(() => {
    refetch();
  }, [refetch]);

  // 批量删除
  const handleBatchDelete = useCallback(() => {
    if (selectedRowKeys.length === 0) {
      toast.warning('请选择', '请先选择要删除的人员');
      return;
    }
    setIsBatchDelete(true);
    setIsBatchCheckout(false);
    setDeleteModalOpen(true);
  }, [selectedRowKeys.length, toast]);

  const handleBatchDeleteConfirm = useCallback(async () => {
    setBatchDeleting(true);
    try {
      const result = await api.persons.batchDelete(selectedRowKeys);
      if (result.error) {
        toast.error('批量删除失败', result.error);
      } else {
        const res = result as any;
        toast.success('批量删除完成', `成功删除 ${res.success} 条，失败 ${res.failed} 条`);
        setSelectedRowKeys([]);
        refetch();
      }
    } catch (err: any) {
      toast.error('批量删除失败', err.message);
    } finally {
      setBatchDeleting(false);
      setDeleteModalOpen(false);
      setIsBatchDelete(false);
    }
  }, [selectedRowKeys, toast, refetch]);

  // 批量退宿
  const handleBatchCheckout = useCallback(() => {
    if (selectedRowKeys.length === 0) {
      toast.warning('请选择', '请先选择要退宿的人员');
      return;
    }
    setIsBatchCheckout(true);
    setIsBatchDelete(false);
    setDeleteModalOpen(true);
  }, [selectedRowKeys.length, toast]);

  const handleBatchCheckoutConfirm = useCallback(async () => {
    setBatchCheckingOut(true);
    try {
      const result = await api.persons.batchCheckout(selectedRowKeys as number[]);
      if (result.error) {
        toast.error('一键退宿失败', result.error);
      } else {
        const res = result as any;
        toast.success('一键退宿完成', `成功退宿 ${res.success} 条，失败 ${res.failed} 条`);
        setSelectedRowKeys([]);
        refetch();
      }
    } catch (err: any) {
      toast.error('一键退宿失败', err.message);
    } finally {
      setBatchCheckingOut(false);
      setDeleteModalOpen(false);
      setIsBatchCheckout(false);
    }
  }, [selectedRowKeys, toast, refetch]);

  // 使用 useMemo 缓存列定义
  const columns = usePersonColumns({
    onView: handleViewClick,
    onEdit: (person) => {},
    onDelete: handleDeleteClick,
    onCheckout: handleSingleCheckoutClick,
  });

  if (error && !data) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">⚠️</div>
        <h3 className="text-lg font-semibold text-red-900 mb-2">数据加载失败</h3>
        <p className="text-slate-500 mb-4">{error}</p>
        <Button onClick={refetch}>重新加载</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-blue-900">人员档案</h1>
          <p className="text-sm text-slate-500 mt-1">管理宿舍入住人员信息</p>
        </div>
        <Link href="/admin/persons/new">
          <Button variant="primary">
            <PlusIcon className="w-5 h-5 mr-2" />
            新增人员
          </Button>
        </Link>
      </div>

      {/* 筛选工具栏 */}
      <Card>
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="搜索姓名、工号..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none bg-white"
          >
            <option value="">全部状态</option>
            <option value="ACTIVE">在住</option>
            <option value="MOVED_OUT">已退宿</option>
            <option value="BLACKLISTED">黑名单</option>
          </select>
          <div className="flex items-center gap-2 ml-auto">
            <Button variant="outline" size="sm" onClick={handleImport}>
              <ArrowUpTrayIcon className="w-4 h-4 mr-2" />
              导入
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
              导出
            </Button>
            <div className="h-4 w-px bg-slate-200 mx-1"></div>
            <span className="text-sm text-blue-700 ml-1 mr-1">
              已选择 {selectedRowKeys.length} 项
            </span>
            <Button variant="danger" size="sm" onClick={handleBatchDelete}>
              批量删除
            </Button>
          </div>
        </div>
      </Card>

      {/* 数据表格 */}
      <Card>
        <DataTable
          columns={columns}
          data={data?.data || []}
          loading={loading}
          pagination={data?.pagination}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
          }}
          rowKey="id"
          emptyText="暂无人员数据"
        />
      </Card>

      {/* 删除确认对话框 */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setIsBatchDelete(false);
          setIsBatchCheckout(false);
          setPersonToDelete(null);
        }}
        onConfirm={isBatchDelete ? handleBatchDeleteConfirm : (isBatchCheckout ? handleBatchCheckoutConfirm : handleDeleteConfirm)}
        title={isBatchDelete ? "确认批量删除" : (isBatchCheckout ? "确认一键退宿" : "确认删除")}
        message={isBatchDelete
          ? `确定要删除选中的 ${selectedRowKeys.length} 名人员吗？此操作不可恢复。`
          : (isBatchCheckout
            ? `确定要为选中的 ${selectedRowKeys.length} 名人员办理退宿吗？这会清空他们的宿舍分配并记录退宿历史。`
            : `确定要删除人员 ${personToDelete?.name} 吗？此操作不可恢复。`)}
        type={isBatchCheckout ? "warning" : "danger"}
        loading={isBatchDelete ? batchDeleting : (isBatchCheckout ? batchCheckingOut : false)}
      />

      {/* 单人退宿确认对话框 */}
      <ConfirmModal
        isOpen={singleCheckoutModalOpen}
        title="确认退宿"
        message={`确定要为 ${personToCheckout?.name} 办理一键退宿吗？`}
        onConfirm={handleSingleCheckoutConfirm}
        onClose={() => setSingleCheckoutModalOpen(false)}
        type="danger"
        loading={batchCheckingOut}
      />

      {/* 详情对话框 - 懒加载 */}
      {viewModalOpen && personToView && (
        <PersonDetailModal
          person={personToView}
          isOpen={viewModalOpen}
          onClose={() => {
            setViewModalOpen(false);
            setPersonToView(null);
          }}
        />
      )}

      {/* 导入对话框 - 懒加载 */}
      {importModalOpen && (
        <ImportModal
          isOpen={importModalOpen}
          onClose={() => setImportModalOpen(false)}
          onSuccess={handleImportSuccess}
        />
      )}
    </div>
  );
}
