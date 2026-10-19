# Strict mode
Set-StrictMode -Version Latest
$ErrorActionPreference = "Continue"

# 宿舍管理系统 - 开发环境启动脚本 - npm run dev
# 支持 PowerShell 7+ 和 Windows PowerShell 5.1

# 设置输出编码
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# 颜色配置
$colors = @{
    Success = 'Green'
    Error = 'Red'
    Warning = 'Yellow'
    Info = 'Cyan'
    Default = 'White'
}

# 辅助函数
function Write-Step {
    param([string]$Message, [int]$Step, [int]$Total)
    Write-Host ""
    Write-Host "[$Step/$Total] $Message" -ForegroundColor $colors.Info
    Write-Host ("-" * 50) -ForegroundColor DarkGray
}

function Write-Success {
    param([string]$Message)
    Write-Host "[OK] $Message" -ForegroundColor $colors.Success
}

function Write-ErrorMsg {
    param([string]$Message)
    Write-Host "[X] $Message" -ForegroundColor $colors.Error
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARN] $Message" -ForegroundColor $colors.Warning
}

function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor $colors.Default
}

# 检查 Node.js 版本
function Test-NodeVersion {
    try {
        $nodeVersion = (node --version).Substring(1)
        $requiredVersion = [Version]"24.12.0"
        $currentVersion = [Version]$nodeVersion

        if ($currentVersion -lt $requiredVersion) {
            Write-ErrorMsg "Node.js 版本过低 (当前: $nodeVersion, 要求: >= 24.12.0)"
            Write-Info "请访问 https://nodejs.org/ 下载最新 LTS 版本"
            return $false
        }
        Write-Success "Node.js 版本正常: $nodeVersion"
        return $true
    }
    catch {
        Write-ErrorMsg "Node.js 未安装或不在 PATH 中"
        Write-Info "请访问 https://nodejs.org/ 安装 Node.js"
        return $false
    }
}

# 检查 npm 可用性
function Test-Npm {
    try {
        $npmVersion = npm --version
        Write-Success "npm 版本: $npmVersion"
        return $true
    }
    catch {
        Write-ErrorMsg "npm 不可用"
        return $false
    }
}

# 检查并安装依赖
function Install-Dependencies {
    Write-Info "正在检查 node_modules..."

    if (-not (Test-Path "node_modules")) {
        Write-Warning "未找到 node_modules，正在进行安装..."
        Write-Info "这可能需要几分钟，请稍候..."
        npm install
        if ($LASTEXITCODE -ne 0) {
            Write-ErrorMsg "依赖安装失败"
            return $false
        }
        Write-Success "依赖安装成功"
        return $true
    }

    $packageJson = Get-Item "package.json"
    $nodeModules = Get-Item "node_modules"

    if ($packageJson.LastWriteTime -gt $nodeModules.LastWriteTime) {
        Write-Warning "package.json 有更新，正在同步依赖..."
        npm install
        if ($LASTEXITCODE -ne 0) {
            Write-ErrorMsg "同步依赖失败"
            return $false
        }
        # 手动更新目录时间戳，处理 Windows 属性缓存问题
        try {
            (Get-Item "node_modules").LastWriteTime = Get-Date
            Write-Success "同步完成，目录时间戳已更新"
        } catch {
            Write-Success "同步完成"
        }
    } else {
        Write-Success "依赖已是最新状态"
    }
    return $true
}

# 检查环境变量
function Test-Environment {
    Write-Info "正在检查环境配置..."

    $envFile = ".env"
    $envExample = ".env.example"

    if (-not (Test-Path $envFile)) {
        if (Test-Path $envExample) {
            Write-Warning "未找到 .env 文件，正在从 .env.example 创建..."
            Copy-Item $envExample $envFile
            Write-Success ".env 文件已创建，请编辑配置后重新运行"
            Write-Info "需要配置的关键项:"
            Write-Info "  - DATABASE_URL: 数据库连接字符串"
            Write-Info "  - NEXTAUTH_SECRET: 认证密钥"
            return $false
        }
        else {
            Write-Warning "未找到 .env 文件，使用默认配置"
        }
    }
    else {
        Write-Success "环境配置文件存在"
    }

    if (Test-Path $envFile) {
        $envContent = Get-Content $envFile -Raw
        if ($envContent -match "DATABASE_URL\s*=\s*(.+)") {
            $dbUrl = $Matches[1].Trim()
            if ($dbUrl -and $dbUrl -notmatch "your-" -and $dbUrl -notmatch "example") {
                Write-Success "数据库连接已配置"
            }
            else {
                Write-Warning "数据库连接可能配置不正确"
            }
        }
    }

    return $true
}

# 初始化 Prisma
function Initialize-Prisma {
    Write-Info "正在初始化 Prisma..."

    npx prisma generate
    if ($LASTEXITCODE -ne 0) {
        Write-ErrorMsg "生成 Prisma Client 失败"
        return $false
    }
    Write-Success "Prisma Client 已生成"

    Write-Info "正在同步数据库架构..."
    $pushOutput = npx prisma db push --accept-data-loss 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "数据库可能已是最新状态，或存在其他问题"
        Write-Info "错误详情: $pushOutput"
    }
    else {
        Write-Success "数据库架构已同步"
    }

    return $true
}

