'use client';

import React, { useState, useEffect } from 'react';
import {
  ChartBarIcon,
  ChartPieIcon,
  UsersIcon,
  HomeIcon,
  CurrencyYenIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalendarIcon,
  EyeIcon,
  ClipboardDocumentCheckIcon,
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { Button, Card, Badge, Loading } from '@/components/ui';
import { useStatistics, useOccupancyTrend, useDistribution } from '@/hooks/useApi';
import { useFactories } from '@/hooks/useFactories';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts';

// 报表类型
interface Report {
  id: string;
  name: string;
  description: string;
  category: 'occupancy' | 'personnel' | 'financial' | 'maintenance' | 'access';
  updateTime: string;
  period: string;
}

// 报表列表（从后端获取）
const defaultReports: Report[] = [
  {
    id: '1',
    name: '宿舍入住率统计',
    description: '按楼栋、楼层统计房间入住率及趋势分析',
    category: 'occupancy',
    updateTime: '',
    period: '',
  },
  {
    id: '2',
    name: '人员入住退宿汇总',
    description: '月度人员变动情况、新入住及退宿人员明细',
    category: 'personnel',
    updateTime: '',
    period: '',
  },
  {
    id: '3',
    name: '能源费用结算报表',
    description: '水电费用明细、部门分摊情况及收缴率统计',
    category: 'financial',
    updateTime: '',
    period: '',
  },
  {
    id: '4',
    name: '7s检查记录',
    description: '宿舍7s检查统计、评分趋势及问题分析',
    category: 'maintenance',
    updateTime: '',
    period: '',
  },
];

// 分类配置
const categoryConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  occupancy: { label: '入住分析', icon: HomeIcon, color: 'bg-blue-100 text-blue-700' },
  personnel: { label: '人员分析', icon: UsersIcon, color: 'bg-emerald-100 text-emerald-700' },
  financial: { label: '财务分析', icon: CurrencyYenIcon, color: 'bg-amber-100 text-amber-700' },
  maintenance: { label: '维护检查', icon: ClipboardDocumentCheckIcon, color: 'bg-purple-100 text-purple-700' },
};

// 报表路由映射
const reportRoutes: Record<string, string> = {
  '1': '/admin/reports/occupancy-analysis', // 宿舍入住率统计
  '2': '/admin/reports/personnel-flow', // 人员入住退宿汇总
  '3': '/admin/reports/financial-analysis', // 能源费用结算报表
  '4': '/admin/7s-inspections/statistics', // 7s检查记录跳转到统计分析页面
};

