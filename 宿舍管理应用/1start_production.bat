@echo off
chcp 936 >nul
title 宿舍管理系统 - 生产环境
cd /d "%~dp0"
echo ==================================================
echo   宿舍管理系统 - 生产环境
echo ==================================================
echo.
REM [1/5] 环境检查: Node.js
echo [1/5] 环境检查
echo --------------------------------------------------
where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js 未安装
    echo 请访问 https://nodejs.org/ 下载安装
    pause
    exit /b 1
)
for /f "delims=" %%v in ('node --version') do set NODE_VER=%%v
echo [OK] Node.js 版本: %NODE_VER%
echo.
REM [2/5] 配置检查: .env
echo [2/5] 配置检查
echo --------------------------------------------------
if not exist ".env" (
    echo [ERROR] 未找到 .env 配置文件
    echo 请在发布版目录下创建 .env，并配置:
    echo   DATABASE_URL    ^(数据库连接^)
    echo   NEXTAUTH_URL    ^(访问地址^)
    echo   NEXTAUTH_SECRET ^(认证密钥^)
    pause
    exit /b 1
)
findstr /C:"DATABASE_URL" .env >nul 2>nul
if errorlevel 1 (
    echo [ERROR] .env 中缺少 DATABASE_URL 配置
    pause
    exit /b 1
)
findstr /C:"NEXTAUTH_SECRET" .env >nul 2>nul
if errorlevel 1 (
    echo [WARN] .env 中缺少 NEXTAUTH_SECRET 配置
)
echo [OK] 配置文件存在
echo.
REM [3/5] 文件检查: server.js 与构建产物
echo [3/5] 文件检查
echo --------------------------------------------------
if not exist "server.js" (
    echo [ERROR] 未找到 server.js 文件，发布包可能不完整
    pause
    exit /b 1
)
echo [OK] 服务器文件存在
if not exist ".next" (
    echo [ERROR] 未找到 .next 构建目录，发布包不完整
    pause
    exit /b 1
)
if not exist ".next\BUILD_ID" (
    echo [ERROR] 构建文件不完整（缺少 BUILD_ID）
    pause
    exit /b 1
)
if not exist ".next\server" (
    echo [ERROR] 缺少 .next\server 目录（服务器端代码）
    pause
    exit /b 1
)
if not exist ".next\static" (
    echo [WARN] 缺少 .next\static 目录，页面样式可能无法显示
)
echo [OK] 构建文件完整
echo.
REM [4/5] 依赖与数据库: 首次运行自动安装依赖并生成 Prisma Client
echo [4/5] 依赖与数据库准备
echo --------------------------------------------------
if not exist "node_modules\next" (
    echo [INFO] 未检测到 node_modules，正在自动安装依赖...
    echo [INFO] 首次安装需要联网，约 2-5 分钟，请耐心等待
    call npm install --no-audit --no-fund
    if errorlevel 1 (
        echo [ERROR] 依赖安装失败，请检查网络后重试
        echo 或手动执行: npm install
        pause
        exit /b 1
    )
    echo [OK] 依赖安装完成
) else (
    echo [OK] 依赖已安装
)
if not exist "node_modules\.prisma\client\index.js" (
    echo [INFO] 正在生成 Prisma Client...
    call npx prisma generate
    if errorlevel 1 (
        echo [ERROR] Prisma Client 生成失败
        pause
        exit /b 1
    )
)
echo [OK] Prisma Client 已就绪
echo [INFO] 如需同步表结构，可执行 npx prisma db push
echo.
REM [5/5] 端口检查
echo [5/5] 端口检查
echo --------------------------------------------------
set PORT_OCCUPIED=0
netstat -ano | findstr /C:":3000" | findstr /C:"LISTENING" >nul 2>nul
if not errorlevel 1 set PORT_OCCUPIED=1
if "%PORT_OCCUPIED%"=="1" (
    echo [WARN] 端口 3000 已被占用，正在清理...
    for /f "tokens=5" %%p in ('netstat -ano ^| findstr /C:":3000" ^| findstr /C:"LISTENING"') do (
        echo 正在终止进程 %%p ...
        taskkill /F /PID %%p >nul 2>nul
    )
    timeout /t 2 /nobreak >nul
) else (
    echo [OK] 端口 3000 可用
)
echo.
echo ==================================================
echo   准备启动
echo ==================================================
echo.
echo [INFO] 正在启动服务器...
echo [INFO] 访问地址: http://localhost:3000
echo [INFO] 默认账号: admin / admin123
echo [INFO] 关闭本窗口即可停止服务器
echo.
start "" http://localhost:3000
node server.js
echo.
echo [INFO] 服务器已停止
pause
