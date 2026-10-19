'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowsUpDownIcon,
} from '@heroicons/react/24/outline';
import Button from './Button';
import Loading from './Loading';
import Empty from './Empty';

// 表格列定义
export interface DataTableColumn<T> {
  key: string;
  title: string;
  width?: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  render?: (record: T, index: number) => React.ReactNode;
}

// 分页信息
export interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

// 表格属性
interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  loading?: boolean;
  pagination?: PaginationInfo;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  onSort?: (key: string, order: 'asc' | 'desc') => void;
  rowKey?: keyof T | ((record: T) => string | number);
  rowSelection?: {
    selectedRowKeys: (string | number)[];
    onChange: (selectedRowKeys: (string | number)[], selectedRows: T[]) => void;
  };
  onRowClick?: (record: T, index: number) => void;
  className?: string;
  emptyText?: string;
}

function DataTableInner<T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  pagination,
  onPageChange,
  onPageSizeChange,
  onSort,
  rowKey = 'id',
  rowSelection,
  onRowClick,
  className = '',
  emptyText = '暂无数据',
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // 处理排序 - 使用 useCallback 缓存
  const handleSort = useCallback((column: DataTableColumn<T>) => {
    if (!column.sortable || !onSort) return;

    let newOrder: 'asc' | 'desc' = 'asc';
    if (sortKey === column.key) {
      newOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    }
    setSortKey(column.key);
    setSortOrder(newOrder);
    onSort(column.key, newOrder);
  }, [sortKey, sortOrder, onSort]);

  // 获取行唯一标识 - 使用 useCallback 缓存
  const getRowKey = useCallback((record: T, index: number): string | number => {
    if (typeof rowKey === 'function') {
      return rowKey(record);
    }
    return record[rowKey as string] ?? index;
  }, [rowKey]);

  // 处理行选择 - 使用 useCallback 缓存
  const handleRowSelect = useCallback((record: T, checked: boolean) => {
    if (!rowSelection) return;

    const key = getRowKey(record, 0);
    const newSelectedKeys = checked
      ? [...rowSelection.selectedRowKeys, key]
      : rowSelection.selectedRowKeys.filter(k => k !== key);

    const newSelectedRows = data.filter(
      (item, index) => newSelectedKeys.includes(getRowKey(item, index))
    );

    rowSelection.onChange(newSelectedKeys, newSelectedRows);
  }, [rowSelection, data, getRowKey]);

  // 处理全选 - 使用 useCallback 缓存
  const handleSelectAll = useCallback((checked: boolean) => {
    if (!rowSelection) return;

    if (checked) {
      const allKeys = data.map((item, index) => getRowKey(item, index));
      rowSelection.onChange(allKeys, data);
    } else {
      rowSelection.onChange([], []);
    }
  }, [rowSelection, data, getRowKey]);

  // 判断是否全选 - 使用 useMemo 缓存
  const isAllSelected = useMemo(() => {
    return rowSelection && data.length > 0 && data.every((item, index) =>
      rowSelection.selectedRowKeys.includes(getRowKey(item, index))
    );
  }, [rowSelection, data, getRowKey]);

  // 分页选项 - 使用 useMemo 缓存
  const pageSizeOptions = useMemo(() => [10, 20, 50, 100], []);

  // 缓存表格行渲染
  const tableRows = useMemo(() => {
    if (data.length === 0) return null;
    
    return data.map((record, index) => {
      const key = getRowKey(record, index);
      const isSelected = rowSelection?.selectedRowKeys.includes(key);

      return (
        <tr
          key={key}
          className={`bg-white hover:bg-blue-50 transition-colors ${
            onRowClick ? 'cursor-pointer' : ''
          } ${isSelected ? 'bg-blue-50' : ''}`}
          onClick={() => onRowClick?.(record, index)}
        >
          {/* 行选择框 */}
          {rowSelection && (
            <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
              <input
                type="checkbox"
                checked={isSelected}
                onChange={(e) => handleRowSelect(record, e.target.checked)}
                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
              />
            </td>
          )}
          {columns.map((column) => (
            <td
              key={column.key}
              className="px-4 py-3 whitespace-nowrap"
              style={{ textAlign: column.align || 'left' }}
              onClick={(e) => e.stopPropagation()}
            >
              {column.render
                ? column.render(record, index)
                : record[column.key]}
            </td>
          ))}
        </tr>
      );
    });
  }, [data, columns, rowSelection, onRowClick, getRowKey, handleRowSelect]);

  if (loading && data.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loading size="lg" />
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 表格 */}
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              {/* 全选框 */}
              {rowSelection && (
                <th className="px-4 py-3 text-left w-10">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-4 py-3 font-medium text-slate-700 whitespace-nowrap ${
                    column.sortable ? 'cursor-pointer hover:bg-slate-100' : ''
                  }`}
                  style={{ width: column.width, textAlign: column.align || 'left' }}
                  onClick={() => handleSort(column)}
                >
                  <div className={`flex items-center gap-1 ${
                    column.align === 'center' ? 'justify-center' : 
                    column.align === 'right' ? 'justify-end' : ''
                  }`}>
                    {column.title}
                    {column.sortable && (
                      <span className="text-slate-400">
                        {sortKey === column.key ? (
                          sortOrder === 'asc' ? (
                            <ChevronUpIcon className="w-4 h-4" />
                          ) : (
                            <ChevronDownIcon className="w-4 h-4" />
                          )
                        ) : (
                          <ArrowsUpDownIcon className="w-3 h-3" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (rowSelection ? 1 : 0)}
                  className="px-4 py-12 text-center"
                >
                  <Empty description={emptyText} />
                </td>
              </tr>
            ) : (
              tableRows
            )}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      {pagination && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500">
              显示 {(pagination.page - 1) * pagination.pageSize + 1} -{' '}
              {Math.min(pagination.page * pagination.pageSize, pagination.total)} 共{' '}
              {pagination.total} 条
            </span>
            {onPageSizeChange && (
              <select
                value={pagination.pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                className="px-2 py-1 text-sm border border-slate-200 rounded focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
              >
                {pageSizeOptions.map((size) => (
                  <option key={size} value={size}>
                    {size} 条/页
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => onPageChange?.(pagination.page - 1)}
            >
              <ChevronLeftIcon className="w-4 h-4" />
            </Button>
            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
              let pageNum: number;
              if (pagination.totalPages <= 5) {
                pageNum = i + 1;
              } else if (pagination.page <= 3) {
                pageNum = i + 1;
              } else if (pagination.page >= pagination.totalPages - 2) {
                pageNum = pagination.totalPages - 4 + i;
              } else {
                pageNum = pagination.page - 2 + i;
              }

              return (
                <Button
                  key={pageNum}
                  variant={pagination.page === pageNum ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => onPageChange?.(pageNum)}
                >
                  {pageNum}
                </Button>
              );
            })}
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => onPageChange?.(pagination.page + 1)}
            >
              <ChevronRightIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// 使用 React.memo 包装 DataTable，避免不必要的重新渲染
export const DataTable = React.memo(DataTableInner) as typeof DataTableInner;
