'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  CalendarIcon,
  BuildingOfficeIcon,
  FunnelIcon,
  XMarkIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { Button, Card, DataTable, ConfirmModal, Loading } from '@/components/ui';
import { useToastHelpers } from '@/components/ui';
import { api, ApiResponse } from '@/lib/api';
import { useInspectionColumns, InspectionRecord } from './columns';
import { useDebounce } from '@/hooks/useDebounce';

interface InspectionsClientProps {
  initialData: ApiResponse<InspectionRecord[]>;
  initialSearch?: string;
  initialFactory?: string;
  initialDepartment?: string;
  initialStartDate?: string;
  initialEndDate?: string;
  initialCategoryId?: string;
}

// 分类类型
interface ViolationCategory {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
}

export default function InspectionsClient({
  initialData,
  initialSearch = '',
  initialFactory = '',
  initialDepartment = '',
  initialStartDate = '',
  initialEndDate = '',
  initialCategoryId = '',
}: InspectionsClientProps) {
  // 搜索和筛选状态
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [factoryFilter, setFactoryFilter] = useState(initialFactory);
  const [departmentFilter, setDepartmentFilter] = useState(initialDepartment);
  const [startDateFilter, setStartDateFilter] = useState(initialStartDate);
  const [endDateFilter, setEndDateFilter] = useState(initialEndDate);
  const [categoryIdFilter, setCategoryIdFilter] = useState(initialCategoryId);
  const [showFilters, setShowFilters] = useState(false);

  // 分类列表
  const [categories, setCategories] = useState<ViolationCategory[]>([]);

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 数据状态
  const [data, setData] = useState<ApiResponse<InspectionRecord[]>>({ data: [], pagination: undefined });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 选择状态
  const [selectedRowKeys, setSelectedRowKeys] = useState<(string | number)[]>([]);

  // Modal 状态
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<InspectionRecord | null>(null);
  const [isBatchDelete, setIsBatchDelete] = useState(false);
  const [batchDeleting, setBatchDeleting] = useState(false);

  // 导入状态
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; failed: number; errors?: string[] } | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);

  const toast = useToastHelpers();
  const [refreshKey, setRefreshKey] = useState(0);

  // 获取分类列表
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/7s-categories');
        if (response.ok) {
          const result = await response.json();
          setCategories(result.data || []);
        }
      } catch (err) {
        console.error('获取分类列表失败:', err);
      }
    };
    fetchCategories();
  }, []);

  // 获取数据
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        params.append('page', String(currentPage));
        params.append('pageSize', String(pageSize));
        if (debouncedSearchQuery) params.append('search', debouncedSearchQuery);
        if (factoryFilter) params.append('factory', factoryFilter);
        if (departmentFilter) params.append('department', departmentFilter);
        if (startDateFilter) params.append('startDate', startDateFilter);
        if (endDateFilter) params.append('endDate', endDateFilter);
        if (categoryIdFilter) params.append('categoryId', categoryIdFilter);

        const response = await fetch(`/api/7s-inspections?${params.toString()}`);
        if (!response.ok) {
          throw new Error('数据加载失败');
        }
        const result = await response.json();
        setData(result);
      } catch (err: any) {
        setError(err.message || '数据加载失败');
        toast.error('数据加载失败', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [debouncedSearchQuery, factoryFilter, departmentFilter, startDateFilter, endDateFilter, categoryIdFilter, currentPage, pageSize, refreshKey, toast]);

  // 刷新数据函数
  const refetch = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  // 处理分页变化
  const handlePageChange = useCallback((newPage: number) => {
    setCurrentPage(newPage);
  }, []);

  const handlePageSizeChange = useCallback((newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  }, []);

  // 处理删除
  const handleDeleteClick = useCallback((record: InspectionRecord) => {
    setRecordToDelete(record);
    setIsBatchDelete(false);
    setDeleteModalOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!recordToDelete) return;

    try {
      const response = await fetch(`/api/7s-inspections/${recordToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('删除失败');
      }

      toast.success('删除成功', `检查记录已删除`);
      refetch();
    } catch (err: any) {
      toast.error('删除失败', err.message);
    } finally {
      setDeleteModalOpen(false);
      setRecordToDelete(null);
    }
  }, [recordToDelete, toast, refetch]);

  // 批量删除
  const handleBatchDelete = useCallback(() => {
    if (selectedRowKeys.length === 0) {
      toast.warning('请选择', '请先选择要删除的记录');
      return;
    }
    setIsBatchDelete(true);
    setDeleteModalOpen(true);
  }, [selectedRowKeys.length, toast]);

  const handleBatchDeleteConfirm = useCallback(async () => {
    setBatchDeleting(true);
    try {
      let successCount = 0;
      let failedCount = 0;

      for (const id of selectedRowKeys) {
        try {
          const response = await fetch(`/api/7s-inspections/${id}`, {
            method: 'DELETE',
          });
          if (response.ok) {
            successCount++;
          } else {
            failedCount++;
          }
        } catch {
          failedCount++;
        }
      }

      toast.success('批量删除完成', `成功删除 ${successCount} 条，失败 ${failedCount} 条`);
      setSelectedRowKeys([]);
      refetch();
    } catch (err: any) {
      toast.error('批量删除失败', err.message);
    } finally {
      setBatchDeleting(false);
      setDeleteModalOpen(false);
      setIsBatchDelete(false);
    }
  }, [selectedRowKeys, toast, refetch]);

  // 处理导出
  const handleExport = useCallback(async () => {
    try {
      // 如果有勾选数据，只导出勾选的
      const ids = selectedRowKeys.length > 0 ? selectedRowKeys.join(',') : '';
      const url = ids ? `/api/7s-inspections/export?ids=${ids}` : '/api/7s-inspections/export';

      const response = await fetch(url);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: '导出失败' }));
        throw new Error(error.error || '导出失败');
      }

      // 获取文件名
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = '7S检查记录.xlsx';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) {
          filename = decodeURIComponent(match[1]);
        }
      }

      // 下载文件
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      toast.success('导出成功', `已导出 ${selectedRowKeys.length > 0 ? selectedRowKeys.length + ' 条' : '全部'}记录`);
    } catch (err: any) {
      toast.error('导出失败', err.message);
    }
  }, [selectedRowKeys, toast]);

  // 处理导入
  const handleImportClick = useCallback(() => {
    setImportModalOpen(true);
    setImportFile(null);
    setImportResult(null);
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        toast.error('文件格式错误', '请上传 Excel 文件 (.xlsx 或 .xls)');
        return;
      }
      setImportFile(file);
      setImportResult(null);
    }
  }, [toast]);

  const handleImportSubmit = useCallback(async () => {
    if (!importFile) {
      toast.warning('请选择文件', '请先选择要导入的 Excel 文件');
      return;
    }

    setImporting(true);
    const formData = new FormData();
    formData.append('file', importFile);

    try {
      const response = await fetch('/api/7s-inspections/import', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '导入失败');
      }

      setImportResult(result);
      toast.success('导入成功', `成功导入 ${result.success} 条记录，失败 ${result.failed} 条`);
      refetch();
    } catch (err: any) {
      toast.error('导入失败', err.message);
    } finally {
      setImporting(false);
    }
  }, [importFile, toast, refetch]);

  // 清除筛选
  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setFactoryFilter('');
    setDepartmentFilter('');
    setStartDateFilter('');
    setEndDateFilter('');
    setCategoryIdFilter('');
    setCurrentPage(1);
    refetch();
  }, [refetch]);

  // 判断是否有过滤条件
  const hasFilters = searchQuery || factoryFilter || departmentFilter || startDateFilter || endDateFilter || categoryIdFilter;

  // 使用列配置
  const columns = useInspectionColumns({
    onDelete: handleDeleteClick,
  });

  if (error && !data.data?.length) {
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
          <h1 className="text-2xl font-semibold text-blue-900">7S检查记录</h1>
          <p className="text-sm text-slate-500 mt-1">管理宿舍7S检查记录和违规情况</p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/7s-inspections/statistics">
            <Button variant="info">
              <ChartBarIcon className="w-5 h-5 mr-2" />
              统计分析
            </Button>
          </Link>
          <Link href="/admin/7s-inspections/new">
            <Button variant="primary">
              <PlusIcon className="w-5 h-5 mr-2" />
              宿舍检查登记
            </Button>
          </Link>
          <Link href="/admin/7s-inspections/locker-room/new">
            <Button variant="success">
              <PlusIcon className="w-5 h-5 mr-2" />
              更衣室检查登记
            </Button>
          </Link>
        </div>
      </div>

      {/* 筛选工具栏 */}
      <Card>
        <div className="flex flex-wrap items-center gap-4">
          {/* 搜索框 */}
          <div className="relative flex-1 min-w-[200px]">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="搜索姓名、宿舍号..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
            />
          </div>

          {/* 展开/收起筛选按钮 */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <FunnelIcon className="w-4 h-4 mr-2" />
            {showFilters ? '收起筛选' : '更多筛选'}
            {hasFilters && (
              <span className="ml-1.5 w-2 h-2 bg-blue-500 rounded-full"></span>
            )}
          </Button>

          {/* 右侧操作按钮 */}
          <div className="flex items-center gap-2 ml-auto">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
              导出{selectedRowKeys.length > 0 ? `(${selectedRowKeys.length})` : ''}
            </Button>
            <Button variant="outline" size="sm" onClick={handleImportClick}>
              <ArrowUpTrayIcon className="w-4 h-4 mr-2" />
              Excel导入
            </Button>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <XMarkIcon className="w-4 h-4 mr-1" />
                清除筛选
              </Button>
            )}
          </div>
        </div>

        {/* 展开的高级筛选 */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {/* 工厂筛选 */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                <BuildingOfficeIcon className="w-3.5 h-3.5 inline mr-1" />
                工厂
              </label>
              <select
                value={factoryFilter}
                onChange={(e) => setFactoryFilter(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none bg-white text-sm"
              >
                <option value="">全部工厂</option>
                <option value="imcn">IMCN</option>
                <option value="imaw">IMAW</option>
                <option value="imft">IMFT</option>
                <option value="职能部门">职能部门</option>
              </select>
            </div>

            {/* 部门筛选 */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">部门</label>
              <input
                type="text"
                placeholder="输入部门名称"
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-sm"
              />
            </div>

            {/* 开始日期 */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                <CalendarIcon className="w-3.5 h-3.5 inline mr-1" />
                开始日期
              </label>
              <input
                type="date"
                value={startDateFilter}
                onChange={(e) => setStartDateFilter(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-sm"
              />
            </div>

            {/* 结束日期 */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                <CalendarIcon className="w-3.5 h-3.5 inline mr-1" />
                结束日期
              </label>
              <input
                type="date"
                value={endDateFilter}
                onChange={(e) => setEndDateFilter(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-sm"
              />
            </div>

            {/* 分类筛选 */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">不合格项分类</label>
              <select
                value={categoryIdFilter}
                onChange={(e) => setCategoryIdFilter(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none bg-white text-sm"
              >
                <option value="">全部分类</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
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
          emptyText="暂无检查记录"
        />

        {/* 批量操作栏 */}
        {selectedRowKeys.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-sm text-slate-600">
              已选择 <span className="font-medium text-blue-600">{selectedRowKeys.length}</span> 条记录
            </span>
            <Button variant="danger" size="sm" onClick={handleBatchDelete}>
              批量删除
            </Button>
          </div>
        )}
      </Card>

      {/* 删除确认对话框 */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setIsBatchDelete(false);
          setRecordToDelete(null);
        }}
        onConfirm={isBatchDelete ? handleBatchDeleteConfirm : handleDeleteConfirm}
        title={isBatchDelete ? "确认批量删除" : "确认删除"}
        message={isBatchDelete
          ? `确定要删除选中的 ${selectedRowKeys.length} 条检查记录吗？此操作不可恢复。`
          : `确定要删除这条检查记录吗？此操作不可恢复。`}
        type="danger"
        loading={isBatchDelete ? batchDeleting : false}
      />

      {/* 导入对话框 */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Excel 批量导入</h3>
              <button
                onClick={() => setImportModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* 文件上传区域 */}
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-blue-300 hover:bg-blue-50/30 transition-colors">
                <ArrowUpTrayIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-600 mb-2">
                  点击选择或拖拽 Excel 文件到此处
                </p>
                <p className="text-xs text-slate-400">支持 .xlsx 或 .xls 格式</p>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                  id="import-file"
                />
                <label
                  htmlFor="import-file"
                  className="inline-flex items-center px-4 py-2 mt-4 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg cursor-pointer transition-colors"
                >
                  选择文件
                </label>
              </div>

              {/* 已选择文件 */}
              {importFile && (
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <ArrowDownTrayIcon className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{importFile.name}</p>
                    <p className="text-xs text-slate-500">{(importFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <button
                    onClick={() => setImportFile(null)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* 导入结果 */}
              {importResult && (
                <div className={`p-4 rounded-lg ${importResult.failed > 0 ? 'bg-amber-50 border border-amber-200' : 'bg-green-50 border border-green-200'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {importResult.failed > 0 ? (
                      <>
                        <div className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center">
                          <span className="text-amber-600 text-sm">!</span>
                        </div>
                        <span className="font-medium text-amber-800">导入完成，部分失败</span>
                      </>
                    ) : (
                      <>
                        <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="text-green-600 text-sm">✓</span>
                        </div>
                        <span className="font-medium text-green-800">导入成功</span>
                      </>
                    )}
                  </div>
                  <p className="text-sm text-slate-600">
                    成功: <span className="font-medium text-green-600">{importResult.success}</span> 条
                    {importResult.failed > 0 && (
                      <>, 失败: <span className="font-medium text-red-600">{importResult.failed}</span> 条</>
                    )}
                  </p>
                  {importResult.errors && importResult.errors.length > 0 && (
                    <div className="mt-2 text-xs text-red-600 max-h-24 overflow-y-auto">
                      {importResult.errors.map((err, idx) => (
                        <p key={idx}>{err}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 模板下载 */}
              <div className="text-center">
                <a
                  href="/api/7s-inspections/template"
                  download
                  className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
                >
                  下载导入模板
                </a>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 flex items-center justify-end gap-3">
              <Button variant="outline" onClick={() => setImportModalOpen(false)}>
                取消
              </Button>
              <Button
                variant="primary"
                onClick={handleImportSubmit}
                disabled={!importFile || importing}
                loading={importing}
              >
                {importing ? '导入中...' : '开始导入'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
