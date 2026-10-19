'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  PlusIcon,
  DocumentTextIcon,
  HomeIcon,
  ArrowRightOnRectangleIcon,
  ArrowLeftOnRectangleIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  UserCircleIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

// 类型定义
type ApplicationType = 'CHECK_IN' | 'CHECK_OUT' | 'ROOM_CHANGE';
type ApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

interface Application {
  id: number;
  type: ApplicationType;
  applicantName: string;
  applicantId: string;
  department: string;
  currentRoom?: string;
  targetRoom?: string;
  reason: string;
  status: ApplicationStatus;
  createdAt: string;
  approvedBy?: string;
  approvedAt?: string;
}

// 申请类型标签
function TypeBadge({ type }: { type: ApplicationType }) {
  const config = {
    CHECK_IN: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: '入住申请', icon: ArrowRightOnRectangleIcon },
    CHECK_OUT: { bg: 'bg-red-100', text: 'text-red-700', label: '退宿申请', icon: ArrowLeftOnRectangleIcon },
    ROOM_CHANGE: { bg: 'bg-blue-100', text: 'text-blue-700', label: '调房申请', icon: HomeIcon },
  };
  const c = config[type];
  const Icon = c.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      <Icon className="w-3.5 h-3.5" />
      {c.label}
    </span>
  );
}

// 状态标签
function StatusBadge({ status }: { status: ApplicationStatus }) {
  const config = {
    PENDING: { bg: 'bg-amber-100', text: 'text-amber-700', label: '待审批', icon: ClockIcon },
    APPROVED: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: '已通过', icon: CheckCircleIcon },
    REJECTED: { bg: 'bg-red-100', text: 'text-red-700', label: '已拒绝', icon: XCircleIcon },
  };
  const c = config[status];
  const Icon = c.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      <Icon className="w-3.5 h-3.5" />
      {c.label}
    </span>
  );
}

