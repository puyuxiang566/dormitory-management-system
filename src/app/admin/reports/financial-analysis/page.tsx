'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  CurrencyYenIcon,
  ChartBarIcon,
  BoltIcon,
  FireIcon,
  SparklesIcon,
  DocumentArrowDownIcon,
  PrinterIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline';
import { Button, Card, Loading } from '@/components/ui';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  ComposedChart,
  Area,
  Line,
} from 'recharts';
import { useRouter } from 'next/navigation';
import { exportFinancialAnalysisReport } from '@/lib/export-financial-analysis-report';

// 颜色配置
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

// 费用类型颜色映射
const FEE_TYPE_COLORS: Record<string, string> = {
  '电费': '#f59e0b',
  '热水费': '#ef4444',
  '冷水费': '#3b82f6',
};

// 自定义图例组件
const CustomLegend = () => {
  const items = [
    { name: '总费用', color: '#8b5cf6' },
    { name: '电费', color: '#f59e0b' },
    { name: '热水费', color: '#ef4444' },
    { name: '冷水费', color: '#3b82f6' },
  ];

  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 16, paddingTop: 10, fontSize: 12 }}>
      {items.map((item) => (
        <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              display: 'inline-block',
              width: 12,
              height: 3,
              backgroundColor: item.color,
              borderRadius: 2,
            }}
          />
          <span style={{ color: '#475569' }}>{item.name}</span>
        </div>
      ))}
    </div>
  );
};

// 时间周期配置
const periodConfig: Record<string, { label: string }> = {
  month: { label: '本月' },
  lastMonth: { label: '上月' },
  quarter: { label: '本季度' },
  lastQuarter: { label: '上季度' },
  firstHalf: { label: '上半年' },
  secondHalf: { label: '下半年' },
  year: { label: '本年度' },
  all: { label: '全部' },
};

