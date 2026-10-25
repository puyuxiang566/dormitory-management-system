'use client';

import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useFactories } from '@/hooks/useFactories';

interface DistributionData {
  factory: string;
  count: number;
  rate: number;
}

interface DepartmentData {
  factory: string;
  department: string;
  count: number;
  rate: number;
}

interface DistributionChartProps {
  factoryDistribution: DistributionData[];
  departmentDistribution: DepartmentData[];
}

export default function DistributionChart({
  factoryDistribution,
  departmentDistribution,
}: DistributionChartProps) {
  const { nameOf, colorOf } = useFactories();

  // 为工厂分布准备饼图数据
  const pieData = factoryDistribution.map((item) => ({
    name: nameOf(item.factory),
    value: item.count,
  }));

  // 为部门分布准备数据：显示"工厂-部门"，并携带工厂颜色
  const barData = departmentDistribution.map((item) => ({
    label: `${nameOf(item.factory)}-${item.department}`,
    department: item.department,
    factory: nameOf(item.factory),
    count: item.count,
    fill: colorOf(item.factory),
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 工厂分布饼图 */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">工厂分布</h3>
        {pieData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => {
                  const total = pieData.reduce((sum, item) => sum + item.value, 0);
                  const percent = ((value / total) * 100).toFixed(1);
                  return `${name}: ${percent}%`;
                }}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colorOf(entry.name)} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-slate-400">暂无数据</div>
        )}
      </div>

      {/* 部门分布柱状图 */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">部门分布 (Top 10)</h3>
        {barData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="label" type="category" width={140} fontSize={12} />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" name="违规次数">
                {barData.map((entry, index) => (
                  <Cell key={`bar-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-slate-400">暂无数据</div>
        )}
      </div>
    </div>
  );
}
