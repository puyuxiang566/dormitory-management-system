/**
 * 排层显示标签：层号是绝对序号（1=最上层），显示文字依赖该排叠放的总层数。
 * - 2 排叠放：上排 / 下排
 * - 3 排叠放：上排 / 中排 / 下排
 * - 单排不显示标签
 * maxSub 应取该排（同性别+同排名）全部柜子的最大层号，而非筛选后的子集。
 */
export function subRowLabel(sub: number, maxSub: number): string {
  if (!Number.isFinite(maxSub) || maxSub <= 1) return '';
  if (maxSub === 2) return ['', '上排', '下排'][sub] || `第${sub}层`;
  return ['', '上排', '中排', '下排'][sub] || `第${sub}层`;
}
