'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  PlusIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  KeyIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  QrCodeIcon,
  DevicePhoneMobileIcon,
  ExclamationTriangleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  UserCircleIcon,
  BuildingOfficeIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

// 类型定义
interface FaceRecord {
  id: number;
  personId: number;
  personName: string;
  employeeId: string;
  buildingName: string;
  roomNumber: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  lastSyncAt: string | null;
}

interface Visitor {
  id: number;
  name: string;
  phone: string;
  idCard: string;
  visitPurpose: string;
  visitBuilding: string;
  visitDate: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  approvedBy: string | null;
}

interface AccessRecord {
  id: number;
  personName: string;
  type: 'EMPLOYEE' | 'VISITOR';
  buildingName: string;
  deviceName: string;
  accessType: 'IN' | 'OUT';
  accessTime: string;
  status: 'SUCCESS' | 'FAILED';
}

// 状态标签组件
function FaceStatusBadge({ status }: { status: string }) {
  const config = {
    ACTIVE: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: '正常' },
    INACTIVE: { bg: 'bg-slate-100', text: 'text-slate-600', label: '停用' },
  };
  const c = config[status as keyof typeof config] || config.INACTIVE;
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}

function VisitorStatusBadge({ status }: { status: string }) {
  const config = {
    PENDING: { bg: 'bg-amber-100', text: 'text-amber-700', label: '待审批' },
    APPROVED: { bg: 'bg-blue-100', text: 'text-blue-700', label: '已通过' },
    REJECTED: { bg: 'bg-red-100', text: 'text-red-700', label: '已拒绝' },
    COMPLETED: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: '已完成' },
  };
  const c = config[status as keyof typeof config] || config.PENDING;
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}