// 统计卡片
function StatCard({ title, count, type }: { title: string; count: number; type: 'total' | 'pending' | 'approved' | 'rejected' }) {
  const colors = {
    total: 'bg-blue-100 text-blue-600',
    pending: 'bg-amber-100 text-amber-600',
    approved: 'bg-emerald-100 text-emerald-600',
    rejected: 'bg-red-100 text-red-600',
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500 mb-1">{title}</p>
          <p className="text-3xl font-bold text-slate-900">{count}</p>
        </div>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colors[type]}`}>
          <DocumentTextIcon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}

// 主页面组件
export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // 加载真实数据
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/applications');
        const data = await res.json();
        
        const typeMap: Record<string, string> = {
          CHECK_IN: '入住申请',
          ROOM_CHANGE: '换房申请',
          CHECK_OUT: '退宿申请',
        };

        const statusMap: Record<string, string> = {
          PENDING: '待审批',
          APPROVED: '已通过',
          REJECTED: '已拒绝',
        };

        const mappedApplications: Application[] = (data || []).map((a: any) => ({
          id: a.id,
          type: a.type,
          applicantName: a.person?.name || '未知',
          applicantId: a.person?.employeeId || '',
          department: a.person?.building?.name || '',
          targetRoom: a.requestData?.targetRoom || '',
          reason: a.note || a.requestData?.reason || '',
          status: (a.status === 'APPROVED' ? 'APPROVED' : a.status === 'REJECTED' ? 'REJECTED' : 'PENDING') as 'PENDING' | 'APPROVED' | 'REJECTED',
          createdAt: a.createdAt ? new Date(a.createdAt).toLocaleDateString('zh-CN') : '',
          approvedBy: a.approvedBy || undefined,
          approvedAt: a.approvedAt ? new Date(a.approvedAt).toLocaleDateString('zh-CN') : undefined,
        }));
        
        setApplications(mappedApplications);
      } catch (error) {
        console.error('Error fetching applications:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // 统计数据
  const stats = {
    total: applications.length,
    pending: applications.filter((a) => a.status === 'PENDING').length,
    approved: applications.filter((a) => a.status === 'APPROVED').length,
    rejected: applications.filter((a) => a.status === 'REJECTED').length,
  };

  // 筛选
  const filteredApplications = applications.filter((app) => {
    const matchSearch =
      app.applicantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.applicantId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchType = selectedType ? app.type === selectedType : true;
    const matchStatus = selectedStatus ? app.status === selectedStatus : true;
    return matchSearch && matchType && matchStatus;
  });

  const handleApprove = (id: number) => {
    console.log('Approve application:', id);
  };

  const handleReject = (id: number) => {
    console.log('Reject application:', id);
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-blue-900">申请管理</h1>
          <p className="text-sm text-slate-500 mt-1">入住、退宿、调房申请审批</p>
        </div>
        <Link
          href="/admin/applications/new"
          className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 
                   text-white font-medium rounded-lg transition-all duration-200 cursor-pointer"
        >
          <PlusIcon className="w-4 h-4" />
          新建申请
        </Link>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="全部申请" count={stats.total} type="total" />
        <StatCard title="待审批" count={stats.pending} type="pending" />
        <StatCard title="已通过" count={stats.approved} type="approved" />
        <StatCard title="已拒绝" count={stats.rejected} type="rejected" />
      </div>

      {/* 筛选栏 */}
      <div className="bg-white rounded-xl shadow-md p-4 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* 搜索 */}
          <div className="relative flex-1 min-w-[200px] max-w-[300px]">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="搜索姓名、工号..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-4 border border-slate-200 rounded-lg
                       text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200
                       outline-none"
            />
          </div>

          {/* 类型筛选 */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="h-10 px-3 border border-slate-200 rounded-lg text-sm
                     text-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-200
                     outline-none cursor-pointer"
          >
            <option value="">全部类型</option>
            <option value="CHECK_IN">入住申请</option>
            <option value="CHECK_OUT">退宿申请</option>
            <option value="ROOM_CHANGE">调房申请</option>
          </select>

          {/* 状态筛选 */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="h-10 px-3 border border-slate-200 rounded-lg text-sm
                     text-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-200
                     outline-none cursor-pointer"
          >
            <option value="">全部状态</option>
            <option value="PENDING">待审批</option>
            <option value="APPROVED">已通过</option>
            <option value="REJECTED">已拒绝</option>
          </select>

          <button className="flex items-center gap-2 h-10 px-4 border border-slate-200 
                           text-slate-700 text-sm font-medium rounded-lg 
                           hover:bg-slate-50 transition-colors cursor-pointer">
            <FunnelIcon className="w-4 h-4" />
            更多筛选
          </button>
        </div>
      </div>

      {/* 申请表格 */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 text-slate-600 text-sm">
              <tr>
                <th className="px-4 py-3 text-left font-medium">申请类型</th>
                <th className="px-4 py-3 text-left font-medium">申请人</th>
                <th className="px-4 py-3 text-left font-medium">房间信息</th>
                <th className="px-4 py-3 text-left font-medium">申请原因</th>
                <th className="px-4 py-3 text-center font-medium">状态</th>
                <th className="px-4 py-3 text-left font-medium">申请时间</th>
                <th className="px-4 py-3 text-center font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      加载中...
                    </div>
                  </td>
                </tr>
              ) : filteredApplications.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    <DocumentTextIcon className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                    <p>暂无申请记录</p>
                  </td>
                </tr>
              ) : (
                filteredApplications.map((app) => (
                  <tr key={app.id} className="hover:bg-blue-50 transition-colors">
                    <td className="px-4 py-4">
                      <TypeBadge type={app.type} />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <UserCircleIcon className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">{app.applicantName}</p>
                          <p className="text-xs text-slate-500">{app.applicantId} · {app.department}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-slate-700">
                        {app.type === 'CHECK_IN' && (
                          <span>目标: <span className="font-medium text-blue-900">{app.targetRoom}</span></span>
                        )}
                        {app.type === 'CHECK_OUT' && (
                          <span>当前: <span className="font-medium text-slate-700">{app.currentRoom}</span></span>
                        )}
                        {app.type === 'ROOM_CHANGE' && (
                          <span>{app.currentRoom} → <span className="font-medium text-blue-900">{app.targetRoom}</span></span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-slate-700 max-w-[200px] truncate" title={app.reason}>
                        {app.reason}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <StatusBadge status={app.status} />
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-700">{app.createdAt}</td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button className="text-sm text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition-colors cursor-pointer">
                          查看
                        </button>
                        {app.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleApprove(app.id)}
                              className="text-sm text-emerald-600 hover:bg-emerald-50 px-2 py-1 rounded transition-colors cursor-pointer"
                            >
                              通过
                            </button>
                            <button
                              onClick={() => handleReject(app.id)}
                              className="text-sm text-red-600 hover:bg-red-50 px-2 py-1 rounded transition-colors cursor-pointer"
                            >
                              拒绝
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 分页 */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
          <div className="text-sm text-slate-500">
            显示 <span className="font-medium">1-{filteredApplications.length}</span> 共{' '}
            <span className="font-medium">{filteredApplications.length}</span> 条
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
              <ChevronLeftIcon className="w-4 h-4 text-slate-600" />
            </button>
            <button className="min-w-[36px] h-9 px-3 rounded-lg text-sm font-medium bg-blue-600 text-white">
              1
            </button>
            <button className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
              <ChevronRightIcon className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
