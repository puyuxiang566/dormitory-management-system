import PptxGenJS from 'pptxgenjs';

// 颜色常量（不带#，pptxgenjs规范）- 深蓝/青色调
const COLORS = {
  primary: '1E3A5F',       // 深蓝
  secondary: '3B82F6',     // 蓝色
  accent: '2563EB',        // 亮蓝
  danger: 'EF4444',        // 红
  warning: 'F59E0B',       // 琥珀
  success: '10B981',       // 绿
  dark: '1E293B',          // 深灰
  muted: '64748B',         // 灰
  light: 'F1F5F9',         // 浅灰
  white: 'FFFFFF',
  cardBg: 'F8FAFC',
  chartColors: ['10B981', 'EF4444', '3B82F6', '8B5CF6', 'EC4899', '06B6D4', 'F59E0B', '14B8A6', 'A855F7', '64748B'],
  checkIn: '10B981',       // 入住-绿
  checkOut: 'EF4444',      // 退宿-红
  netIncrease: '10B981',   // 净增-绿
  netDecrease: 'EF4444',   // 净减-红
  deptCheckIn: '3B82F6',   // 部门入住-蓝
  deptCheckOut: 'F97316',  // 部门退宿-橙
  factoryIMCN: '10B981',
  factoryIMAW: 'F59E0B',
  factoryIMFT: '8B5CF6',
  factoryAdmin: 'EC4899',
  factoryUnknown: '94A3B8',
};

interface FlowData {
  date: string;
  checkIns: number;
  checkOuts: number;
  netChange: number;
}

interface PieData {
  name: string;
  value: number;
}

interface DeptData {
  department: string;
  checkIns: number;
  checkOuts: number;
}

interface FactoryDetailData {
  factory: string;
  checkIns: number;
  checkOuts: number;
}

interface SummaryStats {
  totalCheckIns: number;
  totalCheckOuts: number;
  netChange: number;
  avgDailyCheckIns: number;
  avgDailyCheckOuts: number;
}

export interface PersonnelFlowReportData {
  flowData: FlowData[];
  checkInByFactory: PieData[];
  checkOutByFactory: PieData[];
  checkInByDepartment: DeptData[];
  checkInByFactoryDetail: FactoryDetailData[];
  summaryStats: SummaryStats;
  periodLabel: string;
}

