import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getFactoryOptions } from '@/lib/factory-config';
import { buildFactoryNameMap } from '@/lib/factory-utils';

export async function GET() {
  try {
    const persons = await (prisma as any).person.findMany({
      where: { status: 'ACTIVE', roomId: { not: null } },
      select: {
        gender: true,
        department: true,
        factory: true,
      },
    });

    const genderDistribution = persons.reduce((acc: any, p: any) => {
      let g = p.gender;
      if (g === 'MALE') g = '男';
      else if (g === 'FEMALE') g = '女';
      else g = '未知';
      
      if (!acc[g]) acc[g] = 0;
      acc[g]++;
      return acc;
    }, {});

    const departmentDistribution = persons.reduce((acc: any, p: any) => {
      const d = p.department || '未知';
      if (!acc[d]) acc[d] = 0;
      acc[d]++;
      return acc;
    }, {});

    const factories = await getFactoryOptions();
    const factoryNameMap = buildFactoryNameMap(factories);

    const factoryDistribution = persons.reduce((acc: any, p: any) => {
      const rawFactory = p.factory ? String(p.factory) : '';
      const f = rawFactory ? (factoryNameMap[rawFactory] || rawFactory) : '未知';

      if (!acc[f]) acc[f] = 0;
      acc[f]++;
      return acc;
    }, {});

    const genderOrder = ['男', '女', '未知'];
    const factoryOrder = [...factories.map((factory) => factory.name), '未知'];

    // 按照指定顺序构建数组，只包含实际有数据的项
    const sortByOrder = (data: Record<string, number>, order: string[]) => {
      const result: { name: string; value: number }[] = [];
      for (const key of order) {
        if (data[key] !== undefined) {
          result.push({ name: key, value: data[key] });
        }
      }
      Object.entries(data)
        .filter(([key]) => !order.includes(key))
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .forEach(([key, value]) => result.push({ name: key, value: value as number }));
      return result;
    };

    return NextResponse.json({
      data: {
        gender: sortByOrder(genderDistribution, genderOrder),
        department: Object.entries(departmentDistribution)
          .map(([name, value]) => ({ name, value: value as number }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 10),
        factory: sortByOrder(factoryDistribution, factoryOrder),
      }
    });
  } catch (error) {
    console.error('Fetch distribution stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch distribution stats' },
      { status: 500 }
    );
  }
}