// 标签页组件
function Tabs({ activeTab, onTabChange }: { activeTab: string; onTabChange: (tab: string) => void }) {
  const tabs = [
    { id: 'faces', label: '人脸库', icon: UserCircleIcon },
    { id: 'visitors', label: '访客管理', icon: UserGroupIcon },
    { id: 'records', label: '通行记录', icon: ClockIcon },
  ];

  return (
    <div className="border-b border-slate-200 mb-6">
      <div className="flex gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors cursor-pointer
                ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// 主页面组件
export default function AccessPage() {
  const [activeTab, setActiveTab] = useState('faces');
  const [faceRecords, setFaceRecords] = useState<FaceRecord[]>([]);
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [accessRecords, setAccessRecords] = useState<AccessRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);

  // 模拟数据加载
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [faceRes, visitorRes, accessRes] = await Promise.all([
          fetch('/api/face-records'),
          fetch('/api/visitors'),
          fetch('/api/access-records'),
        ]);

        const faceData = await faceRes.json();
        const visitorData = await visitorRes.json();
        const accessData = await accessRes.json();

        const mappedFaceRecords: FaceRecord[] = (faceData || []).map((r: any) => ({
          id: r.id,
          personId: r.personId || 0,
          personName: r.person?.name || '未知',
          employeeId: r.person?.employeeId || '',
          buildingName: r.permissiongroup?.building?.name || r.person?.building?.name || '未知',
          roomNumber: r.person?.room?.roomNumber || '未分配',
          status: r.isActive ? 'ACTIVE' : 'INACTIVE',
          createdAt: r.createdAt ? new Date(r.createdAt).toLocaleDateString('zh-CN') : '',
          lastSyncAt: r.expiresAt ? new Date(r.expiresAt).toLocaleDateString('zh-CN') : null,
        }));

        const mappedVisitors: Visitor[] = (visitorData || []).map((v: any) => ({
          id: v.id,
          name: v.name,
          phone: v.phone || '',
          idCard: v.idCard || '',
          visitPurpose: v.visitPurpose || '',
          visitBuilding: v.host?.building?.name || v.host?.building?.name || '未知',
          visitDate: v.visitDate ? new Date(v.visitDate).toLocaleDateString('zh-CN') : '',
          status: v.status as 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED',
          approvedBy: v.approvedBy ? '管理员' : null,
        }));

        const mappedAccessRecords: AccessRecord[] = (accessData || []).map((a: any) => ({
          id: a.id,
          personName: a.person?.name || '未知',
          type: 'EMPLOYEE' as const,
          buildingName: a.person?.building?.name || a.deviceId || '未知',
          deviceName: a.deviceId || '未知设备',
          accessType: a.eventType === 'IN' ? 'IN' as const : 'OUT' as const,
          accessTime: a.timestamp ? new Date(a.timestamp).toLocaleString('zh-CN') : '',
          status: a.eventType?.includes('FAILED') ? 'FAILED' as const : 'SUCCESS' as const,
        }));

        setFaceRecords(mappedFaceRecords);
        setVisitors(mappedVisitors);
        setAccessRecords(mappedAccessRecords);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // 统计
  const stats = {
    totalFaces: faceRecords.length,
    activeFaces: faceRecords.filter((f) => f.status === 'ACTIVE').length,
    pendingVisitors: visitors.filter((v) => v.status === 'PENDING').length,
    todayAccess: accessRecords.length,
  };

  const handleClearAccessData = async () => {
    setClearing(true);
    try {
      const response = await fetch('/api/access/clear', {
        method: 'DELETE',
      });
      if (response.ok) {
        setFaceRecords([]);
        setVisitors([]);
        setAccessRecords([]);
        setShowClearConfirm(false);
        alert('门禁数据已清空');
      } else {
        const data = await response.json();
        alert(data.error || '清空失败');
      }
    } catch (error) {
      console.error('Clear error:', error);
      alert('清空失败');
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-blue-900">门禁管理</h1>
          <p className="text-sm text-slate-500 mt-1">人脸识别、访客预约、通行记录管理</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowClearConfirm(true)}
            className="flex items-center gap-2 px-4 py-2.5 border border-red-200 
                     text-red-600 font-medium rounded-lg hover:bg-red-50 
                     transition-all duration-200 cursor-pointer"
          >
            <TrashIcon className="w-4 h-4" />
            清空数据
          </button>
          {activeTab === 'faces' && (
            <Link
              href="/admin/access/faces/sync"
              className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 
                       text-slate-700 font-medium rounded-lg hover:bg-slate-50 
                       transition-all duration-200 cursor-pointer"
            >
              <DevicePhoneMobileIcon className="w-4 h-4" />
              同步设备
            </Link>
          )}
          {activeTab === 'visitors' && (
            <Link
              href="/admin/access/visitors/new"
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 
                       text-white font-medium rounded-lg transition-all duration-200 cursor-pointer"
            >
              <PlusIcon className="w-4 h-4" />
              预约访客
            </Link>
          )}
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <UserCircleIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">人脸库总数</p>
              <p className="text-2xl font-bold text-blue-900">{stats.totalFaces}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-100 rounded-lg">
              <CheckCircleIcon className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">正常状态</p>
              <p className="text-2xl font-bold text-blue-900">{stats.activeFaces}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-100 rounded-lg">
              <UserGroupIcon className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">待审批访客</p>
              <p className="text-2xl font-bold text-blue-900">{stats.pendingVisitors}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <ClockIcon className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">今日通行</p>
              <p className="text-2xl font-bold text-blue-900">{stats.todayAccess}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 标签页 */}
      <Tabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* 搜索栏 */}
      <div className="bg-white rounded-xl shadow-md p-4 mb-4">
        <div className="flex flex-wrap items-center gap-3">
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
          <button className="flex items-center gap-2 h-10 px-4 border border-slate-200 
                           text-slate-700 text-sm font-medium rounded-lg 
                           hover:bg-slate-50 transition-colors cursor-pointer">
            <FunnelIcon className="w-4 h-4" />
            筛选
          </button>
        </div>
      </div>

      {/* 人脸库内容 */}
      {activeTab === 'faces' && (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 text-slate-600 text-sm">
              <tr>
                <th className="px-4 py-3 text-left font-medium">人员信息</th>
                <th className="px-4 py-3 text-left font-medium">宿舍分配</th>
                <th className="px-4 py-3 text-center font-medium">状态</th>
                <th className="px-4 py-3 text-left font-medium">创建时间</th>
                <th className="px-4 py-3 text-left font-medium">最后同步</th>
                <th className="px-4 py-3 text-center font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {faceRecords.map((record) => (
                <tr key={record.id} className="hover:bg-blue-50 transition-colors">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <UserCircleIcon className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{record.personName}</p>
                        <p className="text-xs text-slate-500">{record.employeeId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-700">
                    {record.buildingName} {record.roomNumber}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <FaceStatusBadge status={record.status} />
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-700">{record.createdAt}</td>
                  <td className="px-4 py-4 text-sm text-slate-700">
                    {record.lastSyncAt || <span className="text-amber-600">未同步</span>}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <button className="text-sm text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors cursor-pointer">
                      详情
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 访客管理内容 */}
      {activeTab === 'visitors' && (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 text-slate-600 text-sm">
              <tr>
                <th className="px-4 py-3 text-left font-medium">访客信息</th>
                <th className="px-4 py-3 text-left font-medium">访问目的</th>
                <th className="px-4 py-3 text-left font-medium">访问楼栋</th>
                <th className="px-4 py-3 text-left font-medium">访问日期</th>
                <th className="px-4 py-3 text-center font-medium">状态</th>
                <th className="px-4 py-3 text-center font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visitors.map((visitor) => (
                <tr key={visitor.id} className="hover:bg-blue-50 transition-colors">
                  <td className="px-4 py-4">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{visitor.name}</p>
                      <p className="text-xs text-slate-500">{visitor.phone}</p>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-700">{visitor.visitPurpose}</td>
                  <td className="px-4 py-4 text-sm text-slate-700">{visitor.visitBuilding}</td>
                  <td className="px-4 py-4 text-sm text-slate-700">{visitor.visitDate}</td>
                  <td className="px-4 py-4 text-center">
                    <VisitorStatusBadge status={visitor.status} />
                  </td>
                  <td className="px-4 py-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button className="text-sm text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition-colors cursor-pointer">
                        查看
                      </button>
                      {visitor.status === 'PENDING' && (
                        <>
                          <button className="text-sm text-emerald-600 hover:bg-emerald-50 px-2 py-1 rounded transition-colors cursor-pointer">
                            通过
                          </button>
                          <button className="text-sm text-red-600 hover:bg-red-50 px-2 py-1 rounded transition-colors cursor-pointer">
                            拒绝
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 通行记录内容 */}
      {activeTab === 'records' && (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 text-slate-600 text-sm">
              <tr>
                <th className="px-4 py-3 text-left font-medium">人员</th>
                <th className="px-4 py-3 text-left font-medium">类型</th>
                <th className="px-4 py-3 text-left font-medium">楼栋</th>
                <th className="px-4 py-3 text-left font-medium">设备</th>
                <th className="px-4 py-3 text-center font-medium">进出</th>
                <th className="px-4 py-3 text-left font-medium">时间</th>
                <th className="px-4 py-3 text-center font-medium">结果</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {accessRecords.map((record) => (
                <tr key={record.id} className="hover:bg-blue-50 transition-colors">
                  <td className="px-4 py-4 text-sm font-medium text-slate-900">{record.personName}</td>
                  <td className="px-4 py-4 text-sm text-slate-700">
                    {record.type === 'EMPLOYEE' ? '员工' : '访客'}
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-700">{record.buildingName}</td>
                  <td className="px-4 py-4 text-sm text-slate-700">{record.deviceName}</td>
                  <td className="px-4 py-4 text-center">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      record.accessType === 'IN' 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {record.accessType === 'IN' ? '进入' : '离开'}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-700">{record.accessTime}</td>
                  <td className="px-4 py-4 text-center">
                    {record.status === 'SUCCESS' ? (
                      <CheckCircleIcon className="w-5 h-5 text-emerald-500 mx-auto" />
                    ) : (
                      <XCircleIcon className="w-5 h-5 text-red-500 mx-auto" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 清空确认对话框 */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-100 rounded-full">
                <TrashIcon className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">确认清空</h3>
            </div>
            <p className="text-slate-600 mb-6">
              确定要清空所有门禁数据吗？此操作将删除：
            </p>
            <ul className="text-sm text-slate-600 mb-6 space-y-1">
              <li>• 通行记录（{accessRecords.length} 条）</li>
              <li>• 人脸记录（{faceRecords.length} 条）</li>
              <li>• 访客记录（{visitors.length} 条）</li>
              <li>• 权限组配置</li>
            </ul>
            <p className="text-red-600 text-sm mb-6 font-medium">
              此操作不可恢复，请谨慎操作！
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                disabled={clearing}
                className="px-4 py-2 text-slate-700 font-medium rounded-lg 
                         hover:bg-slate-100 transition-colors cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={handleClearAccessData}
                disabled={clearing}
                className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg 
                         hover:bg-red-700 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {clearing ? '清空中...' : '确认清空'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