# 系统健康检查
function Test-SystemHealth {
    Write-Info "正在执行系统健康检查..."

    $issues = @()

    # 检查 3000 端口
    $port3000 = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
    if ($port3000) {
        Write-Warning "端口 3000 已被占用，正在尝试终止占用进程..."
        
        # 过滤掉 PID 0 (System Idle Process)
        $realProcesses = $port3000 | Where-Object { $_.OwningProcess -ne 0 }
        
        if ($realProcesses) {
            $uniquePids = $realProcesses | Select-Object -ExpandProperty OwningProcess -Unique
            
            foreach ($pid in $uniquePids) {
                try {
                    $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
                    if ($process) {
                        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
                        Write-Success "已终止进程: $($process.ProcessName) (PID: $pid)"
                    }
                } catch {
                    Write-Warning "无法终止进程 PID: $pid"
                }
            }
        } else {
            Write-Info "端口处于监听状态，尝试查找 node 进程..."
            # 尝试终止 node 进程
            $nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
            foreach ($proc in $nodeProcesses) {
                try {
                    Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
                    Write-Success "已终止 node 进程 (PID: $($proc.Id))"
                } catch {
                    Write-Warning "无法终止 node 进程 PID: $($proc.Id)"
                }
            }
        }
        
        # 等待端口释放
        Start-Sleep -Seconds 2
        
        # 再次检查端口
        $port3000Check = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
        if ($port3000Check) {
            Write-Warning "端口仍被占用，尝试使用 netstat 查找..."
            
            # 使用 netstat 查找并终止
            $netstatOutput = netstat -ano | Select-String ":3000"
            if ($netstatOutput) {
                $netstatOutput | ForEach-Object {
                    $line = $_.Line
                    if ($line -match "LISTENING\s+(\d+)") {
                        $pid = [int]$Matches[1]
                        if ($pid -gt 0) {
                            try {
                                $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
                                Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
                                Write-Success "已终止进程 (PID: $pid)"
                            } catch { }
                        }
                    }
                }
            }
            
            Start-Sleep -Seconds 1
            $port3000Check = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
            if ($port3000Check) {
                $issues += "端口 3000 仍被占用，无法启动服务"
            }
        } else {
            Write-Success "端口 3000 已释放"
        }
    }

    # 检查磁盘空间
    $drive = Get-PSDrive (Get-Location).Drive.Name
    $freeSpaceGB = [math]::Round($drive.Free / 1GB, 2)
    if ($freeSpaceGB -lt 1) {
        $issues += "磁盘空间不足 (剩余: $freeSpaceGB GB)"
    }

    if ($issues.Count -gt 0) {
        Write-Warning "发现以下问题:"
        foreach ($issue in $issues) {
            Write-ErrorMsg "  - $issue"
        }
        Write-Info "建议在启动前解决上述问题"

        $continue = Read-Host "是否继续启动? (y/N)"
        if (($continue -ne 'y') -and ($continue -ne 'Y')) {
            return $false
        }
    }
    else {
        Write-Success "系统健康检查通过"
    }

    return $true
}

# 显示系统信息
function Show-SystemInfo {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  宿舍管理系统  " -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Info "操作系统: $([System.Environment]::OSVersion.VersionString)"
    Write-Info "PowerShell: $($PSVersionTable.PSVersion)"
    Write-Info "当前路径: $(Get-Location)"
    Write-Host ""
}

# 启动开发服务器
function Start-DevServer {

    npm run dev
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  启动成功!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Info "访问地址: http://localhost:3000"
    Write-Info "默认账号: admin / admin123"
    Write-Host ""
    Write-Warning "按下 Ctrl+C 停止服务器"
    Write-Host ""

    try {
        Start-Process "http://localhost:3000"
        Write-Info "浏览器已自动打开"
    }
    catch {
        Write-Info "请手动打开浏览器访问"
    }
	Write-Host ""
}

# 主流程
function Main {
    Clear-Host
    Show-SystemInfo

    $totalSteps = 5
    $currentStep = 1

    # 第 1 步: Node.js 检查
    Write-Step "正在检查 Node.js" $currentStep $totalSteps
    if (-not (Test-NodeVersion)) { exit 1 }
    if (-not (Test-Npm)) { exit 1 }
    $currentStep++

    # 第 2 步: 依赖检查
    Write-Step "正在检查依赖" $currentStep $totalSteps
    if (-not (Install-Dependencies)) { exit 1 }
    $currentStep++

    # 第 3 步: 环境检查
    Write-Step "正在检查环境配置" $currentStep $totalSteps
    if (-not (Test-Environment)) { exit 1 }
    $currentStep++

    # 第 4 步: 数据库初始化
    Write-Step "正在初始化数据库" $currentStep $totalSteps
    if (-not (Initialize-Prisma)) { exit 1 }
    $currentStep++

    # 第 5 步: 健康检查
    Write-Step "系统健康检查" $currentStep $totalSteps
    if (-not (Test-SystemHealth)) { exit 1 }

    # 启动
    Start-DevServer
}

# 执行
Main

# 错误捕获
trap {
    Write-ErrorMsg "脚本发生错误: $_"
    Write-Info "详情: $($_.Exception.Message)"
    Write-Host ""
    Read-Host "按下回车键退出"
    exit 1
}
