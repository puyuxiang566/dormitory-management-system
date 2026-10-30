/* 一次性导入更衣柜布局（更衣柜明细.xlsx -> locker 表）
 * 用法: node scripts/import-lockers.mjs
 * 布局规则: "东X排"等标题行之后，连续的每个数据行代表现实中上下叠放的一排柜（1~3 排），
 *           subRow 记录排内层号（1=最上）。
 */
import XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const FILE = '更衣柜明细.xlsx';
const AREA_RE = /^(东|西|南|中)([一二三四五六七八九十]+)排$/;

function genderOf(sheetName) {
  if (sheetName.includes('男')) return 'MALE';
  if (sheetName.includes('女')) return 'FEMALE';
  throw new Error('无法识别工作表性别: ' + sheetName);
}

async function main() {
  // 清空重建（首次部署用；重复执行会重置占用状态，请勿在生产随意运行）
  await prisma.locker.deleteMany({});

  const workbook = XLSX.readFile(FILE);
  let total = 0;
  const report = [];

  for (const sheetName of workbook.SheetNames) {
    const ws = workbook.Sheets[sheetName];
    const gender = genderOf(sheetName);
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    let currentRow = null;
    let subRow = 0;
    let rowTotal = 0;
    const batch = [];

    const flush = async () => {
      if (!batch.length) return;
      const data = batch.map(({ area, rowName, sub, lockerNo }) => ({
        gender, area, rowName, subRow: sub, lockerNo, status: 'FREE',
      }));
      const res = await prisma.locker.createMany({ data, skipDuplicates: true });
      total += res.count;
      rowTotal += res.count;
      batch.length = 0;
    };

    for (const row of rows) {
      const firstCell = String(row[0] ?? '').trim();
      if (firstCell && AREA_RE.test(firstCell)) {
        await flush();
        if (currentRow) report.push(`${gender === 'MALE' ? '男' : '女'} ${currentRow}: ${rowTotal} 柜（${subRow} 排叠放）`);
        currentRow = firstCell;
        subRow = 0;
        rowTotal = 0;
        continue;
      }
      if (!currentRow) continue; // 表头（性别）行
      const numbers = row
        .map((c) => String(c ?? '').trim())
        .filter((s) => /^\d+$/.test(s));
      if (!numbers.length) continue;
      subRow += 1; // Excel 中每个非空数据行 = 现实中上下叠放的一排
      const area = currentRow.match(AREA_RE)[1];
      for (const lockerNo of numbers) {
        batch.push({ area, rowName: currentRow, sub: subRow, lockerNo });
      }
    }
    await flush();
    if (currentRow) report.push(`${gender === 'MALE' ? '男' : '女'} ${currentRow}: ${rowTotal} 柜（${subRow} 排叠放）`);
  }

  console.log(report.join('\n'));
  console.log(`\n导入完成: 共 ${total} 个柜`);
}

main().finally(() => prisma.$disconnect());
