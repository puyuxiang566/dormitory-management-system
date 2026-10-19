'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  UsersIcon,
  UserPlusIcon,
  UserMinusIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  DocumentArrowDownIcon,
  PrinterIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';
import { Button, Card, Loading } from '@/components/ui';
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
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { useRouter } from 'next/navigation';
import { exportPersonnelFlowReport } from '@/lib/export-personnel-flow-report';

// 工厂专属颜色
const FACTORY_COLORS: Record<string, string> = {
  'IMCN': '#10b981',
  'IMAW': '#f59e0b',
  'IMFT': '#8b5cf6',
  '职能部门': '#ec4899',
  '未知': '#94a3b8'
};

// 工厂名格式化显示（大写）
function formatFactoryName(factory: string): string {
  const upperFactory = factory.toUpperCase();
  const nameMap: Record<string, string> = {
    'IMCN': 'IMCN',
    'IMAW': 'IMAW',
    'IMFT': 'IMFT',
    '职能部门': '职能部门',
    '未知': '未知',
  };
  return nameMap[upperFactory] || nameMap[factory] || factory;
}

// 时间周期配置
const periodConfig: Record<string, { label: string; trendDays: number }> = {
  month: { label: '本月', trendDays: 30 },
  lastMonth: { label: '上月', trendDays: 60 },
  quarter: { label: '本季度', trendDays: 90 },
  lastQuarter: { label: '上季度', trendDays: 180 },
  firstHalf: { label: '上半年', trendDays: 180 },
  secondHalf: { label: '下半年', trendDays: 180 },
  year: { label: '本年度', trendDays: 365 },
  all: { label: '全部', trendDays: 0 },
};

interface FlowData {
  date: string;
  checkIns: number;
  checkOuts: number;
  netChange: number;
}

export default function PersonnelFlowAnalysisPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [flowData, setFlowData] = useState<FlowData[]>([]);
  const [checkInByFactory, setCheckInByFactory] = useState<any[]>([]);
  const [checkOutByFactory, setCheckOutByFactory] = useState<any[]>([]);
  const [checkInByDepartment, setCheckInByDepartment] = useState<any[]>([]);
  const [checkOutByDepartment, setCheckOutByDepartment] = useState<any[]>([]);
  const [checkInByFactoryDetail, setCheckInByFactoryDetail] = useState<any[]>([]);
  const [summaryStats, setSummaryStats] = useState({
    totalCheckIns: 0,
    totalCheckOuts: 0,
    netChange: 0,
    avgDailyCheckIns: 0,
    avgDailyCheckOuts: 0,
  });

  // 动态生成年份选项（当前年份到2024年）
  const yearOptions = React.useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let y = currentYear; y >= 2024; y--) {
      years.push(y);
    }
    return years;
  }, []);

  // 周期显示文案
  const periodLabel = React.useMemo(() => {
    if (selectedPeriod.startsWith('year_')) {
      return selectedPeriod.replace('year_', '') + '年';
    }
    return periodConfig[selectedPeriod]?.label || '本月';
  }, [selectedPeriod]);

  const fetchAnalysisData = useCallback(async () => {
    setLoading(true);
    try {
      // 获取人员流动数据
      const response = await fetch(`/api/reports/personnel-flow?period=${selectedPeriod}`);
      const data = await response.json();

      setFlowData(data.flowData || []);
      setCheckInByFactory(data.checkInByFactory || []);
      setCheckOutByFactory(data.checkOutByFactory || []);
      setCheckInByDepartment(data.checkInByDepartment || []);
      setCheckOutByDepartment(data.checkOutByDepartment || []);
      setCheckInByFactoryDetail(data.checkInByFactoryDetail || []);
      setSummaryStats(data.summary || {
        totalCheckIns: 0,
        totalCheckOuts: 0,
        netChange: 0,
        avgDailyCheckIns: 0,
        avgDailyCheckOuts: 0,
      });
    } catch (error) {
      console.error('获取分析数据失败:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedPeriod]);

  useEffect(() => {
    fetchAnalysisData();
  }, [fetchAnalysisData]);

  const generateReport = async () => {
    await fetchAnalysisData();
  };

  const printReport = () => {
    window.print();
  };

  const exportReport = async () => {
    setExporting(true);
    try {
      await exportPersonnelFlowReport({
        flowData,
        checkInByFactory,
        checkOutByFactory,
        checkInByDepartment,
        checkInByFactoryDetail,
        summaryStats,
        periodLabel,
      });
    } catch (error) {
      console.error('导出报告失败:', error);
      alert('导出报告失败，请重试');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loading size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* 页面标题 */}
      <div className="flex items-center justify-between no-print">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/admin/reports')}
            >
              ← 返回报表中心
            </Button>
          </div>
          <h1 className="text-2xl font-semibold text-blue-900">人员入住退宿汇总分析</h1>
          <p className="text-sm text-slate-500 mt-1">
            生成时间: {new Date().toLocaleString('zh-CN')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none bg-white"
          >
            <optgroup label="月度">
              <option value="month">本月</option>
              <option value="lastMonth">上月</option>
            </optgroup>
            <optgroup label="季度">
              <option value="quarter">本季度</option>
              <option value="lastQuarter">上季度</option>
            </optgroup>
            <optgroup label="半年">
              <option value="firstHalf">上半年</option>
              <option value="secondHalf">下半年</option>
            </optgroup>
            <optgroup label="年度">
              {yearOptions.map(y => (
                <option key={y} value={`year_${y}`}>{y}年</option>
              ))}
            </optgroup>
            <optgroup label="其他">
              <option value="all">全部数据</option>
            </optgroup>
          </select>
          <Button variant="outline" onClick={generateReport}>
            刷新报告
          </Button>
          <Button variant="outline" onClick={printReport}>
            <PrinterIcon className="w-5 h-5 mr-2" />
            打印
          </Button>
          <Button variant="outline" onClick={exportReport} disabled={exporting}>
            {exporting ? <Loading size="sm" /> : <DocumentArrowDownIcon className="w-5 h-5 mr-2" />}
            {exporting ? '导出中...' : '导出'}
          </Button>
        </div>
      </div>

      {/* 报告摘要 */}
      <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 bg-emerald-100 rounded-lg">
            <UsersIcon className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-emerald-900">报告摘要</h2>
            <p className="text-sm text-slate-600 mt-1">
              基于{periodLabel}数据的人员变动统计分析
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div className="bg-white/60 rounded-lg p-3">
            <p className="text-xs text-slate-500 mb-1">新入住人数</p>
            <p className="text-2xl font-bold text-green-600">{summaryStats.totalCheckIns}</p>
          </div>
          <div className="bg-white/60 rounded-lg p-3">
            <p className="text-xs text-slate-500 mb-1">退宿人数</p>
            <p className="text-2xl font-bold text-red-600">{summaryStats.totalCheckOuts}</p>
          </div>
          <div className="bg-white/60 rounded-lg p-3">
            <p className="text-xs text-slate-500 mb-1">净增人数</p>
            <p className={`text-2xl font-bold ${summaryStats.netChange >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
              {summaryStats.netChange >= 0 ? '+' : ''}{summaryStats.netChange}
            </p>
          </div>
          <div className="bg-white/60 rounded-lg p-3">
            <p className="text-xs text-slate-500 mb-1">日均入住</p>
            <p className="text-2xl font-bold text-purple-600">{summaryStats.avgDailyCheckIns}</p>
          </div>
        </div>
      </Card>

      {/* 关键指标卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 mb-1">新入住人数</p>
              <p className="text-2xl font-semibold text-blue-900">
                {summaryStats.totalCheckIns}
              </p>
              <div className="flex items-center gap-1 mt-2 text-sm text-emerald-600">
                <UserPlusIcon className="w-4 h-4" />
                <span>较上期 +15%</span>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-green-100 text-green-600">
              <UserPlusIcon className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 mb-1">退宿人数</p>
              <p className="text-2xl font-semibold text-blue-900">
                {summaryStats.totalCheckOuts}
              </p>
              <div className="flex items-center gap-1 mt-2 text-sm text-red-600">
                <UserMinusIcon className="w-4 h-4" />
                <span>较上期 -8%</span>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-red-100 text-red-600">
              <UserMinusIcon className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 mb-1">净增人数</p>
              <p className={`text-2xl font-semibold ${summaryStats.netChange >= 0 ? 'text-blue-900' : 'text-red-600'}`}>
                {summaryStats.netChange >= 0 ? '+' : ''}{summaryStats.netChange}
              </p>
              <div className={`flex items-center gap-1 mt-2 text-sm ${summaryStats.netChange >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {summaryStats.netChange >= 0 ? (
                  <>
                    <ArrowTrendingUpIcon className="w-4 h-4" />
                    <span>人员增加</span>
                  </>
                ) : (
                  <>
                    <ArrowTrendingDownIcon className="w-4 h-4" />
                    <span>人员减少</span>
                  </>
                )}
              </div>
            </div>
            <div className={`p-3 rounded-xl ${summaryStats.netChange >= 0 ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}`}>
              <ChartBarIcon className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 mb-1">日均变动</p>
              <p className="text-2xl font-semibold text-blue-900">
                {summaryStats.avgDailyCheckIns + summaryStats.avgDailyCheckOuts}
              </p>
              <div className="flex items-center gap-1 mt-2 text-sm text-slate-400">
                <CalendarIcon className="w-4 h-4" />
                <span>入住+退宿</span>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-purple-100 text-purple-600">
              <CalendarIcon className="w-6 h-6" />
            </div>
          </div>
        </Card>
      </div>

      {/* 图表区域 - 第一行 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 入住退宿趋势 */}
        <Card>
          <h3 className="font-semibold text-blue-900 mb-4">
            入住退宿趋势（{periodLabel}）
          </h3>
          <div className="h-[300px]">
            {flowData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={flowData}>
                <defs>
                  <linearGradient id="colorCheckIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorCheckOut" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={{ stroke: '#e2e8f0' }}
                  interval={selectedPeriod === 'all' || selectedPeriod.startsWith('year_') || selectedPeriod === 'firstHalf' || selectedPeriod === 'secondHalf' ? 30 : selectedPeriod === 'quarter' || selectedPeriod === 'lastQuarter' ? 7 : 6}
                />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="checkIns"
                  name="入住"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorCheckIn)"
                />
                <Area
                  type="monotone"
                  dataKey="checkOuts"
                  name="退宿"
                  stroke="#ef4444"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorCheckOut)"
                />
              </AreaChart>
            </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                该时间段内暂无入住退宿趋势数据
              </div>
            )}
          </div>
        </Card>

        {/* 净增趋势 */}
        <Card>
          <h3 className="font-semibold text-blue-900 mb-4">
            人员净增趋势（{periodLabel}）
          </h3>
          <div className="h-[300px]">
            {flowData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={flowData.map(d => ({ ...d, netIncrease: Math.max(0, d.netChange), netDecrease: Math.min(0, d.netChange) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  interval={selectedPeriod === 'all' || selectedPeriod.startsWith('year_') || selectedPeriod === 'firstHalf' || selectedPeriod === 'secondHalf' ? 30 : selectedPeriod === 'quarter' || selectedPeriod === 'lastQuarter' ? 7 : 6}
                />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                  formatter={((value: number, name: string) => {
                    if (name === '净增' || name === 'netIncrease') return [`${value}人`, '净增'];
                    if (name === '净减' || name === 'netDecrease') return [`${value}人`, '净减'];
                    return [`${value}人`, name];
                  }) as never}
                />
                <Legend
                  formatter={(value) => {
                    if (value === 'netIncrease') return <span style={{ color: '#10b981', fontWeight: 600 }}>净增</span>;
                    if (value === 'netDecrease') return <span style={{ color: '#ef4444', fontWeight: 600 }}>净减</span>;
                    return value;
                  }}
                />
                <Bar dataKey="netIncrease" name="净增" stackId="net" radius={[4, 4, 0, 0]} fill="#10b981" />
                <Bar dataKey="netDecrease" name="净减" stackId="net" radius={[0, 0, 4, 4]} fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                该时间段内暂无净增趋势数据
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* 图表区域 - 第二行 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 按工厂分布 - 入住 */}
        <Card>
          <h3 className="font-semibold text-blue-900 mb-4">新入住人员工厂分布</h3>
          <div className="h-[280px]">
            {checkInByFactory.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={checkInByFactory}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }: any) => `${formatFactoryName(name)} ${(percent * 100).toFixed(1)}%`}
                  outerRadius={90}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                >
                  {checkInByFactory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={FACTORY_COLORS[formatFactoryName(entry.name)] || FACTORY_COLORS['未知']} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend
                  formatter={(value) => (
                    <span style={{ color: FACTORY_COLORS[formatFactoryName(value)] || '#64748b', fontWeight: 600 }}>{formatFactoryName(value)}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                该时间段内暂无入住人员数据
              </div>
            )}
          </div>
        </Card>

        {/* 按工厂分布 - 退宿 */}
        <Card>
          <h3 className="font-semibold text-blue-900 mb-4">退宿人员工厂分布</h3>
          <div className="h-[280px]">
            {checkOutByFactory.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={checkOutByFactory}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }: any) => `${formatFactoryName(name)} ${(percent * 100).toFixed(1)}%`}
                  outerRadius={90}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                >
                  {checkOutByFactory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={FACTORY_COLORS[formatFactoryName(entry.name)] || FACTORY_COLORS['未知']} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend
                  formatter={(value) => (
                    <span style={{ color: FACTORY_COLORS[formatFactoryName(value)] || '#64748b', fontWeight: 600 }}>{formatFactoryName(value)}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                该时间段内暂无退宿人员数据
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* 工厂对比分析 */}
      <Card>
        <h3 className="font-semibold text-blue-900 mb-4">工厂入住退宿对比分析（{periodLabel}）</h3>
        <div className="h-[350px]">
          {checkInByFactoryDetail.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={checkInByFactoryDetail.map(d => ({ ...d, factory: formatFactoryName(d.factory) }))} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis
                type="category"
                dataKey="factory"
                tick={{ fontSize: 12, fill: '#1e293b', fontWeight: 600 }}
                width={80}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
                formatter={(value, name) => [`${value}人`, name === 'checkIns' ? '入住' : '退宿']}
              />
              <Legend
                formatter={(value) => {
                  if (value === 'checkIns') return <span style={{ color: '#10b981', fontWeight: 600 }}>■ 入住</span>;
                  if (value === 'checkOuts') return <span style={{ color: '#ef4444', fontWeight: 600 }}>■ 退宿</span>;
                  return value;
                }}
              />
              <Bar dataKey="checkIns" name="checkIns" radius={[0, 4, 4, 0]}>
                {checkInByFactoryDetail.map((entry, index) => (
                  <Cell key={`checkIn-${index}`} fill={FACTORY_COLORS[formatFactoryName(entry.factory)] || FACTORY_COLORS['未知']} />
                ))}
              </Bar>
              <Bar dataKey="checkOuts" name="checkOuts" radius={[0, 4, 4, 0]}>
                {checkInByFactoryDetail.map((entry, index) => (
                  <Cell key={`checkOut-${index}`} fill={FACTORY_COLORS[formatFactoryName(entry.factory)] || FACTORY_COLORS['未知']} fillOpacity={0.4} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400 text-sm">
              该时间段内暂无工厂对比数据
            </div>
          )}
        </div>
      </Card>

      {/* 工厂变动明细 */}
      <Card>
        <h3 className="font-semibold text-blue-900 mb-4">工厂变动明细</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 font-semibold text-slate-700">工厂</th>
                <th className="text-right py-3 px-4 font-semibold text-slate-700">新入住</th>
                <th className="text-right py-3 px-4 font-semibold text-slate-700">退宿</th>
                <th className="text-right py-3 px-4 font-semibold text-slate-700">净增</th>
                <th className="text-right py-3 px-4 font-semibold text-slate-700">变动率</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-700">趋势</th>
              </tr>
            </thead>
            <tbody>
              {checkInByFactoryDetail.map((item, index) => {
                const netChange = item.checkIns - item.checkOuts;
                const changeRate = item.checkIns > 0 ? ((netChange / item.checkIns) * 100).toFixed(1) : '0';
                const factoryColor = FACTORY_COLORS[formatFactoryName(item.factory)] || '#94a3b8';
                const displayName = formatFactoryName(item.factory);
                
                return (
                  <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4 font-medium text-blue-900">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: factoryColor }}></span>
                        {displayName}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-medium" style={{ color: factoryColor }}>{item.checkIns}</td>
                    <td className="py-3 px-4 text-right text-red-600 font-medium">{item.checkOuts}</td>
                    <td className={`py-3 px-4 text-right font-semibold ${netChange >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                      {netChange >= 0 ? '+' : ''}{netChange}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-600">{changeRate}%</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min(Math.abs(parseFloat(changeRate)), 100)}%`,
                              backgroundColor: factoryColor,
                              opacity: netChange >= 0 ? 1 : 0.5,
                            }}
                          />
                        </div>
                        {netChange >= 0 ? (
                          <ArrowTrendingUpIcon className="w-4 h-4 text-green-500" />
                        ) : (
                          <ArrowTrendingDownIcon className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 分析建议 */}
      <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-amber-100 rounded-lg">
            <ChartBarIcon className="w-6 h-6 text-amber-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-amber-900 mb-2">分析建议</h3>
            <ul className="space-y-2 text-sm text-slate-700">
              <li className="flex items-start gap-2">
                <span className="text-amber-500 mt-1">•</span>
                <span>
                  {periodLabel}新入住 <strong className="text-green-600">{summaryStats.totalCheckIns}</strong> 人，
                  退宿 <strong className="text-red-600">{summaryStats.totalCheckOuts}</strong> 人，
                  净增 <strong className={summaryStats.netChange >= 0 ? 'text-blue-600' : 'text-red-600'}>
                    {summaryStats.netChange >= 0 ? '+' : ''}{summaryStats.netChange}
                  </strong> 人，
                  {summaryStats.netChange >= 0 ? '宿舍资源压力增加，需关注床位供给' : '人员流失，建议分析原因'}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-500 mt-1">•</span>
                <span>
                  日均入住 <strong className="text-purple-600">{summaryStats.avgDailyCheckIns}</strong> 人，
                  建议优化入住流程，提高办理效率
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-500 mt-1">•</span>
                <span>
                  建议关注退宿率较高的工厂，了解员工流动原因，制定留人策略
                </span>
              </li>
            </ul>
          </div>
        </div>
      </Card>

      {/* 打印样式 */}
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
}
