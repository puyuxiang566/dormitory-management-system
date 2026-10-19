import PptxGenJS from 'pptxgenjs';

// 颜色常量（不带#，pptxgenjs规范）
const COLORS = {
  primary: '1E3A5F',      // 深蓝
  secondary: '3B82F6',    // 亮蓝
  accent: '0D9488',       // 青绿
  warning: 'F59E0B',      // 琥珀
  danger: 'EF4444',       // 红
  success: '10B981',      // 绿
  dark: '1E293B',         // 深灰
  muted: '64748B',        // 灰
  light: 'F1F5F9',        // 浅灰
  white: 'FFFFFF',
  cardBg: 'F8FAFC',
  chartColors: ['3B82F6', '10B981', 'F59E0B', '8B5CF6', 'EC4899', '06B6D4', 'F97316', '14B8A6', 'A855F7', '64748B'],
  genderMale: '3B82F6',
  genderFemale: 'EC4899',
};

// 工厂专属颜色映射
const FACTORY_COLORS_MAP: Record<string, string> = {
  'IMCN': '10B981',      // 绿
  'IMAW': 'F59E0B',      // 橙
  'IMFT': '8B5CF6',      // 紫
  '职能部门': 'EC4899',  // 粉
};

// 预定义工厂顺序
const FACTORY_ORDER = ['IMCN', 'IMAW', 'IMFT', '职能部门'];

interface BuildingStat {
  id: number;
  name: string;
  totalRooms: number;
  totalBeds: number;
  occupiedBeds: number;
  vacantBeds: number;
  occupancyRate: string;
}

interface TotalStats {
  totalBeds: number;
  occupiedBeds: number;
  vacantBeds: number;
  totalRooms: number;
  occupancyRate: string;
}

interface GenderStat {
  gender: string;
  count: number;
}

interface DepartmentStat {
  department: string;
  count: number;
}

interface TrendDataPoint {
  date: string;
  occupancy: number;
  beds: number;
}

export interface OccupancyReportData {
  buildingStats: BuildingStat[];
  genderStats: GenderStat[];
  departmentStats: DepartmentStat[];
  trendData: TrendDataPoint[];
  totalStats: TotalStats;
  periodLabel: string;
}

