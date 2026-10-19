# 创建测试 Excel 文件
$excelData = @(
    [PSCustomObject]@{
        '宿舍号' = '101'
        '12 月 30 日电度数' = 1000
        '1 月 30 日电度数' = 1150
        '1 月份电度数' = 150
        '电费' = ''
        '冷水费' = 20
        '热水费' = 30
    },
    [PSCustomObject]@{
        '宿舍号' = '102'
        '12 月 30 日电度数' = 2000
        '1 月 30 日电度数' = 2200
        '1 月份电度数' = 200
        '电费' = ''
        '冷水费' = 25
        '热水费' = 35
    },
    [PSCustomObject]@{
        '宿舍号' = '103'
        '12 月 30 日电度数' = 1500
        '1 月 30 日电度数' = 1680
        '1 月份电度数' = 180
        '电费' = ''
        '冷水费' = 18
        '热水费' = 28
    }
)

# 使用 Excel COM 对象创建文件
try {
    $excel = New-Object -ComObject Excel.Application
    $excel.Visible = $false
    $workbook = $excel.Workbooks.Add()
    $worksheet = $workbook.Worksheets.Item(1)
    $worksheet.Name = '1 月水电费'

    # 写入表头
    $headers = @('宿舍号', '12 月 30 日电度数', '1 月 30 日电度数', '1 月份电度数', '电费', '冷水费', '热水费')
    for ($i = 0; $i -lt $headers.Length; $i++) {
        $worksheet.Cells.Item(1, $i + 1) = $headers[$i]
    }

    # 写入数据
    $row = 2
    foreach ($data in $excelData) {
        $worksheet.Cells.Item($row, 1) = $data.'宿舍号'
        $worksheet.Cells.Item($row, 2) = $data.'12 月 30 日电度数'
        $worksheet.Cells.Item($row, 3) = $data.'1 月 30 日电度数'
        $worksheet.Cells.Item($row, 4) = $data.'1 月份电度数'
        $worksheet.Cells.Item($row, 5) = $data.'电费'
        $worksheet.Cells.Item($row, 6) = $data.'冷水费'
        $worksheet.Cells.Item($row, 7) = $data.'热水费'
        $row++
    }

    # 保存文件
    $filePath = '1 月水电费.xlsx'
    $workbook.SaveAs($filePath)
    $workbook.Close()
    $excel.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
    Write-Host 'Excel 文件已创建：1 月水电费.xlsx' -ForegroundColor Green
} catch {
    Write-Host "创建 Excel 文件失败：$_" -ForegroundColor Red
    Write-Host "请确保已安装 Microsoft Excel" -ForegroundColor Yellow
}
