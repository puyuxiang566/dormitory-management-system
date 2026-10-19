'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  PlusIcon,
  UserGroupIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  QrCodeIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CalendarIcon,
  BuildingOfficeIcon,
  PhoneIcon,
  IdentificationIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';

// 类型定义
type VisitorStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';

interface Visitor {
  id: number;
  name: string;
  phone: string;
  idCard: string;
  visitPurpose: string;
  visitBuilding: string;
  visitDate: string;
  visitTimeRange: string;
  hostName: string;
  hostRoom: string;
  status: VisitorStatus;
  createdAt: string;
  approvedBy?: string;
  qrCode?: string;
}

// 状态标签
function StatusBadge({ status }: { status: VisitorStatus }) {
  const config = {
    PENDING: { bg: 'bg-amber-100', text: 'text-amber-700', label: '待审批', icon: ClockIcon },
    APPROVED: { bg: 'bg-blue-100', text: 'text-blue-700', label: '已通过', icon: CheckCircleIcon },
    REJECTED: { bg: 'bg-red-100', text: 'text-red-700', label: '已拒绝', icon: XCircleIcon },
    COMPLETED: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: '已完成', icon: CheckCircleIcon },
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
function StatCard({ title, count, icon: Icon, color }: { title: string; count: number; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500 mb-1">{title}</p>
          <p className="text-3xl font-bold text-slate-900">{count}</p>
        </div>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
}

// 主页面组件
export default function VisitorsPage() {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState<Visitor | null>(null);

  // 加载真实数据
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/visitors');
        const data = await res.json();

        const mappedVisitors: Visitor[] = (data || []).map((v: any) => ({
          id: v.id,
          name: v.name,
          phone: v.phone || '',
          idCard: v.idCard || '',
          visitPurpose: v.visitPurpose || '',
          visitBuilding: v.host?.building?.name || '',
          visitDate: v.visitDate ? new Date(v.visitDate).toLocaleDateString('zh-CN') : '',
          visitTimeRange: v.startTime && v.endTime 
            ? `${new Date(v.startTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}-${new Date(v.endTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`
            : '',
          hostName: v.host?.name || '',
          hostRoom: v.host?.room?.roomNumber || '',
          status: (v.status === 'APPROVED' ? 'APPROVED' : v.status === 'REJECTED' ? 'REJECTED' : v.status === 'COMPLETED' ? 'COMPLETED' : 'PENDING') as 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED',
          createdAt: v.createdAt ? new Date(v.createdAt).toLocaleDateString('zh-CN') : '',
          approvedBy: v.approvedBy || undefined,
        }));

        setVisitors(mappedVisitors);
      } catch (error) {
        console.error('Error fetching visitors:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // 统计数据
  const stats = {
    total: visitors.length,
    pending: visitors.filter((v) => v.status === 'PENDING').length,
    approved: visitors.filter((v) => v.status === 'APPROVED').length,
    today: visitors.filter((v) => v.visitDate === '2026-03-05').length,
  };

  // 筛选
  const filteredVisitors = visitors.filter((visitor) => {
    const matchSearch =
      visitor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      visitor.phone.includes(searchQuery) ||
      visitor.hostName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = selectedStatus ? visitor.status === selectedStatus : true;
    const matchDate = selectedDate ? visitor.visitDate === selectedDate : true;
    return matchSearch && matchStatus && matchDate;
  });

  const handleShowQR = (visitor: Visitor) => {
    setSelectedVisitor(visitor);
    setShowQRModal(true);
  };

  const handleApprove = (id: number) => {
    console.log('Approve visitor:', id);
  };

  const handleReject = (id: number) => {
    console.log('Reject visitor:', id);
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-blue-900">访客管理</h1>
          <p className="text-sm text-slate-500 mt-1">访客预约审批、通行码管理</p>
        </div>
        <Link
          href="/admin/visitors/new"
          className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 
                   text-white font-medium rounded-lg transition-all duration-200 cursor-pointer"
        >
          <PlusIcon className="w-4 h-4" />
          预约访客
        </Link>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="全部预约"
          count={stats.total}
          icon={UserGroupIcon}
          color="bg-blue-500"
        />
        <StatCard
          title="待审批"
          count={stats.pending}
          icon={ClockIcon}
          color="bg-amber-500"
        />
        <StatCard
          title="已通过"
          count={stats.approved}
          icon={CheckCircleIcon}
          color="bg-emerald-500"
        />
        <StatCard
          title="今日访客"
          count={stats.today}
          icon={CalendarIcon}
          color="bg-purple-500"
        />
      </div>

      {/* 筛选栏 */}
      <div className="bg-white rounded-xl shadow-md p-4 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* 搜索 */}
          <div className="relative flex-1 min-w-[200px] max-w-[300px]">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="搜索访客姓名、电话、被访人..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-4 border border-slate-200 rounded-lg
                       text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200
                       outline-none"
            />
          </div>

          {/* 日期筛选 */}
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="h-10 px-3 border border-slate-200 rounded-lg text-sm
                     text-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-200
                     outline-none cursor-pointer"
          />

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
            <option value="COMPLETED">已完成</option>
          </select>

          <button className="flex items-center gap-2 h-10 px-4 border border-slate-200 
                           text-slate-700 text-sm font-medium rounded-lg 
                           hover:bg-slate-50 transition-colors cursor-pointer">
            <FunnelIcon className="w-4 h-4" />
            更多筛选
          </button>
        </div>
      </div>

      {/* 访客表格 */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 text-slate-600 text-sm">
              <tr>
                <th className="px-4 py-3 text-left font-medium">访客信息</th>
                <th className="px-4 py-3 text-left font-medium">访问信息</th>
                <th className="px-4 py-3 text-left font-medium">被访人</th>
                <th className="px-4 py-3 text-center font-medium">状态</th>
                <th className="px-4 py-3 text-left font-medium">预约时间</th>
                <th className="px-4 py-3 text-center font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      加载中...
                    </div>
                  </td>
                </tr>
              ) : filteredVisitors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    <UserGroupIcon className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                    <p>暂无访客预约</p>
                  </td>
                </tr>
              ) : (
                filteredVisitors.map((visitor) => (
                  <tr key={visitor.id} className="hover:bg-blue-50 transition-colors">
                    <td className="px-4 py-4">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{visitor.name}</p>
                        <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                          <PhoneIcon className="w-3 h-3" />
                          {visitor.phone}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                          <IdentificationIcon className="w-3 h-3" />
                          {visitor.idCard.slice(0, 6)}****{visitor.idCard.slice(-4)}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-slate-700">
                        <p className="font-medium">{visitor.visitPurpose}</p>
                        <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                          <BuildingOfficeIcon className="w-3 h-3" />
                          {visitor.visitBuilding}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                          <CalendarIcon className="w-3 h-3" />
                          {visitor.visitDate} {visitor.visitTimeRange}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-slate-700">
                        <p className="font-medium">{visitor.hostName}</p>
                        <p className="text-xs text-slate-500">{visitor.hostRoom}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <StatusBadge status={visitor.status} />
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-700">{visitor.createdAt}</td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {visitor.status === 'APPROVED' && visitor.qrCode && (
                          <button
                            onClick={() => handleShowQR(visitor)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="查看通行码"
                          >
                            <QrCodeIcon className="w-4 h-4" />
                          </button>
                        )}
                        <button className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                title="查看详情">
                          <EyeIcon className="w-4 h-4" />
                        </button>
                        {visitor.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleApprove(visitor.id)}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                              title="通过"
                            >
                              <CheckCircleIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleReject(visitor.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="拒绝"
                            >
                              <XCircleIcon className="w-4 h-4" />
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
            显示 <span className="font-medium">1-{filteredVisitors.length}</span> 共{' '}
            <span className="font-medium">{filteredVisitors.length}</span> 条
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

      {/* QR Code 弹窗 */}
      {showQRModal && selectedVisitor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">访客通行码</h3>
              <p className="text-sm text-slate-500 mb-4">{selectedVisitor.name} - {selectedVisitor.visitDate}</p>
              
              {/* QR Code 占位 */}
              <div className="w-48 h-48 bg-slate-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
                <QrCodeIcon className="w-24 h-24 text-slate-300" />
              </div>
              
              <p className="text-xs text-slate-400 mb-4">二维码有效期：{selectedVisitor.visitTimeRange}</p>
              
              <button
                onClick={() => setShowQRModal(false)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 
                         font-medium rounded-lg transition-colors cursor-pointer"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