export async function exportOccupancyReport(data: OccupancyReportData): Promise<void> {
  const { buildingStats, genderStats, departmentStats, trendData, totalStats, periodLabel } = data;

  const pres = new PptxGenJS();
  pres.layout = 'LAYOUT_16x9';
  pres.author = '宿舍管理系统';
  pres.title = `宿舍入住率统计分析报告 - ${periodLabel}`;

  // ========== 第1页: 封面 ==========
  const coverSlide = pres.addSlide();
  coverSlide.background = { color: COLORS.primary };

  // 左侧装饰条
  coverSlide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.15, h: 5.625,
    fill: { color: COLORS.accent },
  });

  // 标题
  coverSlide.addText('宿舍入住率\n统计分析报告', {
    x: 1, y: 1.2, w: 8, h: 2.2,
    fontSize: 40, fontFace: 'Arial Black',
    color: COLORS.white, bold: true, lineSpacingMultiple: 1.2,
  });

  // 分隔线
  coverSlide.addShape(pres.shapes.RECTANGLE, {
    x: 1, y: 3.5, w: 2.5, h: 0.06,
    fill: { color: COLORS.accent },
  });

  // 时间信息
  coverSlide.addText(`统计周期：${periodLabel}`, {
    x: 1, y: 3.8, w: 5, h: 0.5,
    fontSize: 18, fontFace: 'Arial', color: '94A3B8',
  });

  coverSlide.addText(`生成日期：${new Date().toLocaleDateString('zh-CN')}`, {
    x: 1, y: 4.3, w: 5, h: 0.5,
    fontSize: 14, fontFace: 'Arial', color: '64748B',
  });

  // 右下角核心指标
  coverSlide.addShape(pres.shapes.RECTANGLE, {
    x: 6.5, y: 3.3, w: 3, h: 1.8,
    fill: { color: COLORS.white, transparency: 90 },
    rectRadius: 0.1,
  });
  coverSlide.addText(`${totalStats.occupancyRate}%`, {
    x: 6.5, y: 3.4, w: 3, h: 1,
    fontSize: 36, fontFace: 'Arial', color: COLORS.secondary,
    bold: true, align: 'center', valign: 'middle',
  });
  coverSlide.addText('总体入住率', {
    x: 6.5, y: 4.3, w: 3, h: 0.5,
    fontSize: 14, fontFace: 'Arial', color: COLORS.muted,
    align: 'center',
  });

  // ========== 第2页: 报告摘要 ==========
  const summarySlide = pres.addSlide();
  summarySlide.background = { color: COLORS.white };

  // 页面标题
  addPageHeader(summarySlide, pres, '报告摘要', `基于${periodLabel}数据的入住率统计分析`);

  // 四个指标卡片
  const metrics = [
    { label: '总床位数', value: String(totalStats.totalBeds), color: COLORS.primary, icon: '🛏️' },
    { label: '已入住床位', value: String(totalStats.occupiedBeds), color: COLORS.success, icon: '✅' },
    { label: '空闲床位', value: String(totalStats.vacantBeds), color: COLORS.warning, icon: '📋' },
    { label: '总体入住率', value: `${totalStats.occupancyRate}%`, color: COLORS.secondary, icon: '📊' },
  ];

  const cardW = 2.05;
  const cardH = 1.6;
  const cardGap = 0.2;
  const startX = 0.6;
  const cardY = 1.6;

  metrics.forEach((metric, i) => {
    const x = startX + i * (cardW + cardGap);

    // 卡片背景
    summarySlide.addShape(pres.shapes.RECTANGLE, {
      x, y: cardY, w: cardW, h: cardH,
      fill: { color: COLORS.cardBg },
      shadow: { type: 'outer', color: '000000', blur: 4, offset: 2, angle: 135, opacity: 0.08 },
    });

    // 顶部色条
    summarySlide.addShape(pres.shapes.RECTANGLE, {
      x, y: cardY, w: cardW, h: 0.06,
      fill: { color: metric.color },
    });

    // 标签
    summarySlide.addText(metric.label, {
      x, y: cardY + 0.2, w: cardW, h: 0.4,
      fontSize: 11, fontFace: 'Arial', color: COLORS.muted, align: 'center',
    });

    // 数值
    summarySlide.addText(metric.value, {
      x, y: cardY + 0.6, w: cardW, h: 0.7,
      fontSize: 28, fontFace: 'Arial Black', color: metric.color,
      bold: true, align: 'center', valign: 'middle',
    });
  });

  // 关键指标行
  const kpiY = 3.6;
  const kpiData = [
    { label: '平均入住率', value: `${totalStats.occupancyRate}%`, sub: `${buildingStats.length}栋楼` },
    { label: '总房间数', value: String(totalStats.totalRooms), sub: `入住${totalStats.occupiedBeds}人` },
    { label: '空置率', value: `${(100 - parseFloat(totalStats.occupancyRate)).toFixed(1)}%`, sub: `空余${totalStats.vacantBeds}床` },
  ];

  kpiData.forEach((kpi, i) => {
    const x = 0.6 + i * 3.1;
    summarySlide.addShape(pres.shapes.RECTANGLE, {
      x, y: kpiY, w: 2.9, h: 1.3,
      fill: { color: COLORS.white },
      line: { color: 'E2E8F0', width: 1 },
    });
    summarySlide.addText(kpi.label, {
      x: x + 0.15, y: kpiY + 0.1, w: 2.6, h: 0.35,
      fontSize: 11, fontFace: 'Arial', color: COLORS.muted,
    });
    summarySlide.addText(kpi.value, {
      x: x + 0.15, y: kpiY + 0.45, w: 2.6, h: 0.5,
      fontSize: 22, fontFace: 'Arial', color: COLORS.primary, bold: true,
    });
    summarySlide.addText(kpi.sub, {
      x: x + 0.15, y: kpiY + 0.9, w: 2.6, h: 0.3,
      fontSize: 10, fontFace: 'Arial', color: COLORS.muted,
    });
  });

  // ========== 第3页: 入住率趋势图 ==========
  const trendSlide = pres.addSlide();
  trendSlide.background = { color: COLORS.white };

  addPageHeader(trendSlide, pres, '入住率趋势', `统计周期：${periodLabel}`);

  if (trendData.length > 0) {
    // 取样展示（数据点过多时采样）
    const sampledData = trendData.length > 30
      ? trendData.filter((_, i) => i % Math.ceil(trendData.length / 30) === 0 || i === trendData.length - 1)
      : trendData;

    const chartData = [{
      name: '入住率',
      labels: sampledData.map(d => d.date),
      values: sampledData.map(d => d.occupancy),
    }];

    trendSlide.addChart(pres.charts.LINE, chartData, {
      x: 0.5, y: 1.3, w: 9, h: 3.8,
      showTitle: false,
      lineSize: 2.5,
      lineSmooth: true,
      chartColors: [COLORS.secondary],
      chartArea: { fill: { color: COLORS.white }, roundedCorners: true },
      catAxisLabelColor: COLORS.muted,
      catAxisLabelFontSize: 9,
      valAxisLabelColor: COLORS.muted,
      valAxisLabelFontSize: 9,
      valAxisMinVal: 0,
      valAxisMaxVal: 100,
      valGridLine: { color: 'E2E8F0', size: 0.5 },
      catGridLine: { style: 'none' },
      showValue: false,
      showLegend: false,
    });
  } else {
    trendSlide.addText('该时间段内暂无趋势数据', {
      x: 0.5, y: 2, w: 9, h: 2,
      fontSize: 16, color: COLORS.muted, align: 'center', valign: 'middle',
    });
  }

  // ========== 第4页: 楼栋入住率对比 ==========
  const buildingSlide = pres.addSlide();
  buildingSlide.background = { color: COLORS.white };

  addPageHeader(buildingSlide, pres, '各楼栋入住率对比', `共${buildingStats.length}栋楼`);

  if (buildingStats.length > 0) {
    const barData = [{
      name: '入住率',
      labels: buildingStats.map(b => b.name),
      values: buildingStats.map(b => parseFloat(b.occupancyRate)),
    }];

    buildingSlide.addChart(pres.charts.BAR, barData, {
      x: 0.3, y: 1.3, w: 9.4, h: 3.8,
      barDir: 'bar',
      showTitle: false,
      chartColors: COLORS.chartColors.slice(0, buildingStats.length),
      chartArea: { fill: { color: COLORS.white }, roundedCorners: true },
      catAxisLabelColor: COLORS.dark,
      catAxisLabelFontSize: 10,
      valAxisLabelColor: COLORS.muted,
      valAxisLabelFontSize: 9,
      valAxisMinVal: 0,
      valAxisMaxVal: 100,
      valGridLine: { color: 'E2E8F0', size: 0.5 },
      catGridLine: { style: 'none' },
      showValue: true,
      dataLabelPosition: 'outEnd',
      dataLabelColor: COLORS.dark,
      dataLabelFontSize: 10,
      showLegend: false,
    });
  } else {
    buildingSlide.addText('暂无楼栋数据', {
      x: 0.5, y: 2, w: 9, h: 2,
      fontSize: 16, color: COLORS.muted, align: 'center', valign: 'middle',
    });
  }

  // ========== 第5页: 性别分布 ==========
  const genderSlide = pres.addSlide();
  genderSlide.background = { color: COLORS.white };

  addPageHeader(genderSlide, pres, '入住人员性别分布', `统计周期：${periodLabel}`);

  if (genderStats.length > 0) {
    const pieData = [{
      name: '性别分布',
      labels: genderStats.map(g => g.gender),
      values: genderStats.map(g => g.count),
    }];

    const genderColors = genderStats.map(g =>
      g.gender === '男' ? COLORS.genderMale : COLORS.genderFemale
    );

    genderSlide.addChart(pres.charts.PIE, pieData, {
      x: 0.5, y: 1.3, w: 5, h: 3.8,
      showTitle: false,
      chartColors: genderColors,
      showPercent: true,
      showValue: false,
      showLegend: true,
      legendPos: 'r',
      legendFontSize: 12,
      dataLabelFontSize: 12,
      dataLabelColor: COLORS.white,
    });

    // 右侧统计数字
    const rightX = 6.2;
    genderStats.forEach((g, i) => {
      const y = 1.8 + i * 1.5;
      const color = g.gender === '男' ? COLORS.genderMale : COLORS.genderFemale;

      genderSlide.addShape(pres.shapes.RECTANGLE, {
        x: rightX, y, w: 0.15, h: 1.2,
        fill: { color },
      });

      genderSlide.addText(g.gender, {
        x: rightX + 0.3, y, w: 3, h: 0.4,
        fontSize: 14, fontFace: 'Arial', color: COLORS.dark, bold: true,
      });

      genderSlide.addText(`${g.count} 人`, {
        x: rightX + 0.3, y: y + 0.4, w: 3, h: 0.4,
        fontSize: 20, fontFace: 'Arial', color: color, bold: true,
      });

      const total = genderStats.reduce((s, item) => s + item.count, 0);
      const pct = total > 0 ? ((g.count / total) * 100).toFixed(1) : '0';
      genderSlide.addText(`占比 ${pct}%`, {
        x: rightX + 0.3, y: y + 0.8, w: 3, h: 0.3,
        fontSize: 11, fontFace: 'Arial', color: COLORS.muted,
      });
    });
  } else {
    genderSlide.addText('该时间段内暂无性别分布数据', {
      x: 0.5, y: 2, w: 9, h: 2,
      fontSize: 16, color: COLORS.muted, align: 'center', valign: 'middle',
    });
  }

  // ========== 第6页: 工厂分布 ==========
  const deptSlide = pres.addSlide();
  deptSlide.background = { color: COLORS.white };

  // 按预定义顺序获取工厂统计数据
  const factoryStatsMap: Record<string, number> = {};
  departmentStats.forEach(d => {
    factoryStatsMap[d.department] = (factoryStatsMap[d.department] || 0) + d.count;
  });

  const factoryData = FACTORY_ORDER.map(factory => ({
    factory,
    count: factoryStatsMap[factory] || 0,
  }));

  addPageHeader(deptSlide, pres, '入住人员工厂分布', `统计周期：${periodLabel}`);

  if (factoryData.length > 0 && factoryData.some(d => d.count > 0)) {
    const barData = [{
      name: '人数',
      labels: factoryData.map(d => d.factory),
      values: factoryData.map(d => d.count),
    }];

    deptSlide.addChart(pres.charts.BAR, barData, {
      x: 0.3, y: 1.3, w: 9.4, h: 3.8,
      barDir: 'col',
      showTitle: false,
      chartColors: FACTORY_ORDER.map(f => FACTORY_COLORS_MAP[f]),
      chartArea: { fill: { color: COLORS.white }, roundedCorners: true },
      catAxisLabelColor: COLORS.muted,
      catAxisLabelFontSize: 10,
      valAxisLabelColor: COLORS.muted,
      valAxisLabelFontSize: 9,
      valGridLine: { color: 'E2E8F0', size: 0.5 },
      catGridLine: { style: 'none' },
      showValue: true,
      dataLabelPosition: 'outEnd',
      dataLabelColor: COLORS.dark,
      dataLabelFontSize: 11,
      showLegend: false,
    });
  } else {
    deptSlide.addText('该时间段内暂无工厂分布数据', {
      x: 0.5, y: 2, w: 9, h: 2,
      fontSize: 16, color: COLORS.muted, align: 'center', valign: 'middle',
    });
  }

  // ========== 第7页: 楼栋详情表格 + 分析建议 ==========
  const detailSlide = pres.addSlide();
  detailSlide.background = { color: COLORS.white };

  addPageHeader(detailSlide, pres, '楼栋入住详情与分析建议', '');

  // 表格
  if (buildingStats.length > 0) {
    const headerRow = [
      { text: '楼栋名称', options: { fill: { color: COLORS.primary }, color: COLORS.white, bold: true, fontSize: 9, align: 'center' } },
      { text: '房间数', options: { fill: { color: COLORS.primary }, color: COLORS.white, bold: true, fontSize: 9, align: 'center' } },
      { text: '总床位', options: { fill: { color: COLORS.primary }, color: COLORS.white, bold: true, fontSize: 9, align: 'center' } },
      { text: '已入住', options: { fill: { color: COLORS.primary }, color: COLORS.white, bold: true, fontSize: 9, align: 'center' } },
      { text: '空闲', options: { fill: { color: COLORS.primary }, color: COLORS.white, bold: true, fontSize: 9, align: 'center' } },
      { text: '入住率', options: { fill: { color: COLORS.primary }, color: COLORS.white, bold: true, fontSize: 9, align: 'center' } },
    ];

    const dataRows = buildingStats.map((b, i) => {
      const bgColor = i % 2 === 0 ? COLORS.white : COLORS.light;
      const rate = parseFloat(b.occupancyRate);
      const rateColor = rate >= 90 ? COLORS.success : rate >= 70 ? COLORS.secondary : COLORS.danger;
      return [
        { text: b.name, options: { fill: { color: bgColor }, fontSize: 8, bold: true, color: COLORS.dark } },
        { text: String(b.totalRooms), options: { fill: { color: bgColor }, fontSize: 8, align: 'center', color: COLORS.muted } },
        { text: String(b.totalBeds), options: { fill: { color: bgColor }, fontSize: 8, align: 'center', color: COLORS.muted } },
        { text: String(b.occupiedBeds), options: { fill: { color: bgColor }, fontSize: 8, align: 'center', color: COLORS.success, bold: true } },
        { text: String(b.vacantBeds), options: { fill: { color: bgColor }, fontSize: 8, align: 'center', color: COLORS.warning } },
        { text: `${b.occupancyRate}%`, options: { fill: { color: bgColor }, fontSize: 8, align: 'center', color: rateColor, bold: true } },
      ];
    });

    const tableRows = [headerRow, ...dataRows];
    const tableH = Math.min(0.3 * (buildingStats.length + 1), 2.8);

    detailSlide.addTable(tableRows, {
      x: 0.5, y: 1.3, w: 9,
      border: { pt: 0.5, color: 'E2E8F0' },
      colW: [2.2, 1.1, 1.1, 1.2, 1.1, 1.2],
      h: tableH,
      autoPage: false,
    });
  }

  // 分析建议
  const suggestY = buildingStats.length > 0 ? Math.min(1.3 + 0.3 * (buildingStats.length + 1) + 0.3, 4.0) : 1.5;

  detailSlide.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: suggestY, w: 9, h: 1.3,
    fill: { color: 'FFFBEB' },
    line: { color: 'FDE68A', width: 1 },
  });

  const occupancyRate = parseFloat(totalStats.occupancyRate);
  let suggestion = '';
  if (occupancyRate >= 90) {
    suggestion = `${periodLabel}总体入住率为 ${totalStats.occupancyRate}%，入住率较高，建议关注空置房间是否需要维修或重新分配`;
  } else if (occupancyRate >= 70) {
    suggestion = `${periodLabel}总体入住率为 ${totalStats.occupancyRate}%，入住率适中，可继续优化资源配置`;
  } else {
    suggestion = `${periodLabel}总体入住率为 ${totalStats.occupancyRate}%，入住率偏低，建议调查原因并制定提升策略`;
  }

  const suggestItems = [
    { text: suggestion, options: { bullet: true, breakLine: true, fontSize: 9, color: COLORS.dark } },
    { text: `当前空闲床位 ${totalStats.vacantBeds} 个，建议定期检查空置房间状况，确保随时可供入住`, options: { bullet: true, breakLine: true, fontSize: 9, color: COLORS.dark } },
    { text: '建议关注入住率较低的楼栋，分析原因并采取相应措施', options: { bullet: true, fontSize: 9, color: COLORS.dark } },
  ];

  detailSlide.addText([
    { text: '分析建议', options: { bold: true, fontSize: 11, color: '92400E', breakLine: true } },
    ...suggestItems,
  ], {
    x: 0.7, y: suggestY + 0.1, w: 8.6, h: 1.1,
    paraSpaceAfter: 4,
  });

  // ========== 导出文件 ==========
  const dateStr = new Date().toISOString().split('T')[0];
  const fileName = `宿舍入住率统计报告_${periodLabel}_${dateStr}.pptx`;

  await pres.writeFile({ fileName });
}

// 添加页面标题（统一风格）
function addPageHeader(slide: PptxGenJS.Slide, pres: PptxGenJS, title: string, subtitle: string) {
  // 顶部色条
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 10, h: 0.06,
    fill: { color: COLORS.secondary },
  });

  // 标题
  slide.addText(title, {
    x: 0.5, y: 0.3, w: 7, h: 0.5,
    fontSize: 22, fontFace: 'Arial', color: COLORS.primary, bold: true,
  });

  // 副标题
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.5, y: 0.8, w: 7, h: 0.35,
      fontSize: 11, fontFace: 'Arial', color: COLORS.muted,
    });
  }
}
