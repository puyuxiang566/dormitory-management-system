# 测试 Excel 文件导入功能
Write-Host "开始测试 Excel 文件导入功能..." -ForegroundColor Cyan

# 1. 检查文件是否存在
$filePath = "1 月水电费.xlsx"
if (Test-Path $filePath) {
    Write-Host "✓ Excel 文件存在：$filePath" -ForegroundColor Green
} else {
    Write-Host "✗ Excel 文件不存在：$filePath" -ForegroundColor Red
    exit 1
}

# 2. 使用 agent-browser 测试
Write-Host "`n 正在打开浏览器并导航到费用管理页面..." -ForegroundColor Yellow

# 打开浏览器（显示窗口模式）
agent-browser open http://localhost:3003/admin/fees --headed
agent-browser wait 2000

# 获取页面快照
Write-Host "正在获取页面元素..." -ForegroundColor Yellow
$snapshot = agent-browser snapshot -i

# 查找导入按钮
Write-Host "正在点击导入按钮..." -ForegroundColor Yellow
agent-browser click "button:has-text('导入账单')"
agent-browser wait 1000

# 上传文件
Write-Host "正在上传 Excel 文件..." -ForegroundColor Yellow
$uploadResult = agent-browser eval @"
(async () => {
  const input = document.querySelector('input[type="file"]');
  if (!input) return { success: false, message: '未找到文件输入元素' };
  
  // 创建测试文件数据
  const file = new File(['test'], '1 月水电费.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(file);
  input.files = dataTransfer.files;
  
  // 触发 change 事件
  const event = new Event('change', { bubbles: true });
  input.dispatchEvent(event);
  
  return { success: true, message: '文件已选择' };
})()
"@

Write-Host "上传结果：$uploadResult" -ForegroundColor Cyan

# 等待导入完成
agent-browser wait 3000

# 检查导入结果
Write-Host "正在检查导入结果..." -ForegroundColor Yellow
$result = agent-browser eval "document.querySelector('.modal')?.innerText || 'No modal found'"

Write-Host "导入结果：$result" -ForegroundColor Cyan

# 截图
agent-browser screenshot --annotate "C:\Temp\fees-import-result.png"
Write-Host "✓ 截图已保存：C:\Temp\fees-import-result.png" -ForegroundColor Green

Write-Host "`n 测试完成！" -ForegroundColor Green
