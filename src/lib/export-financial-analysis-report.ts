import PptxGenJS from 'pptxgenjs';

// 颜色常量（不带#，pptxgenjs规范）- 琥珀/金色调
const COLORS = {
  primary: '78350F',       // 深琥珀
  secondary: 'F59E0B',     // 琥珀
  accent: 'D97706',        // 深金
  danger: 'EF4444',        // 红
  warning: 'F59E0B',       // 琥珀
  success: '10B981',       // 绿
  dark: '1E293B',          // 深灰
  muted: '64748B',         // 灰
  light: 'F1F5F9',         // 浅灰
  white: 'FFFFFF',
  cardBg: 'F8FAFC',
  chartColors: ['F59E0B', 'EF4444', '3B82F6', '8B5CF6', '10B981', '06B6D4', 'EC4899', '14B8A6', 'A855F7', '64748B'],
  electricity: 'F59E0B',   // 电费-琥珀
  hotWater: 'EF4444',      // 热水费-红
  coldWater: '3B82F6',     // 冷水费-蓝
  totalAmount: '8B5CF6',   // 总费用-紫
};

interface FinancialSummary {
  totalAmount: number;
  electricityTotal: number;
  hotWaterTotal: number;
  coldWaterTotal: number;
}

interface MonthlyStat {
  month: string;
  coldWater: number;
  hotWater: number;
  electricity: number;
  amount: number;
}

interface DeptStat {
  department: string;
  amount: number;
}

interface BillTypeStat {
  type: string;
  amount: number;
  percentage: number;
}

export interface FinancialReportData {
  summary: FinancialSummary;
  monthlyStats: MonthlyStat[];
  departmentStats: DeptStat[];
  billTypeStats: BillTypeStat[];
  periodLabel: string;
}