// 报表卡片组件
const ReportCard = ({ report }: { report: Report }) => {
  const router = useRouter();
  const config = categoryConfig[report.category];
  const Icon = config.icon;

  const handleViewClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const route = reportRoutes[report.id];
    if (route) {
      router.push(route);
    }
  };

  const handleCardClick = () => {
    const route = reportRoutes[report.id];
    if (route) {
      router.push(route);
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer group" onClick={handleCardClick}>
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-xl ${config.color}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold text-blue-900 group-hover:text-blue-600 transition-colors">
              {report.name}
            </h3>
            <Badge variant="default" className="text-xs">
              {config.label}
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mb-3 line-clamp-2">{report.description}</p>
          <div className="flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <CalendarIcon className="w-3.5 h-3.5" />
                {report.period}
              </span>
              <span>更新于 {report.updateTime}</span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handleViewClick}
            >
              <EyeIcon className="w-4 h-4 mr-1" />
              查看
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

// 统计概览卡片
const StatCard = ({ 
  title, 
  value, 
  trend, 
  trendUp, 
  icon: Icon,
  color 
}: { 
  title: string; 
  value: string; 
  trend: string; 
  trendUp: boolean;
  icon: React.ElementType;
  color: string;
}) => (
  <Card>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-slate-500 mb-1">{title}</p>
        <p className="text-2xl font-semibold text-blue-900">{value}</p>
        <div className={`flex items-center gap-1 mt-2 text-sm ${trendUp ? 'text-emerald-600' : 'text-red-600'}`}>
          {trendUp ? <ArrowTrendingUpIcon className="w-4 h-4" /> : <ArrowTrendingDownIcon className="w-4 h-4" />}
          <span>{trend}</span>
        </div>
      </div>
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
    </div>
  </Card>
);

export default function ReportsPage() {
  const { data: statsData, loading } = useStatistics();
  const stats = statsData?.data;
  const [reports, setReports] = useState<Report[]>(defaultReports);

  useEffect(() => {
    const now = new Date();
    const periodStr = `${now.getFullYear()}年${now.getMonth() + 1}月`;
    const updateTimeStr = now.toLocaleString('zh-CN');
    
    setReports(prev => prev.map(r => ({
      ...r,
      period: periodStr,
      updateTime: updateTimeStr,
    })));
  }, []);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

  const { data: trendData } = useOccupancyTrend(30);
  const { data: distributionData } = useDistribution();
  const { factories, colorOf } = useFactories();

  // 工厂分布数据排序（与宿舍资源页面一致）
  const factoryData = React.useMemo(() => {
    const data: { name: string; value: number }[] = (distributionData?.data as any)?.factory || [];
    const order = [...factories.map((factory) => factory.name), '未知'];
    const result: { name: string; value: number }[] = [];
    for (const name of order) {
      const item = data.find((d) => d.name === name);
      if (item) result.push(item);
    }
    return result;
  }, [(distributionData?.data as any)?.factory, factories]);

  const periods = [
    { value: 'current', label: '本月' },
    { value: 'last', label: '上月' },
    { value: 'quarter', label: '本季度' },
    { value: 'year', label: '本年度' },
  ];

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-blue-900">报表分析中心</h1>
          <p className="text-sm text-slate-500 mt-1">查看各类统计报表，导出数据分析</p>
        </div>

      </div>

      {/* 统计概览 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="总体入住率"
          value={stats ? `${stats.bedStats?.occupancyRate || 0}%` : '0%'}
          trend={stats ? `床位 ${stats.bedStats?.occupiedBeds || 0}/${stats.bedStats?.totalBeds || 0}` : '加载中...'}
          trendUp={true}
          icon={HomeIcon}
          color="bg-blue-100 text-blue-600"
        />
        <StatCard
          title="在住人数"
          value={stats ? String(stats.personStatusStats?.active || 0) : '0'}
          trend={`已用房间 ${stats?.roomStats?.usedRooms || 0}`}
          trendUp={true}
          icon={UsersIcon}
          color="bg-emerald-100 text-emerald-600"
        />
        <StatCard
          title="可用房间数"
          value={stats ? String(stats.roomStats?.availableRooms || 0) : '0'}
          trend={stats ? `房间利用率 ${stats.roomStats?.roomUtilizationRate || 0}%` : '加载中...'}
          trendUp={true}
          icon={ChartBarIcon}
          color="bg-purple-100 text-purple-600"
        />
        <StatCard
          title="楼栋总数"
          value={stats ? String(stats.totalBuildings || 0) : '0'}
          trend={`房间 ${stats?.roomStats?.totalRooms || 0}间`}
          trendUp={true}
          icon={HomeIcon}
          color="bg-amber-100 text-amber-600"
        />
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="font-semibold text-blue-900 mb-4">入住率趋势</h3>
          <div className="h-[280px]">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <Loading size="lg" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={(trendData?.data as any[]) || []} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorOccupancy2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={{ stroke: '#e2e8f0' }}
                    interval={6}
                  />
                  <YAxis 
                    tick={{ fontSize: 11, fill: '#64748b' }}
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
                    fill="url(#colorOccupancy2)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
        <Card>
          <h3 className="font-semibold text-blue-900 mb-4">工厂分布</h3>
          <div className="h-[280px]">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <Loading size="lg" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={factoryData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={{ stroke: '#e2e8f0' }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={{ stroke: '#e2e8f0' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    formatter={(value) => [`${value}人`, '人数']}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} label={{ position: 'top', fill: '#475569', fontSize: 12, fontWeight: 500 }}>
                    {factoryData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={colorOf(entry.name) || COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          {/* 自定义图例 */}
          <div className="flex justify-center gap-4 mt-2 flex-wrap">
            {factoryData.map((item: any) => (
              <div key={item.name} className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: colorOf(item.name) }}></span>
                <span className="text-sm text-slate-600">{item.name}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* 报表列表 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {reports.map((report) => (
          <ReportCard key={report.id} report={report} />
        ))}
      </div>
    </div>
  );
}
