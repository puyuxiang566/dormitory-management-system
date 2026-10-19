'use client';

import { useState } from 'react';
import { CalendarIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface TimeFilterProps {
  startDate: string;
  endDate: string;
  onFilterChange: (startDate: string, endDate: string) => void;
}

export default function TimeFilter({ startDate, endDate, onFilterChange }: TimeFilterProps) {
  const [customStartDate, setCustomStartDate] = useState(startDate);
  const [customEndDate, setCustomEndDate] = useState(endDate);

  // 快捷时间选项
  const quickFilters = [
    { label: '最近7天', getValue: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 7);
      return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
    }},
    { label: '最近30天', getValue: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 30);
      return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
    }},
    { label: '本月', getValue: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
    }},
    { label: '本季度', getValue: () => {
      const now = new Date();
      const quarter = Math.floor(now.getMonth() / 3);
      const start = new Date(now.getFullYear(), quarter * 3, 1);
      const end = new Date(now.getFullYear(), quarter * 3 + 3, 0);
      return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
    }},
    { label: '本年', getValue: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31);
      return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
    }},
    { label: '全部时间', getValue: () => ({ start: '', end: '' })},
  ];

  const handleQuickFilter = (filter: typeof quickFilters[0]) => {
    const { start, end } = filter.getValue();
    setCustomStartDate(start);
    setCustomEndDate(end);
    onFilterChange(start, end);
  };

  const handleCustomFilter = () => {
    onFilterChange(customStartDate, customEndDate);
  };

  const handleReset = () => {
    setCustomStartDate('');
    setCustomEndDate('');
    onFilterChange('', '');
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900">时间筛选</h3>
        {(startDate || endDate) && (
          <button
            onClick={handleReset}
            className="flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
          >
            <XMarkIcon className="w-4 h-4" />
            重置
          </button>
        )}
      </div>

      {/* 快捷选项 */}
      <div className="flex flex-wrap gap-2 mb-4">
        {quickFilters.map((filter) => (
          <button
            key={filter.label}
            onClick={() => handleQuickFilter(filter)}
            className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-blue-300 transition-colors"
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* 自定义日期范围 */}
      <div className="flex flex-wrap items-end gap-4 pt-4 border-t border-slate-100">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-slate-500 mb-1.5">
            <CalendarIcon className="w-3.5 h-3.5 inline mr-1" />
            开始日期
          </label>
          <input
            type="date"
            value={customStartDate}
            onChange={(e) => setCustomStartDate(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-sm"
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-slate-500 mb-1.5">
            <CalendarIcon className="w-3.5 h-3.5 inline mr-1" />
            结束日期
          </label>
          <input
            type="date"
            value={customEndDate}
            onChange={(e) => setCustomEndDate(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-sm"
          />
        </div>
        <button
          onClick={handleCustomFilter}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          应用
        </button>
      </div>

      {/* 当前筛选状态 */}
      {(startDate || endDate) && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <p className="text-sm text-slate-600">
            当前筛选: 
            {startDate && <span className="font-medium ml-1">{startDate}</span>}
            {startDate && endDate && <span className="mx-1">至</span>}
            {endDate && <span className="font-medium">{endDate}</span>}
          </p>
        </div>
      )}
    </div>
  );
}
