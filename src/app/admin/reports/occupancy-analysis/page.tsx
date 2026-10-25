'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  HomeIcon,
  ChartBarIcon,
  UsersIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  BuildingOfficeIcon,
  DocumentArrowDownIcon,
  PrinterIcon,
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
import { exportOccupancyReport } from '@/lib/export-occupancy-report';
import { useFactories } from '@/hooks/useFactories';

const BUILDING_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

// 性别中文映射
const genderMap: Record<string, string> = {
  'MALE': '男',
  'FEMALE': '女',
  'male': '男',
  'female': '女',
  'Male': '男',
  'Female': '女',
};

// 性别颜色映射
const genderColorMap: Record<string, string> = {
  '男': '#3b82f6',
  'MALE': '#3b82f6',
  'male': '#3b82f6',
  '女': '#ec4899',
  'FEMALE': '#ec4899',
  'female': '#ec4899',
};

interface BuildingStat {
  id: number;
  name: string;
  totalRooms: number;
  totalBeds: number;
  occupiedBeds: number;
  vacantBeds: number;
  occupancyRate: string;
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

// 自定义饼图标签渲染器 - 显示中文
const renderGenderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }: any) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 1.4;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  
  return null; // 不在饼图上显示标签，改用图例
};

export default function OccupancyAnalysisPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [buildingStats, setBuildingStats] = useState<BuildingStat[]>([]);
  const [genderStats, setGenderStats] = useState<any[]>([]);
  const [departmentStats, setDepartmentStats] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const { factories, colorOf } = useFactories();

  // 动态生成年份选项（当前年份到2024年，到2027年自动显示）
  const yearOptions = React.useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let y = currentYear; y >= 2024; y--) {
      years.push(y);
    }
    return years;
  }, []);

  const fetchAnalysisData = useCallback(async () => {
    setLoading(true);
    try {
      // 获取入住率报表数据 - 传入 period 参数
      const response = await fetch(`/api/reports?type=occupancy&period=${selectedPeriod}`);
      const data = await response.json();

      setBuildingStats(data.buildingStats || []);

      // 处理性别数据 - 确保使用中文
      const processedGender = (data.genderStats || []).map((g: any) => ({
        ...g,
        gender: genderMap[g.gender] || g.gender,
      }));
      setGenderStats(processedGender);

      // 处理部门数据 - 按人数从大到小排序
      const sortedDepts = [...(data.departmentStats || [])].sort((a: any, b: any) => b.count - a.count);
      setDepartmentStats(sortedDepts);

      // 获取趋势数据 - 根据周期动态调整天数
      const config = periodConfig[selectedPeriod];
      let trendDays: number;
      if (selectedPeriod.startsWith('year_')) {
        // 按年度：显示该年365天
        trendDays = 365;
      } else if (config) {
        trendDays = config.trendDays > 0 ? config.trendDays : 365;
      } else {
        trendDays = 365;
      }
      const trendResponse = await fetch(`/api/statistics/occupancy-trend?days=${trendDays}`);
      const trendResult = await trendResponse.json();
      setTrendData(trendResult.data || []);
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
    setGenerating(true);
    await fetchAnalysisData();
    setTimeout(() => setGenerating(false), 500);
  };

  const printReport = () => window.print();
  const exportReport = async () => {
    setExporting(true);
    try {
      await exportOccupancyReport({
        buildingStats,
        genderStats,
        departmentStats: departmentData,
        trendData,
        totalStats,
        periodLabel,
        factoryOptions: factories,
      });
    } catch (error) {
      console.error('导出报告失败:', error);
      alert('导出报告失败，请重试');
    } finally {
      setExporting(false);
    }
  };

  // 计算总体统计
  const totalStats = React.useMemo(() => {
    const totalBeds = buildingStats.reduce((sum, b) => sum + b.totalBeds, 0);
    const occupiedBeds = buildingStats.reduce((sum, b) => sum + b.occupiedBeds, 0);
    const totalRooms = buildingStats.reduce((sum, b) => sum + b.totalRooms, 0);
    const occupancyRate = totalBeds > 0 ? ((occupiedBeds / totalBeds) * 100).toFixed(1) : '0';

    return { totalBeds, occupiedBeds, vacantBeds: totalBeds - occupiedBeds, totalRooms, occupancyRate };
  }, [buildingStats]);

  // 部门数据 - 按预定义顺序显示4个部门
  const departmentData = React.useMemo(() => {
    // 构建部门统计映射（department 标签 -> count）
    const statsMap: Record<string, number> = {};
    departmentStats.forEach((d: any) => {
      const key = d.department;
      statsMap[key] = (statsMap[key] || 0) + d.count;
    });

    // 按系统设置中的工厂顺序返回数据
    return factories.map(factory => ({
      department: factory.name,
      count: statsMap[factory.name] || 0,
      color: colorOf(factory.code),
    }));
  }, [departmentStats, factories, colorOf]);

  const periodLabel = React.useMemo(() => {
    if (selectedPeriod.startsWith('year_')) {
      return selectedPeriod.replace('year_', '') + '年';
    }
    return periodConfig[selectedPeriod]?.label || '本月';
  }, [selectedPeriod]);

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
            <Button variant="ghost" size="sm" onClick={() => router.push('/admin/reports')}>
              ← 返回报表中心
            </Button>
          </div>
          <h1 className="text-2xl font-semibold text-blue-900">宿舍入住率统计分析</h1>
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
          <Button variant="outline" onClick={generateReport} disabled={generating}>
            {generating ? <Loading size="sm" /> : null}
            {generating ? '生成中...' : '刷新报告'}
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
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <ChartBarIcon className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-blue-900">报告摘要</h2>
            <p className="text-sm text-slate-600 mt-1">
              基于{periodLabel}数据的入住率统计分析报告
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div className="bg-white/60 rounded-lg p-3">
            <p className="text-xs text-slate-500 mb-1">总床位数</p>
            <p className="text-2xl font-bold text-blue-900">{totalStats.totalBeds}</p>
          </div>
          <div className="bg-white/60 rounded-lg p-3">
            <p className="text-xs text-slate-500 mb-1">已入住床位</p>
            <p className="text-2xl font-bold text-green-600">{totalStats.occupiedBeds}</p>
          </div>
          <div className="bg-white/60 rounded-lg p-3">
            <p className="text-xs text-slate-500 mb-1">空闲床位</p>
            <p className="text-2xl font-bold text-amber-600">{totalStats.vacantBeds}</p>
          </div>
          <div className="bg-white/60 rounded-lg p-3">
            <p className="text-xs text-slate-500 mb-1">总体入住率</p>
            <p className="text-2xl font-bold text-blue-600">{totalStats.occupancyRate}%</p>
          </div>
        </div>
      </Card>

      {/* 关键指标卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 mb-1">平均入住率</p>
              <p className="text-2xl font-semibold text-blue-900">{totalStats.occupancyRate}%</p>
              <div className="flex items-center gap-1 mt-2 text-sm text-emerald-600">
                <ArrowTrendingUpIcon className="w-4 h-4" />
                <span>较上期 +2.5%</span>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-blue-100 text-blue-600">
              <HomeIcon className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 mb-1">总房间数</p>
              <p className="text-2xl font-semibold text-blue-900">{totalStats.totalRooms}</p>
              <div className="flex items-center gap-1 mt-2 text-sm text-slate-400">
                <BuildingOfficeIcon className="w-4 h-4" />
                <span>{buildingStats.length}栋楼</span>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-purple-100 text-purple-600">
              <BuildingOfficeIcon className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 mb-1">入住人数</p>
              <p className="text-2xl font-semibold text-blue-900">{totalStats.occupiedBeds}</p>
              <div className="flex items-center gap-1 mt-2 text-sm text-emerald-600">
                <UsersIcon className="w-4 h-4" />
                <span>在住人员</span>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-emerald-100 text-emerald-600">
              <UsersIcon className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 mb-1">空置率</p>
              <p className="text-2xl font-semibold text-blue-900">
                {(100 - parseFloat(totalStats.occupancyRate)).toFixed(1)}%
              </p>
              <div className="flex items-center gap-1 mt-2 text-sm text-red-600">
                <ArrowTrendingDownIcon className="w-4 h-4" />
                <span>较上期 -2.5%</span>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-amber-100 text-amber-600">
              <ChartBarIcon className="w-6 h-6" />
            </div>
          </div>
        </Card>
      </div>

      {/* 图表区域 - 第一行 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 入住率趋势 */}
        <Card>
          <h3 className="font-semibold text-blue-900 mb-4">
            入住率趋势（{periodLabel}）
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorOccupancy" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={{ stroke: '#e2e8f0' }}
                  interval={selectedPeriod === 'all' || selectedPeriod.startsWith('year_') || selectedPeriod === 'firstHalf' || selectedPeriod === 'secondHalf' ? 30 : selectedPeriod === 'quarter' || selectedPeriod === 'lastQuarter' ? 7 : 6}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={{ stroke: '#e2e8f0' }}
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
                />
                <Area
                  type="monotone"
                  dataKey="occupancy"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorOccupancy)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* 按楼栋入住率 - 直接在柱状图上显示百分比 */}
        <Card>
          <h3 className="font-semibold text-blue-900 mb-4">各楼栋入住率</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={buildingStats} layout="vertical" margin={{ left: 10, right: 50 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  width={80}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                  formatter={(value) => [`${value}%`, '入住率']}
                />
                <Bar 
                  dataKey="occupancyRate" 
                  radius={[0, 4, 4, 0]}
                  label={{ 
                    position: 'right', 
                    fill: '#1e293b', 
                    fontSize: 12, 
                    fontWeight: 600,
                    formatter: (value: any) => `${value}%`,
                  }}
                >
                  {buildingStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={BUILDING_COLORS[index % BUILDING_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* 图表区域 - 第二行 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 性别分布 - 饼图显示中文 */}
        <Card>
          <h3 className="font-semibold text-blue-900 mb-4">入住人员性别分布</h3>
          <div className="h-[300px]">
            {genderStats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={genderStats}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                    nameKey="gender"
                    label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(1)}%`}
                    labelLine={{ stroke: '#94a3b8', strokeWidth: 1 }}
                  >
                    {genderStats.map((entry, index) => {
                      const color = genderColorMap[entry.gender] || '#94a3b8';
                      return <Cell key={`cell-${index}`} fill={color} />;
                    })}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [`${value}人`, name]}
                  />
                  <Legend
                    formatter={(value) => value}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                该时间段内暂无性别分布数据
              </div>
            )}
          </div>
          <div className="flex justify-center gap-4 mt-2">
            {genderStats.map((item: any) => {
              const color = genderColorMap[item.gender] || '#94a3b8';
              return (
                <div key={item.gender} className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-sm text-slate-600">{item.gender}: {item.count}人</span>
                </div>
              );
            })}
            {genderStats.length === 0 && (
              <span className="text-sm text-slate-400">暂无数据</span>
            )}
          </div>
        </Card>

        {/* 部门分布 - 按预定义4个部门显示 */}
        <Card>
          <h3 className="font-semibold text-blue-900 mb-4">入住人员工厂分布</h3>
          <div className="h-[300px]">
            {departmentData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={departmentData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="department"
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    angle={0}
                    textAnchor="middle"
                    height={30}
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    formatter={(value) => [`${value}人`, '人数']}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} label={{ position: 'top', fill: '#1e293b', fontSize: 12, fontWeight: 600 }}>
                    {departmentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                该时间段内暂无部门分布数据
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* 详细数据表格 */}
      <Card>
        <h3 className="font-semibold text-blue-900 mb-4">楼栋入住详情</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 font-semibold text-slate-700">楼栋名称</th>
                <th className="text-right py-3 px-4 font-semibold text-slate-700">房间数</th>
                <th className="text-right py-3 px-4 font-semibold text-slate-700">总床位</th>
                <th className="text-right py-3 px-4 font-semibold text-slate-700">已入住</th>
                <th className="text-right py-3 px-4 font-semibold text-slate-700">空闲床位</th>
                <th className="text-right py-3 px-4 font-semibold text-slate-700">入住率</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-700">状态</th>
              </tr>
            </thead>
            <tbody>
              {buildingStats.map((building, index) => (
                <tr key={building.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4 font-medium text-blue-900">{building.name}</td>
                  <td className="py-3 px-4 text-right text-slate-600">{building.totalRooms}</td>
                  <td className="py-3 px-4 text-right text-slate-600">{building.totalBeds}</td>
                  <td className="py-3 px-4 text-right text-green-600 font-medium">{building.occupiedBeds}</td>
                  <td className="py-3 px-4 text-right text-amber-600 font-medium">{building.vacantBeds}</td>
                  <td className="py-3 px-4 text-right font-semibold text-blue-600">{building.occupancyRate}%</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all"
                          style={{ width: `${building.occupancyRate}%` }}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
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
                  {periodLabel}总体入住率为 <strong className="text-blue-600">{totalStats.occupancyRate}%</strong>，
                  {parseFloat(totalStats.occupancyRate) >= 90 ? '入住率较高，建议关注空置房间是否需要维修或重新分配' : 
                   parseFloat(totalStats.occupancyRate) >= 70 ? '入住率适中，可继续优化资源配置' : 
                   '入住率偏低，建议调查原因并制定提升策略'}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-500 mt-1">•</span>
                <span>
                  当前空闲床位 <strong className="text-amber-600">{totalStats.vacantBeds}</strong> 个，
                  建议定期检查空置房间状况，确保随时可供入住
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-500 mt-1">•</span>
                <span>
                  建议关注入住率较低的楼栋，分析原因并采取相应措施
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
