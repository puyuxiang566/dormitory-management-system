#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
宿舍管理系统 - 开发环境启动脚本 npm run dev
支持跨平台运行
"""

import os
import sys
import subprocess
import signal
import time
import webbrowser
from pathlib import Path

# Windows 平台特定导入
if sys.platform == "win32":
    import ctypes
    from ctypes import wintypes


def center_console_window():
    """将控制台窗口居中显示（仅 Windows）"""
    if sys.platform != "win32":
        return
    
    try:
        # 定义 Windows API 函数和常量
        user32 = ctypes.windll.user32
        
        # GetForegroundWindow - 获取当前窗口句柄
        GetForegroundWindow = user32.GetForegroundWindow
        GetForegroundWindow.argtypes = []
        GetForegroundWindow.restype = wintypes.HWND
        
        # GetWindowRect - 获取窗口矩形
        GetWindowRect = user32.GetWindowRect
        GetWindowRect.argtypes = [wintypes.HWND, ctypes.POINTER(ctypes.c_long * 4)]
        GetWindowRect.restype = wintypes.BOOL
        
        # SetWindowPos - 设置窗口位置
        SetWindowPos = user32.SetWindowPos
        SetWindowPos.argtypes = [
            wintypes.HWND,  # hWnd
            wintypes.HWND,  # hWndInsertAfter
            ctypes.c_int,   # X
            ctypes.c_int,   # Y
            ctypes.c_int,   # cx
            ctypes.c_int,   # cy
            ctypes.c_uint   # uFlags
        ]
        SetWindowPos.restype = wintypes.BOOL
        
        # GetSystemMetrics - 获取系统度量
        GetSystemMetrics = user32.GetSystemMetrics
        GetSystemMetrics.argtypes = [ctypes.c_int]
        GetSystemMetrics.restype = ctypes.c_int
        
        # 获取控制台窗口句柄
        hwnd = GetForegroundWindow()
        if not hwnd:
            return
        
        # 获取屏幕尺寸
        screen_width = GetSystemMetrics(0)  # SM_CXSCREEN
        screen_height = GetSystemMetrics(1)  # SM_CYSCREEN
        
        # 获取窗口尺寸
        rect = ctypes.c_long * 4
        window_rect = rect()
        GetWindowRect(hwnd, ctypes.byref(window_rect))
        
        window_width = window_rect[2] - window_rect[0]
        window_height = window_rect[3] - window_rect[1]
        
        # 计算居中位置
        x = (screen_width - window_width) // 2
        y = (screen_height - window_height) // 2
        
        # 设置窗口位置（SWP_NOZORDER | SWP_NOSIZE）
        SWP_NOZORDER = 0x0004
        SWP_NOSIZE = 0x0001
        flags = SWP_NOZORDER | SWP_NOSIZE
        
        SetWindowPos(hwnd, 0, x, y, 0, 0, flags)
        
    except Exception:
        # 如果失败，静默忽略（不影响脚本运行）
        pass


class Colors:
    """终端颜色代码"""
    SUCCESS = '\033[92m'  # 绿色
    ERROR = '\033[91m'    # 红色
    WARNING = '\033[93m'  # 黄色
    INFO = '\033[94m'     # 蓝色
    RESET = '\033[0m'     # 重置

    @classmethod
    def reset(cls):
        return cls.RESET

    @classmethod
    def success(cls, msg):
        print(f"{cls.SUCCESS}[OK] {msg}{cls.RESET}")

    @classmethod
    def error(cls, msg):
        print(f"{cls.ERROR}[X] {msg}{cls.RESET}")

    @classmethod
    def warning(cls, msg):
        print(f"{cls.WARNING}[WARN] {msg}{cls.RESET}")

    @classmethod
    def info(cls, msg):
        print(f"{cls.INFO}[INFO] {msg}{cls.RESET}")


def run_command(cmd, check=True, shell=True):
    """运行 shell 命令"""
    try:
        # Windows 使用 utf-8 编码，忽略无法解码的字符
        encoding = 'utf-8'
        errors = 'replace'

        result = subprocess.run(
            cmd,
            shell=shell,
            check=check,
            capture_output=True,
            text=True,
            encoding=encoding,
            errors=errors
        )
        return result
    except subprocess.CalledProcessError as e:
        Colors.error(f"命令执行失败: {cmd}")
        if e.stderr:
            Colors.error(e.stderr.strip())
        return None
    except Exception as e:
        Colors.error(f"命令执行异常: {cmd}")
        Colors.error(f"错误信息: {str(e)}")
        return None


def check_nodejs():
    """检查 Node.js 是否安装"""
    Colors.info("正在检查 Node.js...")

    result = run_command("node --version", check=False)
    if result and result.returncode == 0:
        version = result.stdout.strip()
        Colors.success(f"Node.js 版本: {version}")
        return True

    Colors.error("Node.js 未安装")
    Colors.info("请访问 https://nodejs.org/ 下载安装")
    return False


def check_npm():
    """检查 npm 是否可用"""
    Colors.info("正在检查 npm...")

    result = run_command("npm --version", check=False)
    if result and result.returncode == 0:
        version = result.stdout.strip()
        Colors.success(f"npm 版本: {version}")
        return True

    Colors.error("npm 不可用")
    return False


def check_critical_packages():
    """检查关键 npm 包是否已安装，缺失则自动安装"""
    Colors.info("正在检查关键依赖包...")

    critical_packages = ["pptxgenjs", "xlsx", "next-auth", "recharts", "@prisma/client"]
    missing = []

    for pkg in critical_packages:
        pkg_path = os.path.join("node_modules", pkg)
        if not os.path.exists(pkg_path):
            missing.append(pkg)

    if not missing:
        Colors.success("所有关键依赖包已安装")
        return True

    Colors.warning(f"缺少关键依赖包: {', '.join(missing)}")
    Colors.info("正在安装缺失的包...")

    result = run_command(f"npm install {' '.join(missing)}")
    if not result:
        Colors.error("安装缺失包失败")
        return False

    Colors.success("缺失依赖包安装完成")
    return True


def install_dependencies():
    """检查并安装依赖"""
    Colors.info("正在检查依赖...")

    if not os.path.exists("node_modules"):
        Colors.warning("未找到 node_modules，正在安装依赖...")
        Colors.info("这可能需要几分钟，请稍候...")

        result = run_command("npm install")
        if not result:
            Colors.error("依赖安装失败")
            return False

        Colors.success("依赖安装成功")
        return True

    # 检查 package.json 是否比 node_modules 更新
    package_time = os.path.getmtime("package.json")
    node_modules_time = os.path.getmtime("node_modules")

    if package_time > node_modules_time:
        Colors.warning("package.json 有更新，正在同步依赖...")
        result = run_command("npm install")
        if not result:
            Colors.error("同步依赖失败")
            return False
        Colors.success("依赖同步完成")
    else:
        Colors.success("依赖已是最新状态")

    return True


def check_environment():
    """检查环境配置"""
    Colors.info("正在检查环境配置...")

    env_file = ".env"
    env_example = ".env.example"

    if not os.path.exists(env_file):
        if os.path.exists(env_example):
            Colors.warning("未找到 .env 文件，正在从 .env.example 创建...")
            Path(env_example).copy(env_file)
            Colors.success(".env 文件已创建，请编辑配置后重新运行")
            Colors.info("需要配置的关键项:")
            Colors.info("  - DATABASE_URL: 数据库连接字符串")
            Colors.info("  - NEXTAUTH_SECRET: 认证密钥")
            return False
        else:
            Colors.warning("未找到 .env 文件，使用默认配置")
    else:
        Colors.success("环境配置文件存在")

    return True


def kill_stale_node_processes():
    """杀掉残留的 Node 进程（避免 Prisma DLL 文件被锁）"""
    if sys.platform == "win32":
        try:
            result = subprocess.run(
                'netstat -ano | findstr ":3000"',
                shell=True,
                capture_output=True,
                text=True,
                encoding='utf-8',
                errors='replace'
            )
            if result.returncode == 0 and result.stdout:
                pids = set()
                for line in result.stdout.split('\n'):
                    parts = line.split()
                    if len(parts) >= 5:
                        pid = parts[-1]
                        if pid.isdigit():
                            pids.add(pid)
                for pid in pids:
                    Colors.warning(f"正在终止残留进程 {pid}...")
                    subprocess.run(
                        f'taskkill /F /PID {pid}',
                        shell=True,
                        capture_output=True
                    )
                if pids:
                    Colors.info("等待进程释放资源...")
                    time.sleep(2)
        except Exception:
            pass


def init_prisma():
    """初始化 Prisma"""
    Colors.info("正在初始化 Prisma...")

    # 先杀掉可能锁定 DLL 的残留进程
    kill_stale_node_processes()

    # 生成 Prisma Client
    result = run_command("npx prisma generate")
    if not result:
        Colors.error("生成 Prisma Client 失败")
        return False

    Colors.success("Prisma Client 已生成")

    # 同步数据库
    Colors.info("正在同步数据库架构...")
    result = run_command("npx prisma db push --accept-data-loss", check=False)
    if result and result.returncode == 0:
        Colors.success("数据库架构已同步")
    else:
        Colors.warning("数据库可能已是最新状态")

    return True


def check_port_3000():
    """检查端口 3000 是否被占用"""
    Colors.info("正在检查端口 3000...")

    if sys.platform == "win32":
        # Windows 平台
        result = run_command('netstat -ano | findstr ":3000"', check=False)
    else:
        # Unix 平台
        result = run_command('lsof -i :3000', check=False)

    if result and result.returncode == 0:
        Colors.warning("端口 3000 已被占用")
        Colors.info("请手动停止占用该端口的进程")
        return False

    Colors.success("端口 3000 可用")
    return True


def kill_processes_on_port_3000():
    """强制杀死占用端口 3000 的所有进程"""
    if sys.platform == "win32":
        # Windows: 使用 netstat 和 taskkill
        try:
            # 查找占用端口 3000 的进程 ID
            result = subprocess.run(
                'netstat -ano | findstr ":3000"',
                shell=True,
                capture_output=True,
                text=True,
                encoding='utf-8',
                errors='replace'
            )
            
            if result.returncode == 0 and result.stdout:
                pids = set()
                for line in result.stdout.split('\n'):
                    parts = line.split()
                    if len(parts) >= 5:
                        pid = parts[-1]
                        if pid.isdigit():
                            pids.add(pid)
                
                for pid in pids:
                    Colors.warning(f"正在强制终止进程 {pid}...")
                    subprocess.run(
                        f'taskkill /F /PID {pid}',
                        shell=True,
                        capture_output=True
                    )
                return True
        except Exception as e:
            Colors.error(f"强制终止进程时出错: {e}")
    else:
        # Unix/Linux: 使用 lsof 和 kill
        try:
            result = subprocess.run(
                'lsof -ti :3000',
                shell=True,
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0 and result.stdout:
                pids = result.stdout.strip().split('\n')
                for pid in pids:
                    if pid:
                        Colors.warning(f"正在强制终止进程 {pid}...")
                        subprocess.run(f'kill -9 {pid}', shell=True)
                return True
        except Exception as e:
            Colors.error(f"强制终止进程时出错: {e}")
    
    return False


def start_dev_server():
    """启动开发服务器并返回进程对象"""
    print("\n" + "=" * 50)
    print("  宿舍管理系统 - 开发环境")
    print("=" * 50 + "\n")

    Colors.info("正在启动开发服务器...")
    Colors.info("服务器地址: http://localhost:3000")
    Colors.info("默认账号: admin / admin123\n")

    # 使用 subprocess.Popen 启动服务器
    if sys.platform == "win32":
        # Windows: 使用 npm run dev
        process = subprocess.Popen(
            "npm run dev",
            shell=True,
            creationflags=subprocess.CREATE_NEW_PROCESS_GROUP
        )
    else:
        # Unix: 使用 npm run dev
        process = subprocess.Popen(
            "npm run dev",
            shell=True
        )
    
    return process


def stop_server_forcefully(process):
    """强制停止服务器进程"""
    if process is None:
        return False
    
    try:
        # 直接强制终止进程
        Colors.warning("正在强制终止服务器进程...")
        process.kill()
        
        # 等待进程结束（最多 2 秒）
        try:
            process.wait(timeout=2)
            Colors.success("服务器进程已强制停止")
            return True
        except subprocess.TimeoutExpired:
            Colors.warning("进程终止超时，将清理端口占用...")
            return False
            
    except Exception as e:
        Colors.error(f"强制停止进程时出错: {e}")
        return False


def open_browser():
    """打开浏览器"""
    time.sleep(3)  # 等待服务器启动
    try:
        webbrowser.open("http://localhost:3000")
        Colors.info("浏览器已自动打开")
    except Exception as e:
        Colors.warning("无法自动打开浏览器，请手动访问")


def main():
    """主函数"""
    # 居中窗口（仅 Windows）
    center_console_window()
    
    # 清屏
    os.system("cls" if sys.platform == "win32" else "clear")

    print("\n" + "=" * 50)
    print("  宿舍管理系统 - 开发环境")
    print("=" * 50 + "\n")

    # 步骤 1: 检查 Node.js
    print("[1/5] 环境检查")
    print("-" * 50)
    if not check_nodejs():
        sys.exit(1)
    if not check_npm():
        sys.exit(1)

    # 步骤 2: 检查依赖
    print("\n[2/5] 依赖检查")
    print("-" * 50)
    if not install_dependencies():
        sys.exit(1)
    if not check_critical_packages():
        sys.exit(1)

    # 步骤 3: 检查环境
    print("\n[3/5] 环境配置")
    print("-" * 50)
    if not check_environment():
        sys.exit(1)

    # 步骤 4: 初始化数据库
    print("\n[4/5] 数据库初始化")
    print("-" * 50)
    if not init_prisma():
        sys.exit(1)

    # 步骤 5: 健康检查
    print("\n[5/5] 系统健康检查")
    print("-" * 50)
    check_port_3000()

    # 启动服务器
    print("\n" + "=" * 50)
    print("  准备启动")
    print("=" * 50 + "\n")

    # 启动服务器进程
    server_process = None
    try:
        # 启动开发服务器
        server_process = start_dev_server()

        # 打开浏览器
        open_browser()

        # 等待用户退出
        Colors.warning("按下 Ctrl+C 停止服务器")
        
        # 等待进程运行
        while True:
            # 检查进程是否仍在运行
            if server_process.poll() is not None:
                Colors.error("服务器进程意外退出")
                break
            time.sleep(1)
            
    except KeyboardInterrupt:
        Colors.info("\n正在停止服务器...")
        
        # 直接强制停止所有占用端口 3000 的进程
        Colors.warning("正在强制终止所有占用端口 3000 的进程...")
        kill_processes_on_port_3000()
        
        Colors.success("所有服务已停止")
        sys.exit(0)
    except Exception as e:
        Colors.error(f"发生错误: {e}")
        
        # 发生错误时尝试清理
        Colors.warning("正在强制终止所有占用端口 3000 的进程...")
        kill_processes_on_port_3000()
        
        sys.exit(1)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n")
        Colors.info("用户中断操作")
        sys.exit(0)
    except Exception as e:
        Colors.error(f"发生错误: {e}")
        sys.exit(1)