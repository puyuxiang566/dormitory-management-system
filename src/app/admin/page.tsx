'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  UsersIcon,
  HomeIcon,
  CurrencyYenIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  BuildingOfficeIcon,
  ExclamationCircleIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import { Card, Loading, Empty } from '@/components/ui';
import { useStatistics, useOccupancyTrend, useDashboardStats, useBills } from '@/hooks/useApi';
import { formatNumber } from '@/lib/utils';

// 账单类型
interface Bill {
  id: number;
  roomId: number;
  year: number;
  month: number;
  totalAmount?: number;
}
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

// KPI 卡片组件
interface KPICardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'up' | 'down' | 'neutral';
  icon: React.ElementType;
  href?: string;
  loading?: boolean;
}

function KPICard({ title, value, change, changeType = 'neutral', icon: Icon, href, loading }: KPICardProps) {
  const changeColors = {
    up: 'text-emerald-600',
    down: 'text-red-600',
    neutral: 'text-slate-500',
  };

  const changeIcons = {
    up: ArrowTrendingUpIcon,
    down: ArrowTrendingDownIcon,
    neutral: null,
  };

  const ChangeIcon = changeIcons[changeType];

  const content = (
    <Card className="hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
          {loading ? (
            <div className="h-9 w-20 bg-slate-200 rounded animate-pulse" />
          ) : (
            <p className="text-3xl font-semibold text-blue-900">{value}</p>
          )}
          {change && !loading && (
            <div className={`flex items-center gap-1 mt-2 text-sm ${changeColors[changeType]}`}>
              {ChangeIcon && <ChangeIcon className="w-4 h-4" />}
              <span>{change}</span>
            </div>
          )}
        </div>
        <div className="p-3 bg-blue-50 rounded-lg">
          <Icon className="w-6 h-6 text-blue-600" />
        </div>
      </div>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block cursor-pointer">
        {content}
      </Link>
    );
  }

  return content;
}

// 快速操作按钮
function QuickAction({ icon: Icon, label, href }: { icon: React.ElementType; label: string; href: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 hover:bg-blue-50 transition-colors group"
    >
      <div className="p-2 bg-white rounded-lg shadow-sm group-hover:shadow transition-shadow">
        <Icon className="w-5 h-5 text-blue-600" />
      </div>
      <span className="text-sm font-medium text-slate-700 group-hover:text-blue-700">{label}</span>
      <ArrowRightIcon className="w-4 h-4 text-slate-400 ml-auto group-hover:text-blue-600" />
    </Link>
  );
}

export default function AdminDashboard() {
  const { data: statsData, loading, error } = useStatistics();
  const stats = statsData?.data;
  const [period, setPeriod] = useState('7');
  
  const days = parseInt(period);
  const { data: trendData, loading: trendLoading } = useOccupancyTrend(days);
  const { data: dashboardStats } = useDashboardStats();
  const { data: billsData, loading: billsLoading } = useBills();
  
  // 计算费用管理最新月份的应收总额
  // billsData 直接是 Bill[] 数组
  const bills: Bill[] = Array.isArray(billsData) ? billsData : (billsData?.data || []) as Bill[];
  const latestPeriod = bills.length > 0
    ? bills.reduce((latest, bill) => {
        const billPeriod = bill.year * 100 + bill.month;
        const latestPeriod = latest.year * 100 + latest.month;
        return billPeriod > latestPeriod ? bill : latest;
      }, bills[0])
    : null;

  const latestMonthBills = latestPeriod
    ? bills.filter((b) => b.year === latestPeriod.year && b.month === latestPeriod.month)
    : [];

  const latestMonthRevenue = latestMonthBills.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
  const latestMonthText = latestPeriod ? `${latestPeriod.year}年${latestPeriod.month}月` : '本月';

  if (error) {
    return (
      <div className="text-center py-12">
        <ExclamationCircleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-red-900 mb-2">数据加载失败</h3>
        <p className="text-slate-500 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          重新加载
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-semibold text-blue-900">仪表盘</h1>
        <p className="text-sm text-slate-500 mt-1">欢迎回来，查看今日数据概览</p>
      </div>

      {/* KPI 卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard
          title="在住人数"
          value={loading ? '-' : formatNumber(stats?.bedStats?.occupiedBeds || 0)}
          change="较上月 +12"
          changeType="up"
          icon={UsersIcon}
          href="/admin/persons"
          loading={loading}
        />
        <KPICard
          title="总床位数"
          value={loading ? '-' : formatNumber(stats?.bedStats?.totalBeds || 0)}
          change={`入住率 ${stats?.bedStats?.occupancyRate || 0}%`}
          changeType="neutral"
          icon={HomeIcon}
          href="/admin/dorms"
          loading={loading}
        />
        <KPICard
          title={`${latestMonthText}账单`}
          value={billsLoading ? '-' : `¥${formatNumber(latestMonthRevenue)}`}
          change={latestMonthText}
          changeType="neutral"
          icon={CurrencyYenIcon}
          href="/admin/fees"
          loading={billsLoading}
        />
      </div>

      {/* 主要内容区 */}
      <div className="grid grid-cols-1 gap-6">
        {/* 入住率趋势图表 */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-blue-900">入住率趋势</h3>
            <select 
              value={period} 
              onChange={(e) => setPeriod(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
            >
              <option value="7">最近7天</option>
              <option value="30">最近30天</option>
              <option value="90">最近90天</option>
            </select>
          </div>
          <div className="h-[400px]">
            {loading || trendLoading ? (
              <div className="h-full flex items-center justify-center">
                <Loading size="lg" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart 
                  data={(trendData?.data || []) as any} 
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorOccupancy" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={{ stroke: '#e2e8f0' }}
                  />
                  <YAxis 
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={{ stroke: '#e2e8f0' }}
                    domain={[0, 100]}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #e2e8f0', 
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    formatter={(value) => [`${value}%`, '入住率']}
                    labelStyle={{ color: '#1e293b', fontWeight: 600 }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="occupancy" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorOccupancy)"
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* 快速操作 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <QuickAction icon={UsersIcon} label="新增人员" href="/admin/persons" />
        <QuickAction icon={BuildingOfficeIcon} label="分配宿舍" href="/admin/dorms" />
        <QuickAction icon={CurrencyYenIcon} label="生成账单" href="/admin/fees" />
      </div>
    </div>
  );
}