export async function exportFinancialAnalysisReport(data: FinancialReportData): Promise<void> {
  // 防御性处理：确保所有数值字段都有默认值，避免 toLocaleString() 等方法在 undefined 上调用
  const summary = {
    totalAmount: data.summary?.totalAmount || 0,
    electricityTotal: data.summary?.electricityTotal || 0,
    hotWaterTotal: data.summary?.hotWaterTotal || 0,
    coldWaterTotal: data.summary?.coldWaterTotal || 0,
  };
  const monthlyStats = (data.monthlyStats || []).map((m: any) => ({
    month: m.month || '',
    coldWater: m.coldWater || 0,
    hotWater: m.hotWater || 0,
    electricity: m.electricity || 0,
    amount: m.amount || 0,
  }));
  const departmentStats = (data.departmentStats || []).map((d: any) => ({
    department: d.department || '未分配',
    amount: d.amount || 0,
  }));
  const billTypeStats = (data.billTypeStats || []).map((b: any) => ({
    type: b.type || '',
    amount: b.amount || 0,
    percentage: b.percentage || 0,
  }));
  const periodLabel = data.periodLabel || '本月';

  const pres = new PptxGenJS();
  pres.layout = 'LAYOUT_16x9';
  pres.author = '宿舍管理系统';
  pres.title = `能源费用统计分析报告 - ${periodLabel}`;

  // ========== 第1页: 封面 ==========
  const coverSlide = pres.addSlide();
  coverSlide.background = { color: COLORS.primary };

  // 左侧装饰条
  coverSlide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.15, h: 5.625,
    fill: { color: COLORS.accent },
  });

  // 标题
  coverSlide.addText('能源费用结算\n报表分析', {
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

  coverSlide.addText(`¥${summary.totalAmount.toLocaleString()}`, {
    x: 6.5, y: 3.4, w: 3, h: 1,
    fontSize: 30, fontFace: 'Arial', color: COLORS.secondary,
    bold: true, align: 'center', valign: 'middle',
  });
  coverSlide.addText('总费用', {
    x: 6.5, y: 4.3, w: 3, h: 0.5,
    fontSize: 14, fontFace: 'Arial', color: COLORS.muted,
    align: 'center',
  });

  // ========== 第2页: 报告摘要 ==========
  const summarySlide = pres.addSlide();
  summarySlide.background = { color: COLORS.white };

  addPageHeader(summarySlide, pres, '报告摘要', `基于${periodLabel}数据的能源费用结算分析`);

  // 四个费用指标卡片
  const metrics = [
    { label: '总费用', value: `¥${summary.totalAmount.toLocaleString()}`, color: COLORS.primary },
    { label: '电费', value: `¥${summary.electricityTotal.toLocaleString()}`, color: COLORS.electricity },
    { label: '热水费', value: `¥${summary.hotWaterTotal.toLocaleString()}`, color: COLORS.hotWater },
    { label: '冷水费', value: `¥${summary.coldWaterTotal.toLocaleString()}`, color: COLORS.coldWater },
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
      fontSize: 22, fontFace: 'Arial Black', color: metric.color,
      bold: true, align: 'center', valign: 'middle',
    });
  });

  // 关键指标行
  const kpiY = 3.6;
  const elecPct = summary.totalAmount > 0 ? ((summary.electricityTotal / summary.totalAmount) * 100).toFixed(1) : '0';
  const hotPct = summary.totalAmount > 0 ? ((summary.hotWaterTotal / summary.totalAmount) * 100).toFixed(1) : '0';
  const coldPct = summary.totalAmount > 0 ? ((summary.coldWaterTotal / summary.totalAmount) * 100).toFixed(1) : '0';

  const kpiData = [
    { label: '电费占比', value: `${elecPct}%`, sub: `¥${summary.electricityTotal.toLocaleString()}` },
    { label: '热水费占比', value: `${hotPct}%`, sub: `¥${summary.hotWaterTotal.toLocaleString()}` },
    { label: '冷水费占比', value: `${coldPct}%`, sub: `¥${summary.coldWaterTotal.toLocaleString()}` },
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

  // ========== 第3页: 费用趋势 ==========
  const trendSlide = pres.addSlide();
  trendSlide.background = { color: COLORS.white };

  addPageHeader(trendSlide, pres, '费用趋势', `统计周期：${periodLabel}`);

  if (monthlyStats.length > 0) {
    const sampledData = monthlyStats.length > 30
      ? monthlyStats.filter((_, i) => i % Math.ceil(monthlyStats.length / 30) === 0 || i === monthlyStats.length - 1)
      : monthlyStats;

    const chartData = [
      {
        name: '总费用',
        labels: sampledData.map(d => d.month),
        values: sampledData.map(d => d.amount),
      },
      {
        name: '冷水费',
        labels: sampledData.map(d => d.month),
        values: sampledData.map(d => d.coldWater),
      },
      {
        name: '热水费',
        labels: sampledData.map(d => d.month),
        values: sampledData.map(d => d.hotWater),
      },
      {
        name: '电费',
        labels: sampledData.map(d => d.month),
        values: sampledData.map(d => d.electricity),
      },
    ];

    trendSlide.addChart(pres.charts.LINE, chartData, {
      x: 0.5, y: 1.3, w: 9, h: 3.8,
      showTitle: false,
      lineSize: 2.5,
      lineSmooth: true,
      chartColors: [COLORS.totalAmount, COLORS.coldWater, COLORS.hotWater, COLORS.electricity],
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
    trendSlide.addText('该时间段内暂无费用趋势数据', {
      x: 0.5, y: 2, w: 9, h: 2,
      fontSize: 16, color: COLORS.muted, align: 'center', valign: 'middle',
    });
  }

  // ========== 第4页: 费用类型分布饼图 ==========
  const typeSlide = pres.addSlide();
  typeSlide.background = { color: COLORS.white };

  addPageHeader(typeSlide, pres, '费用类型分布', `统计周期：${periodLabel}`);

  if (billTypeStats.length > 0) {
    const feeTypeColorMap: Record<string, string> = {
      '电费': COLORS.electricity,
      '热水费': COLORS.hotWater,
      '冷水费': COLORS.coldWater,
    };
    const pieColors = billTypeStats.map(b => feeTypeColorMap[b.type] || COLORS.chartColors[0]);

    const pieData = [{
      name: '费用分布',
      labels: billTypeStats.map(b => `${b.type} ${b.percentage}%`),
      values: billTypeStats.map(b => b.amount),
    }];

    typeSlide.addChart(pres.charts.PIE, pieData, {
      x: 0.5, y: 1.3, w: 5, h: 3.8,
      showTitle: false,
      chartColors: pieColors,
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
    billTypeStats.forEach((b, i) => {
      const y = 1.8 + i * 1.1;
      const color = feeTypeColorMap[b.type] || COLORS.chartColors[i];

      typeSlide.addShape(pres.shapes.RECTANGLE, {
        x: rightX, y, w: 0.12, h: 0.9,
        fill: { color },
      });

      typeSlide.addText(b.type, {
        x: rightX + 0.25, y, w: 3, h: 0.3,
        fontSize: 11, fontFace: 'Arial', color: COLORS.dark, bold: true,
      });

      typeSlide.addText(`¥${b.amount.toLocaleString()}`, {
        x: rightX + 0.25, y: y + 0.3, w: 3, h: 0.35,
        fontSize: 15, fontFace: 'Arial', color: color, bold: true,
      });

      typeSlide.addText(`占比 ${b.percentage}%`, {
        x: rightX + 0.25, y: y + 0.6, w: 3, h: 0.25,
        fontSize: 9, fontFace: 'Arial', color: COLORS.muted,
      });
    });
  } else {
    typeSlide.addText('该时间段内暂无费用类型数据', {
      x: 0.5, y: 2, w: 9, h: 2,
      fontSize: 16, color: COLORS.muted, align: 'center', valign: 'middle',
    });
  }

  // ========== 第5页: 房间费用分摊 ==========
  const roomSlide = pres.addSlide();
  roomSlide.background = { color: COLORS.white };

  addPageHeader(roomSlide, pres, '房间费用分摊(Top 10)', `统计周期：${periodLabel}`);

  if (departmentStats.length > 0) {
    const topRooms = [...departmentStats]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 15);

    const barData = [{
      name: '费用',
      labels: topRooms.map(d => d.department || '未分配'),
      values: topRooms.map(d => d.amount),
    }];

    roomSlide.addChart(pres.charts.BAR, barData, {
      x: 0.3, y: 1.3, w: 9.4, h: 3.8,
      barDir: 'bar',
      showTitle: false,
      chartColors: COLORS.chartColors.slice(0, topRooms.length),
      chartArea: { fill: { color: COLORS.white }, roundedCorners: true },
      catAxisLabelColor: COLORS.dark,
      catAxisLabelFontSize: 9,
      valAxisLabelColor: COLORS.muted,
      valAxisLabelFontSize: 9,
      valGridLine: { color: 'E2E8F0', size: 0.5 },
      catGridLine: { style: 'none' },
      showValue: true,
      dataLabelPosition: 'outEnd',
      dataLabelColor: COLORS.dark,
      dataLabelFontSize: 9,
      showLegend: false,
    });
  } else {
    roomSlide.addText('该时间段内暂无房间费用数据', {
      x: 0.5, y: 2, w: 9, h: 2,
      fontSize: 16, color: COLORS.muted, align: 'center', valign: 'middle',
    });
  }

  // ========== 第6页: 分项费用对比 ==========
  const compareSlide = pres.addSlide();
  compareSlide.background = { color: COLORS.white };

  addPageHeader(compareSlide, pres, '分项费用对比', `统计周期：${periodLabel}`);

  if (billTypeStats.length > 0) {
    const feeTypeColorMap: Record<string, string> = {
      '电费': COLORS.electricity,
      '热水费': COLORS.hotWater,
      '冷水费': COLORS.coldWater,
    };

    const barData = [{
      name: '金额',
      labels: billTypeStats.map(b => b.type),
      values: billTypeStats.map(b => b.amount),
    }];

    const barColors = billTypeStats.map(b => feeTypeColorMap[b.type] || COLORS.chartColors[0]);

    compareSlide.addChart(pres.charts.BAR, barData, {
      x: 0.3, y: 1.3, w: 9.4, h: 3.8,
      barDir: 'col',
      showTitle: false,
      chartColors: barColors,
      chartArea: { fill: { color: COLORS.white }, roundedCorners: true },
      catAxisLabelColor: COLORS.dark,
      catAxisLabelFontSize: 12,
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
    compareSlide.addText('该时间段内暂无分项费用数据', {
      x: 0.5, y: 2, w: 9, h: 2,
      fontSize: 16, color: COLORS.muted, align: 'center', valign: 'middle',
    });
  }

  // ========== 第7页: 明细表格 + 分析建议 ==========
  const detailSlide = pres.addSlide();
  detailSlide.background = { color: COLORS.white };

  addPageHeader(detailSlide, pres, '房间费用明细与分析建议 (Top 10)', '');

  // 表格
  if (departmentStats.length > 0) {
    const headerRow = [
      { text: '房间号', options: { fill: { color: COLORS.primary }, color: COLORS.white, bold: true, fontSize: 9, align: 'center' } },
      { text: '费用金额', options: { fill: { color: COLORS.primary }, color: COLORS.white, bold: true, fontSize: 9, align: 'center' } },
      { text: '占比', options: { fill: { color: COLORS.primary }, color: COLORS.white, bold: true, fontSize: 9, align: 'center' } },
    ];

    const topTableRooms = [...departmentStats]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8);

    const dataRows = topTableRooms.map((d, i) => {
      const bgColor = i % 2 === 0 ? COLORS.white : COLORS.light;
      const pct = summary.totalAmount > 0 ? ((d.amount / summary.totalAmount) * 100).toFixed(1) : '0';
      return [
        { text: d.department || '未分配', options: { fill: { color: bgColor }, fontSize: 8, bold: true, color: COLORS.dark } },
        { text: `¥${d.amount.toLocaleString()}`, options: { fill: { color: bgColor }, fontSize: 8, align: 'center', color: COLORS.accent, bold: true } },
        { text: `${pct}%`, options: { fill: { color: bgColor }, fontSize: 8, align: 'center', color: COLORS.muted } },
      ];
    });

    const tableRows = [headerRow, ...dataRows];
    const tableH = Math.min(0.3 * (topTableRooms.length + 1), 2.8);

    detailSlide.addTable(tableRows, {
      x: 0.5, y: 1.3, w: 9,
      border: { pt: 0.5, color: 'E2E8F0' },
      colW: [3.5, 3, 2.5],
      h: tableH,
      autoPage: false,
    });
  }

  // 分析建议
  const suggestY = departmentStats.length > 0
    ? Math.min(1.3 + 0.3 * (Math.min(departmentStats.length, 8) + 1) + 0.3, 4.0)
    : 1.5;

  detailSlide.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: suggestY, w: 9, h: 1.3,
    fill: { color: 'FFFBEB' },
    line: { color: 'FDE68A', width: 1 },
  });

  const topFeeType = summary.electricityTotal >= summary.hotWaterTotal && summary.electricityTotal >= summary.coldWaterTotal
    ? '电费' : summary.hotWaterTotal >= summary.coldWaterTotal ? '热水费' : '冷水费';

  const topRoomHint = departmentStats.length > 0
    ? `${departmentStats.sort((a, b) => b.amount - a.amount)[0]?.department || '-'}房间费用占比最大，建议重点关注该房间的能源使用情况，优化资源配置`
    : '建议关注各房间的能源使用情况，优化资源配置';

  const suggestItems = [
    { text: `${periodLabel}总费用 ¥${summary.totalAmount.toLocaleString()}，电费 ${elecPct}%，热水费 ${hotPct}%，冷水费 ${coldPct}%`, options: { bullet: true, breakLine: true, fontSize: 9, color: COLORS.dark } },
    { text: `${topFeeType}占比最高，建议加强${topFeeType === '电费' ? '用电管理，推广节能措施' : topFeeType === '热水费' ? '热水使用管理，优化供应' : '冷水使用管理，排查管道泄漏'}`, options: { bullet: true, breakLine: true, fontSize: 9, color: COLORS.dark } },
    { text: topRoomHint, options: { bullet: true, fontSize: 9, color: COLORS.dark } },
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
  const fileName = `能源费用统计报告_${periodLabel}_${dateStr}.pptx`;

  try {
    await pres.writeFile({ fileName });
  } catch (writeFileError) {
    // writeFile 失败时，回退到 write({ outputType: 'blob' }) 手动下载
    console.warn('writeFile 失败，尝试 blob 方式下载:', writeFileError);
    const blob = await pres.write({ outputType: 'blob' }) as Blob;
    const url = URL.createObjectURL(blob);
    const eleLink = document.createElement('a');
    eleLink.style.display = 'none';
    eleLink.href = url;
    eleLink.download = fileName;
    document.body.appendChild(eleLink);
    eleLink.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      if (document.body.contains(eleLink)) {
        document.body.removeChild(eleLink);
      }
    }, 100);
  }
}

// 添加页面标题（统一风格）
function addPageHeader(slide: any, pres: any, title: string, subtitle: string) {
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
