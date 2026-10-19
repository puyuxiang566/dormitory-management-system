const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// 读取 Excel 文件
const filePath = path.join(__dirname, '..', '1 月水电费.xlsx');
console.log('读取 Excel 文件:', filePath);

if (!fs.existsSync(filePath)) {
  console.error('Excel 文件不存在:', filePath);
  process.exit(1);
}

const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const jsonData = XLSX.utils.sheet_to_json(worksheet);

console.log('\nExcel 文件内容:');
console.log(JSON.stringify(jsonData, null, 2));

// 从文件名提取年月
const fileName = path.basename(filePath);
const monthMatch = fileName.match(/(\d+) 月/);
const yearMonth = monthMatch ? { year: 2026, month: parseInt(monthMatch[1]) } : { year: 2026, month: 1 };

console.log('\n解析的年月:', yearMonth);

// 查找列名
const headers = Object.keys(jsonData[0] || {});
console.log('\nExcel 列名:', headers);

const roomCol = headers.find(h => h.includes('宿舍号'));
const electricityDegreeCol = headers.find(h => h.includes('电度数') && !h.includes('月'));
const startMeterCol = headers.find(h => h.match(/\d+ 月\d+ 日/) && !h.includes('1 月'));
const endMeterCol = headers.find(h => h.match(/1 月\d+ 日/));
const hotWaterCostCol = headers.find(h => h.includes('热水费'));
const coldWaterCostCol = headers.find(h => h.includes('冷水费'));

console.log('\n列映射:');
console.log('  宿舍号:', roomCol);
console.log('  电度数:', electricityDegreeCol);
console.log('  开始电表:', startMeterCol);
console.log('  结束电表:', endMeterCol);
console.log('  热水费:', hotWaterCostCol);
console.log('  冷水费:', coldWaterCostCol);

// 准备导入数据
const electricityPrice = 0.65; // 默认电费单价

const billsToImport = jsonData.map((row) => {
  const roomNumber = String(row[roomCol]);
  let electricityUsage = 0;

  if (electricityDegreeCol && row[electricityDegreeCol] !== undefined) {
    electricityUsage = Math.abs(parseFloat(row[electricityDegreeCol]) || 0);
  } else if (startMeterCol && endMeterCol) {
    const startReading = parseFloat(row[startMeterCol]) || 0;
    const endReading = parseFloat(row[endMeterCol]) || 0;
    electricityUsage = Math.abs(endReading - startReading);
  }

  const electricityCost = electricityUsage * electricityPrice;
  const hotWaterCost = row[hotWaterCostCol] !== undefined ? parseFloat(row[hotWaterCostCol]) || 0 : 0;
  const coldWaterCost = row[coldWaterCostCol] !== undefined ? parseFloat(row[coldWaterCostCol]) || 0 : 0;
  const totalAmount = electricityCost + hotWaterCost + coldWaterCost;

  return {
    roomNumber,
    electricityUsage,
    electricityCost,
    hotWaterCost,
    coldWaterCost,
    totalAmount,
  };
}).filter(b => b.roomNumber && b.roomNumber.trim() !== '');

console.log('\n准备导入的账单数据:');
console.log(JSON.stringify(billsToImport, null, 2));

// 保存到临时文件供浏览器测试使用
const testDataPath = path.join(__dirname, '..', 'scripts', 'import-test-data.json');
fs.writeFileSync(testDataPath, JSON.stringify({
  bills: billsToImport,
  year: yearMonth.year,
  month: yearMonth.month,
  fileName,
}, null, 2));

console.log('\n测试数据已保存到:', testDataPath);
console.log('\n测试数据预览:');
console.log(JSON.stringify({
  bills: billsToImport,
  year: yearMonth.year,
  month: yearMonth.month,
  fileName,
}, null, 2));
