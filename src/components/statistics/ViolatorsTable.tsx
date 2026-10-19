'use client';

import { useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

interface ViolatorData {
  personName: string;
  personId?: number;
  count: number;
  lastViolationDate: string;
  recentViolations: Array<{
    date: string;
    violationDesc: string;
  }>;
}

interface ViolatorsTableProps {
  repeatedViolators: ViolatorData[];
}

export default function ViolatorsTable({ repeatedViolators }: ViolatorsTableProps) {
  const [sortField, setSortField] = useState<'count' | 'lastViolationDate'>('count');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // 排序数据
  const sortedData = [...repeatedViolators].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    const modifier = sortOrder === 'asc' ? 1 : -1;
    
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return (aValue - bValue) * modifier;
    }
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return aValue.localeCompare(bValue) * modifier;
    }
    return 0;
  });

  const handleSort = (field: 'count' | 'lastViolationDate') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const toggleRow = (personName: string) => {
    setExpandedRow(expandedRow === personName ? null : personName);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100">
        <h3 className="text-lg font-semibold text-slate-900">重点关注人员</h3>
        <p className="text-sm text-slate-500 mt-1">违规次数 ≥ 2 次的人员名单</p>
      </div>
      
      {sortedData.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  序号
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  姓名
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                  onClick={() => handleSort('count')}
                >
                  <div className="flex items-center gap-1">
                    违规次数
                    {sortField === 'count' && (
                      sortOrder === 'asc' ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                  onClick={() => handleSort('lastViolationDate')}
                >
                  <div className="flex items-center gap-1">
                    最近违规日期
                    {sortField === 'lastViolationDate' && (
                      sortOrder === 'asc' ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {sortedData.map((violator, index) => (
                <>
                  <tr 
                    key={violator.personName}
                    className={`hover:bg-slate-50 ${violator.count >= 3 ? 'bg-red-50' : ''}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900">
                        {violator.personName}
                        {violator.count >= 3 && (
                          <span className="ml-2 px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">
                            高频
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-medium ${violator.count >= 3 ? 'text-red-600' : 'text-slate-900'}`}>
                        {violator.count} 次
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {violator.lastViolationDate}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => toggleRow(violator.personName)}
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {expandedRow === violator.personName ? '收起' : '查看详情'}
                      </button>
                    </td>
                  </tr>
                  {expandedRow === violator.personName && (
                    <tr key={`${violator.personName}-details`}>
                      <td colSpan={5} className="px-6 py-4 bg-slate-50">
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-slate-700 mb-2">最近违规记录：</p>
                          {violator.recentViolations.map((violation, vIndex) => (
                            <div key={vIndex} className="flex items-start gap-3 text-sm">
                              <span className="text-slate-500 w-24 flex-shrink-0">{violation.date}</span>
                              <span className="text-slate-700">{violation.violationDesc}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="px-6 py-12 text-center text-slate-400">
          暂无重复违规人员
        </div>
      )}
    </div>
  );
}