export async function exportPersonnelFlowReport(data: PersonnelFlowReportData): Promise<void> {
  const { flowData, checkInByFactory, checkOutByFactory, checkInByDepartment, checkInByFactoryDetail, summaryStats, periodLabel } = data;

  const pres = new PptxGenJS();
  pres.layout = 'LAYOUT_16x9';
  pres.author = '宿舍管理系统';
  pres.title = `人员流动统计分析报告 - ${periodLabel}`;

  // ========== 第1页: 封面 ==========
  const coverSlide = pres.addSlide();
  coverSlide.background = { color: COLORS.primary };

  // 左侧装饰条
  coverSlide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.15, h: 5.625,
    fill: { color: COLORS.accent },
  });

  // 标题
  coverSlide.addText('人员入住退宿\n统计分析报告', {
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

  const netSign = summaryStats.netChange >= 0 ? '+' : '';
  coverSlide.addText(`${netSign}${summaryStats.netChange}`, {
    x: 6.5, y: 3.4, w: 3, h: 1,
    fontSize: 36, fontFace: 'Arial', color: COLORS.secondary,
    bold: true, align: 'center', valign: 'middle',
  });
  coverSlide.addText('净增人数', {
    x: 6.5, y: 4.3, w: 3, h: 0.5,
    fontSize: 14, fontFace: 'Arial', color: COLORS.muted,
    align: 'center',
  });

  // ========== 第2页: 报告摘要 ==========
  const summarySlide = pres.addSlide();
  summarySlide.background = { color: COLORS.white };

  addPageHeader(summarySlide, pres, '报告摘要', `基于${periodLabel}数据的人员变动统计分析`);

  // 四个指标卡片
  const metrics = [
    { label: '新入住人数', value: String(summaryStats.totalCheckIns), color: COLORS.checkIn },
    { label: '退宿人数', value: String(summaryStats.totalCheckOuts), color: COLORS.checkOut },
    { label: '净增人数', value: `${netSign}${summaryStats.netChange}`, color: summaryStats.netChange >= 0 ? '3B82F6' : COLORS.danger },
    { label: '日均入住', value: String(summaryStats.avgDailyCheckIns), color: '8B5CF6' },
  ];

  const cardW = 2.05;
  const cardH = 1.6;
  const cardGap = 0.2;
  const startX = 0.6;
  const cardY = 1.6;

  metrics.forEach((metric, i) => {
    const x = startX + i * (cardW + cardGap);

    summarySlide.addShape(pres.shapes.RECTANGLE, {
      x, y: cardY, w: cardW, h: cardH,
      fill: { color: COLORS.cardBg },
      shadow: { type: 'outer', color: '000000', blur: 4, offset: 2, angle: 135, opacity: 0.08 },
    });

    summarySlide.addShape(pres.shapes.RECTANGLE, {
      x, y: cardY, w: cardW, h: 0.06,
      fill: { color: metric.color },
    });

    summarySlide.addText(metric.label, {
      x, y: cardY + 0.2, w: cardW, h: 0.4,
      fontSize: 11, fontFace: 'Arial', color: COLORS.muted, align: 'center',
    });

    summarySlide.addText(metric.value, {
      x, y: cardY + 0.6, w: cardW, h: 0.7,
      fontSize: 28, fontFace: 'Arial Black', color: metric.color,
      bold: true, align: 'center', valign: 'middle',
    });
  });

  // 关键指标行
  const kpiY = 3.6;
  const kpiData = [
    { label: '入住率趋势', value: `${summaryStats.totalCheckIns}人`, sub: `日均${summaryStats.avgDailyCheckIns}人` },
    { label: '退宿率趋势', value: `${summaryStats.totalCheckOuts}人`, sub: `日均${summaryStats.avgDailyCheckOuts}人` },
    { label: '净变动方向', value: summaryStats.netChange >= 0 ? '人员增长' : '人员减少', sub: `${netSign}${summaryStats.netChange}人` },
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

  // ========== 第3页: 入住退宿趋势 ==========
  const trendSlide = pres.addSlide();
  trendSlide.background = { color: COLORS.white };

  addPageHeader(trendSlide, pres, '入住退宿趋势', `统计周期：${periodLabel}`);

  if (flowData.length > 0) {
    const sampledData = flowData.length > 30
      ? flowData.filter((_, i) => i % Math.ceil(flowData.length / 30) === 0 || i === flowData.length - 1)
      : flowData;

    const chartData = [
      {
        name: '入住',
        labels: sampledData.map(d => d.date),
        values: sampledData.map(d => d.checkIns),
      },
      {
        name: '退宿',
        labels: sampledData.map(d => d.date),
        values: sampledData.map(d => d.checkOuts),
      },
    ];

    trendSlide.addChart(pres.charts.LINE, chartData, {
      x: 0.5, y: 1.3, w: 9, h: 3.8,
      showTitle: false,
      lineSize: 2.5,
      lineSmooth: true,
      chartColors: [COLORS.checkIn, COLORS.checkOut],
      chartArea: { fill: { color: COLORS.white }, roundedCorners: true },
      catAxisLabelColor: COLORS.muted,
      catAxisLabelFontSize: 9,
      valAxisLabelColor: COLORS.muted,
      valAxisLabelFontSize: 9,
      valGridLine: { color: 'E2E8F0', size: 0.5 },
      catGridLine: { style: 'none' },
      showValue: false,
      showLegend: true,
      legendPos: 't',
      legendFontSize: 11,
    });
  } else {
    trendSlide.addText('该时间段内暂无趋势数据', {
      x: 0.5, y: 2, w: 9, h: 2,
      fontSize: 16, color: COLORS.muted, align: 'center', valign: 'middle',
    });
  }

  // ========== 第4页: 净增趋势 ==========
  const netSlide = pres.addSlide();
  netSlide.background = { color: COLORS.white };

  addPageHeader(netSlide, pres, '人员净增趋势', `统计周期：${periodLabel}`);

  if (flowData.length > 0) {
    const sampledData = flowData.length > 30
      ? flowData.filter((_, i) => i % Math.ceil(flowData.length / 30) === 0 || i === flowData.length - 1)
      : flowData;

    const barData = [{
      name: '净增人数',
      labels: sampledData.map(d => d.date),
      values: sampledData.map(d => d.netChange),
    }];

    netSlide.addChart(pres.charts.BAR, barData, {
      x: 0.5, y: 1.3, w: 9, h: 3.8,
      barDir: 'col',
      showTitle: false,
      chartColors: [COLORS.netIncrease],
      invertedColors: [COLORS.netDecrease],
      chartArea: { fill: { color: COLORS.white }, roundedCorners: true },
      catAxisLabelColor: COLORS.muted,
      catAxisLabelFontSize: 9,
      valAxisLabelColor: COLORS.muted,
      valAxisLabelFontSize: 9,
      valGridLine: { color: 'E2E8F0', size: 0.5 },
      catGridLine: { style: 'none' },
      showValue: true,
      dataLabelPosition: 'outEnd',
      dataLabelColor: COLORS.dark,
      dataLabelFontSize: 9,
      showLegend: true,
      legendPos: 't',
      legendFontSize: 11,
    });
  } else {
    netSlide.addText('该时间段内暂无净增趋势数据', {
      x: 0.5, y: 2, w: 9, h: 2,
      fontSize: 16, color: COLORS.muted, align: 'center', valign: 'middle',
    });
  }

  // ========== 第5页: 工厂分布饼图 ==========
  const factorySlide = pres.addSlide();
  factorySlide.background = { color: COLORS.white };

  addPageHeader(factorySlide, pres, '入住/退宿人员工厂分布', `统计周期：${periodLabel}`);

  const factoryColorMap: Record<string, string> = {
    'IMCN': COLORS.factoryIMCN,
    'imcn': COLORS.factoryIMCN,
    'IMAW': COLORS.factoryIMAW,
    'imaw': COLORS.factoryIMAW,
    'IMFT': COLORS.factoryIMFT,
    'imft': COLORS.factoryIMFT,
    '职能部门': COLORS.factoryAdmin,
    '未知': COLORS.factoryUnknown,
  };

  // 入住工厂分布饼图（左侧）
  if (checkInByFactory.length > 0) {
    const checkInPieData = [{
      name: '入住',
      labels: checkInByFactory.map(d => d.name),
      values: checkInByFactory.map(d => d.value),
    }];
    const checkInColors = checkInByFactory.map((d, i) => factoryColorMap[d.name] || COLORS.chartColors[i % COLORS.chartColors.length]);

    factorySlide.addChart(pres.charts.PIE, checkInPieData, {
      x: 0.2, y: 1.3, w: 4.5, h: 3.8,
      showTitle: true,
      title: '新入住人员工厂分布',
      titleFontSize: 13,
      titleColor: COLORS.dark,
      chartColors: checkInColors,
      showPercent: true,
      showValue: false,
      showLegend: true,
      legendPos: 'b',
      legendFontSize: 10,
      dataLabelFontSize: 11,
      dataLabelColor: COLORS.white,
    });
  }

  // 右侧：各工厂新入住人员数据
  if (checkInByFactoryDetail.length > 0) {
    const sortedFactories = [...checkInByFactoryDetail]
      .sort((a, b) => b.checkIns - a.checkIns)
      .filter(d => d.checkIns > 0);

    // 标题
    factorySlide.addText('各工厂新入住人员', {
      x: 5.0, y: 1.3, w: 4.8, h: 0.4,
      fontSize: 13, fontFace: 'Arial', color: COLORS.dark, bold: true,
    });

    // 表头
    factorySlide.addText([
      { text: '工厂', options: { bold: true, fontSize: 9, color: COLORS.muted } },
    ], {
      x: 5.1, y: 1.75, w: 2.5, h: 0.3,
    });
    factorySlide.addText([
      { text: '入住', options: { bold: true, fontSize: 9, color: COLORS.muted } },
    ], {
      x: 7.6, y: 1.75, w: 1.0, h: 0.3, align: 'right',
    });
    factorySlide.addText([
      { text: '占比', options: { bold: true, fontSize: 9, color: COLORS.muted } },
    ], {
      x: 8.6, y: 1.75, w: 1.0, h: 0.3, align: 'right',
    });

    const totalCheckIns = sortedFactories.reduce((sum, d) => sum + d.checkIns, 0);

    sortedFactories.forEach((item, i) => {
      const rowY = 2.1 + i * 0.3;
      const bgColor = i % 2 === 0 ? COLORS.white : COLORS.light;
      const factoryColor = factoryColorMap[item.factory] || COLORS.muted;

      // 行背景
      factorySlide.addShape(pres.shapes.RECTANGLE, {
        x: 5.0, y: rowY, w: 4.8, h: 0.28,
        fill: { color: bgColor },
      });

      // 工厂颜色标识 + 工厂名
      factorySlide.addShape(pres.shapes.RECTANGLE, {
        x: 5.1, y: rowY + 0.07, w: 0.15, h: 0.15,
        fill: { color: factoryColor },
      });
      const formatFactoryNameLocal = (f: string): string => {
        const m: Record<string, string> = { 'imcn': 'IMCN', 'IMCN': 'IMCN', 'imaw': 'IMAW', 'IMAW': 'IMAW', 'imft': 'IMFT', 'IMFT': 'IMFT', '职能部门': '职能部门', '未知': '未知' };
        return m[f] || f;
      };
      factorySlide.addText(formatFactoryNameLocal(item.factory), {
        x: 5.35, y: rowY, w: 2.3, h: 0.28,
        fontSize: 9, fontFace: 'Arial', color: COLORS.dark, bold: true, valign: 'middle',
      });

      // 入住人数
      factorySlide.addText(String(item.checkIns), {
        x: 7.6, y: rowY, w: 1.0, h: 0.28,
        fontSize: 9, fontFace: 'Arial', color: factoryColor, bold: true, align: 'right', valign: 'middle',
      });

      // 占比
      const percent = totalCheckIns > 0 ? ((item.checkIns / totalCheckIns) * 100).toFixed(1) : '0';
      factorySlide.addText(`${percent}%`, {
        x: 8.6, y: rowY, w: 1.0, h: 0.28,
        fontSize: 9, fontFace: 'Arial', color: COLORS.muted, align: 'right', valign: 'middle',
      });
    });

    // 合计行
    if (sortedFactories.length > 0) {
      const totalY = 2.1 + sortedFactories.length * 0.3 + 0.05;
      factorySlide.addShape(pres.shapes.RECTANGLE, {
        x: 5.0, y: totalY, w: 4.8, h: 0.02,
        fill: { color: 'E2E8F0' },
      });
      factorySlide.addText('合计', {
        x: 5.1, y: totalY + 0.05, w: 2.5, h: 0.28,
        fontSize: 9, fontFace: 'Arial', color: COLORS.dark, bold: true, valign: 'middle',
      });
      factorySlide.addText(String(totalCheckIns), {
        x: 7.6, y: totalY + 0.05, w: 1.0, h: 0.28,
        fontSize: 9, fontFace: 'Arial', color: COLORS.dark, bold: true, align: 'right', valign: 'middle',
      });
      factorySlide.addText('100%', {
        x: 8.6, y: totalY + 0.05, w: 1.0, h: 0.28,
        fontSize: 9, fontFace: 'Arial', color: COLORS.muted, align: 'right', valign: 'middle',
      });
    }
  }

  if (checkInByFactory.length === 0 && checkInByFactoryDetail.length === 0) {
    factorySlide.addText('该时间段内暂无工厂分布数据', {
      x: 0.5, y: 2, w: 9, h: 2,
      fontSize: 16, color: COLORS.muted, align: 'center', valign: 'middle',
    });
  }

  // ========== 第6页: 工厂对比 ==========
  const factoryCompareSlide = pres.addSlide();
  factoryCompareSlide.background = { color: COLORS.white };

  // 工厂名格式化
  const formatFactoryName = (factory: string): string => {
    const nameMap: Record<string, string> = {
      'imcn': 'IMCN', 'IMCN': 'IMCN',
      'imaw': 'IMAW', 'IMAW': 'IMAW',
      'imft': 'IMFT', 'IMFT': 'IMFT',
      '职能部门': '职能部门',
      '未知': '未知',
    };
    return nameMap[factory] || factory;
  };

  addPageHeader(factoryCompareSlide, pres, '工厂入住退宿对比', `共${checkInByFactoryDetail.length}个工厂`);

  if (checkInByFactoryDetail.length > 0) {
    const sortedFactories = [...checkInByFactoryDetail]
      .sort((a, b) => (b.checkIns + b.checkOuts) - (a.checkIns + a.checkOuts));

    const factoryNames = sortedFactories.map(d => formatFactoryName(d.factory));
    const factoryColors = sortedFactories.map((d, i) => factoryColorMap[d.factory] || COLORS.chartColors[i % COLORS.chartColors.length]);

    // 左侧：新入住人员（单系列，每个工厂用工厂色）
    const checkInBarData = [{
      name: '新入住',
      labels: factoryNames,
      values: sortedFactories.map(d => d.checkIns),
    }];

    factoryCompareSlide.addChart(pres.charts.BAR, checkInBarData, {
      x: 0.2, y: 1.3, w: 4.7, h: 3.5,
      barDir: 'bar',
      showTitle: true,
      title: '新入住人员',
      titleFontSize: 13,
      titleColor: COLORS.dark,
      chartColors: factoryColors,
      chartArea: { fill: { color: COLORS.white }, roundedCorners: true },
      catAxisLabelColor: COLORS.dark,
      catAxisLabelFontSize: 11,
      valAxisLabelColor: COLORS.muted,
      valAxisLabelFontSize: 9,
      valGridLine: { color: 'E2E8F0', size: 0.5 },
      catGridLine: { style: 'none' },
      showValue: true,
      dataLabelPosition: 'outEnd',
      dataLabelColor: COLORS.dark,
      dataLabelFontSize: 10,
      showLegend: false,
    });

    // 右侧：退宿人员（单系列，每个工厂用工厂色半透明）
    const checkOutBarData = [{
      name: '退宿',
      labels: factoryNames,
      values: sortedFactories.map(d => d.checkOuts),
    }];

    factoryCompareSlide.addChart(pres.charts.BAR, checkOutBarData, {
      x: 5.1, y: 1.3, w: 4.7, h: 3.5,
      barDir: 'bar',
      showTitle: true,
      title: '退宿人员',
      titleFontSize: 13,
      titleColor: COLORS.dark,
      chartColors: factoryColors,
      chartArea: { fill: { color: COLORS.white }, roundedCorners: true },
      catAxisLabelColor: COLORS.dark,
      catAxisLabelFontSize: 11,
      valAxisLabelColor: COLORS.muted,
      valAxisLabelFontSize: 9,
      valGridLine: { color: 'E2E8F0', size: 0.5 },
      catGridLine: { style: 'none' },
      showValue: true,
      dataLabelPosition: 'outEnd',
      dataLabelColor: COLORS.dark,
      dataLabelFontSize: 10,
      showLegend: false,
    });

    // 底部工厂颜色图例
    const legendY = 5.0;
    const legendStartX = 0.5;
    const legendColW = 2.2;
    sortedFactories.forEach((d, i) => {
      const x = legendStartX + i * legendColW;
      const color = factoryColorMap[d.factory] || COLORS.chartColors[i % COLORS.chartColors.length];
      
      factoryCompareSlide.addShape(pres.shapes.RECTANGLE, {
        x, y: legendY, w: 0.2, h: 0.2,
        fill: { color },
      });
      factoryCompareSlide.addText(formatFactoryName(d.factory), {
        x: x + 0.28, y: legendY, w: 1.5, h: 0.2,
        fontSize: 10, fontFace: 'Arial', color: COLORS.dark, valign: 'middle',
      });
    });
  } else {
    factoryCompareSlide.addText('该时间段内暂无工厂对比数据', {
      x: 0.5, y: 2, w: 9, h: 2,
      fontSize: 16, color: COLORS.muted, align: 'center', valign: 'middle',
    });
  }

  // ========== 第7页: 工厂变动明细 + 分析建议 ==========
  const detailSlide = pres.addSlide();
  detailSlide.background = { color: COLORS.white };

  addPageHeader(detailSlide, pres, '工厂变动明细与分析建议', '');

  // 表格
  if (checkInByFactoryDetail.length > 0) {
    const headerRow = [
      { text: '工厂', options: { fill: { color: COLORS.primary }, color: COLORS.white, bold: true, fontSize: 9, align: 'center' } },
      { text: '新入住', options: { fill: { color: COLORS.primary }, color: COLORS.white, bold: true, fontSize: 9, align: 'center' } },
      { text: '退宿', options: { fill: { color: COLORS.primary }, color: COLORS.white, bold: true, fontSize: 9, align: 'center' } },
      { text: '净增', options: { fill: { color: COLORS.primary }, color: COLORS.white, bold: true, fontSize: 9, align: 'center' } },
      { text: '变动率', options: { fill: { color: COLORS.primary }, color: COLORS.white, bold: true, fontSize: 9, align: 'center' } },
    ];

    const sortedFactories = [...checkInByFactoryDetail]
      .sort((a, b) => (b.checkIns + b.checkOuts) - (a.checkIns + a.checkOuts));

    const dataRows = sortedFactories.map((d, i) => {
      const bgColor = i % 2 === 0 ? COLORS.white : COLORS.light;
      const net = d.checkIns - d.checkOuts;
      const rate = d.checkIns > 0 ? ((net / d.checkIns) * 100).toFixed(1) : '0';
      const netColor = net >= 0 ? COLORS.checkIn : COLORS.checkOut;
      const factoryColor = factoryColorMap[d.factory] || COLORS.muted;
      return [
        { text: formatFactoryName(d.factory), options: { fill: { color: bgColor }, fontSize: 9, bold: true, color: factoryColor } },
        { text: String(d.checkIns), options: { fill: { color: bgColor }, fontSize: 9, align: 'center', color: COLORS.checkIn, bold: true } },
        { text: String(d.checkOuts), options: { fill: { color: bgColor }, fontSize: 9, align: 'center', color: COLORS.checkOut, bold: true } },
        { text: `${net >= 0 ? '+' : ''}${net}`, options: { fill: { color: bgColor }, fontSize: 9, align: 'center', color: netColor, bold: true } },
        { text: `${rate}%`, options: { fill: { color: bgColor }, fontSize: 9, align: 'center', color: COLORS.muted } },
      ];
    });

    const tableRows = [headerRow, ...dataRows];
    const tableH = Math.min(0.35 * (sortedFactories.length + 1), 2.8);

    detailSlide.addTable(tableRows, {
      x: 0.5, y: 1.3, w: 9,
      border: { pt: 0.5, color: 'E2E8F0' },
      colW: [2.5, 1.5, 1.5, 1.5, 1.5],
      h: tableH,
      autoPage: false,
    });
  }

  // 分析建议
  const suggestY = checkInByFactoryDetail.length > 0
    ? Math.min(1.3 + 0.35 * (checkInByFactoryDetail.length + 1) + 0.3, 4.0)
    : 1.5;

  detailSlide.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: suggestY, w: 9, h: 1.3,
    fill: { color: 'FFFBEB' },
    line: { color: 'FDE68A', width: 1 },
  });

  const trendWord = summaryStats.netChange >= 0 ? '人员增长' : '人员流失';
  const suggestItems = [
    { text: `${periodLabel}新入住 ${summaryStats.totalCheckIns} 人，退宿 ${summaryStats.totalCheckOuts} 人，净增 ${netSign}${summaryStats.netChange} 人，${summaryStats.netChange >= 0 ? '宿舍资源压力增加，需关注床位供给' : '人员流失，建议分析原因'}`, options: { bullet: true, breakLine: true, fontSize: 9, color: COLORS.dark } },
    { text: `日均入住 ${summaryStats.avgDailyCheckIns} 人，建议优化入住流程，提高办理效率`, options: { bullet: true, breakLine: true, fontSize: 9, color: COLORS.dark } },
    { text: '建议关注退宿率较高的工厂，了解员工流动原因，制定留人策略', options: { bullet: true, fontSize: 9, color: COLORS.dark } },
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
  const fileName = `人员流动统计报告_${periodLabel}_${dateStr}.pptx`;

  await pres.writeFile({ fileName });
}

// 添加页面标题（统一风格）
function addPageHeader(slide: PptxGenJS.Slide, pres: PptxGenJS, title: string, subtitle: string) {
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 10, h: 0.06,
    fill: { color: COLORS.secondary },
  });

  slide.addText(title, {
    x: 0.5, y: 0.3, w: 7, h: 0.5,
    fontSize: 22, fontFace: 'Arial', color: COLORS.primary, bold: true,
  });

  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.5, y: 0.8, w: 7, h: 0.35,
      fontSize: 11, fontFace: 'Arial', color: COLORS.muted,
    });
  }
}