export default function FinancialAnalysisPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [summary, setSummary] = useState({
    totalAmount: 0,
    electricityTotal: 0,
    hotWaterTotal: 0,
    coldWaterTotal: 0,
  });
  const [monthlyStats, setMonthlyStats] = useState<any[]>([]);
  const [departmentStats, setDepartmentStats] = useState<any[]>([]);
  const [billTypeStats, setBillTypeStats] = useState<any[]>([]);

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
      const response = await fetch(`/api/reports?type=financial&period=${selectedPeriod}`);
      const data = await response.json();

      setSummary(data.summary || {
        totalAmount: 0,
        electricityTotal: 0,
        hotWaterTotal: 0,
        coldWaterTotal: 0,
      });
      setMonthlyStats(data.monthlyStats || []);
      setDepartmentStats(data.departmentStats || []);
      setBillTypeStats(data.billTypeStats || []);
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

  const exportReport = async () => {
    setExporting(true);
    try {
      await exportFinancialAnalysisReport({
        summary,
        monthlyStats,
        departmentStats,
        billTypeStats,
        periodLabel,
      });
    } catch (error) {
      console.error('导出报告失败:', error);
      const msg = error instanceof Error ? error.message : String(error);
      alert(`导出报告失败: ${msg}`);
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
          <h1 className="text-2xl font-semibold text-blue-900">能源费用结算报表分析</h1>
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
          <Button variant="outline" onClick={() => window.print()}>
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
      <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 bg-amber-100 rounded-lg">
            <CurrencyYenIcon className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-amber-900">报告摘要</h2>
            <p className="text-sm text-slate-600 mt-1">
              基于{periodLabel}数据的能源费用结算分析
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div className="bg-white/60 rounded-lg p-3">
            <p className="text-xs text-slate-500 mb-1">总费用</p>
            <p className="text-2xl font-bold text-blue-900">¥{summary.totalAmount.toLocaleString()}</p>
          </div>
          <div className="bg-white/60 rounded-lg p-3">
            <p className="text-xs text-slate-500 mb-1">电费</p>
            <p className="text-2xl font-bold text-amber-600">¥{summary.electricityTotal.toLocaleString()}</p>
          </div>
          <div className="bg-white/60 rounded-lg p-3">
            <p className="text-xs text-slate-500 mb-1">热水费</p>
            <p className="text-2xl font-bold text-red-500">¥{summary.hotWaterTotal.toLocaleString()}</p>
          </div>
          <div className="bg-white/60 rounded-lg p-3">
            <p className="text-xs text-slate-500 mb-1">冷水费</p>
            <p className="text-2xl font-bold text-blue-500">¥{summary.coldWaterTotal.toLocaleString()}</p>
          </div>
        </div>
      </Card>

      {/* 关键指标卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 mb-1">总费用金额</p>
              <p className="text-2xl font-semibold text-blue-900">
                ¥{summary.totalAmount.toLocaleString()}
              </p>
              <div className="flex items-center gap-1 mt-2 text-sm text-slate-400">
                <CurrencyYenIcon className="w-4 h-4" />
                <span>{periodLabel}合计</span>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-amber-100 text-amber-600">
              <CurrencyYenIcon className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 mb-1">电费</p>
              <p className="text-2xl font-semibold text-amber-600">
                ¥{summary.electricityTotal.toLocaleString()}
              </p>
              <div className="flex items-center gap-1 mt-2 text-sm text-slate-400">
                <BoltIcon className="w-4 h-4" />
                <span>{summary.totalAmount > 0 ? ((summary.electricityTotal / summary.totalAmount) * 100).toFixed(1) : 0}%</span>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-amber-100 text-amber-600">
              <BoltIcon className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 mb-1">热水费</p>
              <p className="text-2xl font-semibold text-red-500">
                ¥{summary.hotWaterTotal.toLocaleString()}
              </p>
              <div className="flex items-center gap-1 mt-2 text-sm text-slate-400">
                <FireIcon className="w-4 h-4" />
                <span>{summary.totalAmount > 0 ? ((summary.hotWaterTotal / summary.totalAmount) * 100).toFixed(1) : 0}%</span>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-red-100 text-red-500">
              <FireIcon className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 mb-1">冷水费</p>
              <p className="text-2xl font-semibold text-blue-500">
                ¥{summary.coldWaterTotal.toLocaleString()}
              </p>
              <div className="flex items-center gap-1 mt-2 text-sm text-slate-400">
                <SparklesIcon className="w-4 h-4" />
                <span>{summary.totalAmount > 0 ? ((summary.coldWaterTotal / summary.totalAmount) * 100).toFixed(1) : 0}%</span>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-blue-100 text-blue-500">
              <SparklesIcon className="w-6 h-6" />
            </div>
          </div>
        </Card>
      </div>

      {/* 图表区域 - 第一行 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 费用趋势 */}
        <Card>
          <h3 className="font-semibold text-blue-900 mb-4">费用趋势（{periodLabel}）</h3>
          <div className="h-[300px]">
            {monthlyStats.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthlyStats}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={{ stroke: '#e2e8f0' }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                  formatter={(value) => [`¥${Number(value).toLocaleString()}`, '']}
                />
                <Legend content={<CustomLegend />} />
                {/* 强制刷新标记: 2026-04-22-legend-order */}
                <Area
                  type="monotone"
                  dataKey="amount"
                  name="总费用"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorAmount)"
                />
                <Line
                  type="monotone"
                  dataKey="electricity"
                  name="电费"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ fill: '#f59e0b', strokeWidth: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="hotWater"
                  name="热水费"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ fill: '#ef4444', strokeWidth: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="coldWater"
                  name="冷水费"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', strokeWidth: 2 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                该时间段内暂无费用趋势数据
              </div>
            )}
          </div>
        </Card>

        {/* 费用类型分布 */}
        <Card>
          <h3 className="font-semibold text-blue-900 mb-4">费用类型分布</h3>
          <div className="h-[300px]">
            {billTypeStats.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={billTypeStats}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(1)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="amount"
                  nameKey="type"
                >
                  {billTypeStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={FEE_TYPE_COLORS[entry.type] || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [`¥${Number(value).toLocaleString()}`, '金额']}
                />
              </PieChart>
            </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                该时间段内暂无费用类型数据
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* 图表区域 - 第二行 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 房间费用分摊 */}
        <Card>
          <h3 className="font-semibold text-blue-900 mb-4">房间费用分摊情况（{periodLabel}） (Top 10)</h3>
          <div className="h-[300px]">
            {departmentStats.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={departmentStats} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={(value) => `¥${(value / 1000).toFixed(0)}k`}
                />
                <YAxis
                  type="category"
                  dataKey="department"
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
                  formatter={(value) => [`¥${Number(value).toLocaleString()}`, '费用']}
                />
                <Bar dataKey="amount" fill="#f59e0b" radius={[0, 4, 4, 0]}>
                  {departmentStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                该时间段内暂无房间费用数据
              </div>
            )}
          </div>
        </Card>

        {/* 分项费用对比 */}
        <Card>
          <h3 className="font-semibold text-blue-900 mb-4">分项费用对比</h3>
          <div className="h-[300px]">
            {billTypeStats.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={billTypeStats} margin={{ top: 20, right: 10, left: 0, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="type"
                  tick={{ fontSize: 12, fill: '#64748b' }}
                />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                  formatter={(value) => [`¥${Number(value).toLocaleString()}`, '金额']}
                />
                <Bar dataKey="amount" radius={[4, 4, 0, 0]} label={{ position: 'top', fill: '#1e293b', fontSize: 12, fontWeight: 600, formatter: (value: any) => `¥${Number(value).toLocaleString()}` }}>
                  {billTypeStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={FEE_TYPE_COLORS[entry.type] || COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                该时间段内暂无分项费用数据
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* 详细数据表格 */}
      <Card>
        <h3 className="font-semibold text-blue-900 mb-4">房间费用明细（{periodLabel}） (Top 10)</h3>
        <div className="text-sm">
          <div className="grid grid-cols-3 divide-x divide-slate-200 border-y border-slate-200">
            <div className="text-center py-3 px-4 font-semibold text-slate-700 bg-slate-50">房间号</div>
            <div className="text-center py-3 px-4 font-semibold text-slate-700 bg-slate-50">费用金额</div>
            <div className="text-center py-3 px-4 font-semibold text-slate-700 bg-slate-50">占比</div>
          </div>
          {departmentStats.map((dept, index) => {
            const percentage = summary.totalAmount > 0
              ? ((dept.amount / summary.totalAmount) * 100).toFixed(1)
              : '0';

            return (
              <div key={index} className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
                <div className="text-center py-3 px-4 font-medium text-blue-900 truncate">{dept.department}</div>
                <div className="text-center py-3 px-4 text-slate-600 truncate">
                  ¥{dept.amount.toLocaleString()}
                </div>
                <div className="text-center py-3 px-4 font-semibold text-blue-600">
                  {percentage}%
                </div>
              </div>
            );
          })}
          {departmentStats.length === 0 && (
            <div className="py-8 text-center text-slate-400 text-sm border-b border-slate-100">
              该时间段内暂无房间费用数据
            </div>
          )}
        </div>
      </Card>

      {/* 分析建议 */}
      <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-amber-100 rounded-lg">
            <CurrencyYenIcon className="w-6 h-6 text-amber-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-amber-900 mb-2">分析建议</h3>
            <ul className="space-y-2 text-sm text-slate-700">
              <li className="flex items-start gap-2">
                <span className="text-amber-500 mt-1">•</span>
                <span>
                  {periodLabel}总费用 <strong className="text-blue-600">¥{summary.totalAmount.toLocaleString()}</strong>，
                  其中电费 <strong className="text-amber-600">¥{summary.electricityTotal.toLocaleString()}</strong>（占比 {summary.totalAmount > 0 ? ((summary.electricityTotal / summary.totalAmount) * 100).toFixed(1) : 0}%），
                  热水费 <strong className="text-red-500">¥{summary.hotWaterTotal.toLocaleString()}</strong>（占比 {summary.totalAmount > 0 ? ((summary.hotWaterTotal / summary.totalAmount) * 100).toFixed(1) : 0}%），
                  冷水费 <strong className="text-blue-500">¥{summary.coldWaterTotal.toLocaleString()}</strong>（占比 {summary.totalAmount > 0 ? ((summary.coldWaterTotal / summary.totalAmount) * 100).toFixed(1) : 0}%）
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-500 mt-1">•</span>
                <span>
                  {summary.electricityTotal >= summary.hotWaterTotal && summary.electricityTotal >= summary.coldWaterTotal
                    ? '电费占比最高，建议加强用电管理，推广节能措施，降低电力成本'
                    : summary.hotWaterTotal >= summary.coldWaterTotal
                    ? '热水费占比最高，建议关注热水使用情况，优化热水供应管理'
                    : '冷水费占比最高，建议关注冷水使用情况，排查是否存在管道泄漏等问题'}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-500 mt-1">•</span>
                <span>
                  {departmentStats.length > 0
                    ? `${departmentStats[0]?.department || '-'}房间费用占比最大，建议重点关注该房间的能源使用情况，优化资源配置`
                    : '建议关注各房间的能源使用情况，优化资源配置'}
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
