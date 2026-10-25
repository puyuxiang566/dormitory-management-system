#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
宿舍管理系统 - 生产环境启动脚本
用于 dist 发布版本
"""

import os
import sys
import subprocess
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
        user32 = ctypes.windll.user32
        GetForegroundWindow = user32.GetForegroundWindow
        GetForegroundWindow.argtypes = []
        GetForegroundWindow.restype = wintypes.HWND

        GetWindowRect = user32.GetWindowRect
        GetWindowRect.argtypes = [wintypes.HWND, ctypes.POINTER(ctypes.c_long * 4)]
        GetWindowRect.restype = wintypes.BOOL

        SetWindowPos = user32.SetWindowPos
        SetWindowPos.argtypes = [
            wintypes.HWND, wintypes.HWND, ctypes.c_int, ctypes.c_int,
            ctypes.c_int, ctypes.c_int, ctypes.c_uint
        ]
        SetWindowPos.restype = wintypes.BOOL

        GetSystemMetrics = user32.GetSystemMetrics
        GetSystemMetrics.argtypes = [ctypes.c_int]
        GetSystemMetrics.restype = ctypes.c_int

        hwnd = GetForegroundWindow()
        if not hwnd:
            return

        screen_width = GetSystemMetrics(0)
        screen_height = GetSystemMetrics(1)

        rect = ctypes.c_long * 4
        window_rect = rect()
        GetWindowRect(hwnd, ctypes.byref(window_rect))

        window_width = window_rect[2] - window_rect[0]
        window_height = window_rect[3] - window_rect[1]

        x = (screen_width - window_width) // 2
        y = (screen_height - window_height) // 2

        SWP_NOZORDER = 0x0004
        SWP_NOSIZE = 0x0001
        flags = SWP_NOZORDER | SWP_NOSIZE

        SetWindowPos(hwnd, 0, x, y, 0, 0, flags)

    except Exception:
        pass


class Colors:
    """终端颜色代码"""
    SUCCESS = '\033[92m'
    ERROR = '\033[91m'
    WARNING = '\033[93m'
    INFO = '\033[94m'
    RESET = '\033[0m'

    @classmethod
    def success(cls, msg):
        print(f"{cls.SUCCESS}[OK] {msg}{cls.RESET}")

    @classmethod
    def error(cls, msg):
        print(f"{cls.ERROR}[ERROR] {msg}{cls.RESET}")

    @classmethod
    def warning(cls, msg):
        print(f"{cls.WARNING}[WARN] {msg}{cls.RESET}")

    @classmethod
    def info(cls, msg):
        print(f"{cls.INFO}[INFO] {msg}{cls.RESET}")


def run_command(cmd, check=True, shell=True):
    """运行 shell 命令"""
    try:
        result = subprocess.run(
            cmd,
            shell=shell,
            check=check,
            capture_output=True,
            text=True,
            encoding='utf-8',
            errors='replace'
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

        # 检查版本是否 >= 24.12.0
        try:
            version_parts = version.lstrip('v').split('.')
            major = int(version_parts[0])
            minor = int(version_parts[1])

            if major < 24 or (major == 24 and minor < 12):
                Colors.warning("Node.js 版本过低，建议 >= 24.12.0")
        except:
            pass

        return True

    Colors.error("Node.js 未安装")
    Colors.info("请访问 https://nodejs.org/ 下载安装")
    return False


def check_env_file():
    """检查 .env 文件"""
    Colors.info("正在检查环境配置...")

    if not os.path.exists(".env"):
        Colors.error("未找到 .env 配置文件")
        Colors.info("请复制 .env.example 为 .env 并配置数据库连接")

        if os.path.exists(".env.example"):
            Colors.info("\n配置步骤:")
            Colors.info("  1. 复制 .env.example 为 .env")
            Colors.info("  2. 编辑 .env 文件")
            Colors.info("  3. 配置 DATABASE_URL（数据库连接）")
            Colors.info("  4. 配置 NEXTAUTH_SECRET（认证密钥）")

        return False

    Colors.success("配置文件存在")

    # 检查关键配置
    try:
        with open(".env", "r", encoding="utf-8") as f:
            content = f.read()

        if "DATABASE_URL" not in content:
            Colors.error("缺少 DATABASE_URL 配置")
            return False

        if "NEXTAUTH_SECRET" not in content:
            Colors.warning("缺少 NEXTAUTH_SECRET 配置")

    except Exception as e:
        Colors.warning(f"无法读取配置文件: {e}")

    return True


def check_server_file():
    """检查 server.js 文件"""
    Colors.info("正在检查服务器文件...")

    if not os.path.exists("server.js"):
        Colors.error("未找到 server.js 文件")
        Colors.error("发布包可能不完整")
        return False

    Colors.success("服务器文件存在")
    return True


def check_build_files():
    """检查构建文件"""
    Colors.info("正在检查构建文件...")

    # 检查 .next 目录
    if not os.path.exists(".next"):
        Colors.error("未找到 .next 构建目录")
        Colors.error("发布包不完整！")
        Colors.info("\n可能的原因:")
        Colors.info("  1. 发布包解压时 .next 目录丢失（隐藏目录）")
        Colors.info("  2. 复制文件时未包含隐藏文件")
        Colors.info("  3. 压缩软件忽略了隐藏目录")
        Colors.info("\n解决方法:")
        Colors.info("  1. Windows: 使用 7-Zip 或 WinRAR 解压（选择显示隐藏文件）")
        Colors.info("  2. 复制时启用「显示隐藏文件」选项")
        Colors.info("  3. 使用 check-files.bat 检查完整性")
        return False

    # 检查 BUILD_ID
    if not os.path.exists(".next/BUILD_ID"):
        Colors.error("构建文件不完整（缺少 BUILD_ID）")
        Colors.error(".next 目录存在但不完整")
        Colors.info("\n可能的原因:")
        Colors.info("  1. .next 目录部分文件丢失")
        Colors.info("  2. 构建过程中断")
        Colors.info("\n需要的文件:")
        Colors.info("  .next/BUILD_ID")
        Colors.info("  .next/server/")
        Colors.info("  .next/static/")
        Colors.info("\n解决方法:")
        Colors.info("  重新获取完整的发布包")
        Colors.info("  或运行 check-files.bat 检查详细错误")
        return False

    # 检查 server 目录
    if not os.path.exists(".next/server"):
        Colors.error("缺少 .next/server 目录")
        Colors.error("构建文件不完整")
        Colors.info("需要 .next/server 目录（服务器端代码）")
        return False

    # 检查 static 目录
    if not os.path.exists(".next/static"):
        Colors.warning("缺少 .next/static 目录（静态资源）")
        Colors.warning("应用可能无法正常显示样式和图片")

    Colors.success("构建文件完整")
    return True


def install_dependencies():
    """自动安装依赖（发布包不含 node_modules，首次运行时自动安装）"""
    if os.path.exists(os.path.join("node_modules", "next")):
        return True

    Colors.info("未检测到 node_modules，正在自动安装依赖...")
    Colors.info("首次安装需要联网，约 2-5 分钟，请耐心等待")

    result = run_command("npm install --no-audit --no-fund", check=False)
    if result and result.returncode == 0:
        Colors.success("依赖安装完成")
        return True

    Colors.error("依赖安装失败")
    Colors.info("请检查网络连接后重试，或手动执行: npm install")
    return False


def generate_prisma_client():
    """检查 Prisma Client（缺失时用包内 schema 自动生成）"""
    Colors.info("正在检查 Prisma Client...")

    bundled_client = os.path.join(
        "node_modules", ".prisma", "client", "index.js"
    )
    if os.path.exists(bundled_client):
        Colors.success("Prisma Client 已就绪")
        return True

    if not os.path.exists(os.path.join("node_modules", "prisma")):
        Colors.error("未找到 Prisma CLI，依赖可能未安装完整")
        Colors.info("请手动执行: npm install")
        return False

    if not os.path.exists(os.path.join("prisma", "schema.prisma")):
        Colors.error("未找到 prisma/schema.prisma，发布包不完整")
        return False

    Colors.info("正在生成 Prisma Client...")
    result = run_command("npx prisma generate", check=False)
    if result and result.returncode == 0:
        Colors.success("Prisma Client 已生成")
        return True

    Colors.error("Prisma Client 生成失败")
    Colors.info("可能的原因:")
    Colors.info("  1. 网络问题导致引擎下载失败")
    Colors.info("  2. prisma/schema.prisma 文件损坏")

    return False


def sync_database():
    """同步数据库（仅在有 Prisma CLI 时执行，standalone 发布版跳过）"""
    # standalone 发布版不含 Prisma CLI，无法执行 db push，直接跳过
    if not os.path.exists(os.path.join("node_modules", "prisma")):
        Colors.info("standalone 发布版不含 Prisma CLI，跳过数据库同步")
        Colors.info("如需变更表结构，请在源项目目录执行 npm run db:push")
        return True

    Colors.info("正在同步数据库...")

    result = run_command("npx prisma db push", check=False)
    if result and result.returncode == 0:
        Colors.success("数据库已同步")
        return True

    Colors.warning("数据库同步可能失败")
    return True  # 不阻止启动


def check_port_3000():
    """检查端口 3000 是否被占用"""
    Colors.info("正在检查端口 3000...")

    if sys.platform == "win32":
        result = run_command('netstat -ano | findstr ":3000"', check=False)
    else:
        result = run_command('lsof -i :3000', check=False)

    if result and result.returncode == 0 and result.stdout.strip():
        Colors.warning("端口 3000 已被占用")
        Colors.info("请修改 .env 中的 PORT 变量，或停止占用端口的进程")
        return False

    Colors.success("端口 3000 可用")
    return True


def kill_processes_on_port_3000():
    """强制杀死占用端口 3000 的所有进程"""
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
                    Colors.warning(f"正在终止进程 {pid}...")
                    subprocess.run(
                        f'taskkill /F /PID {pid}',
                        shell=True,
                        capture_output=True
                    )

                return len(pids) > 0
        except Exception as e:
            Colors.error(f"终止进程时出错: {e}")
    else:
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
                        Colors.warning(f"正在终止进程 {pid}...")
                        subprocess.run(f'kill -9 {pid}', shell=True)
                return len(pids) > 0
        except Exception as e:
            Colors.error(f"终止进程时出错: {e}")

    return False


def start_server():
    """启动生产服务器"""
    print("\n" + "=" * 50)
    print("  宿舍管理系统 - 生产环境")
    print("=" * 50 + "\n")

    Colors.info("正在启动服务器...")
    Colors.info("访问地址: http://localhost:3000")
    Colors.info("默认账号: admin / admin123\n")

    # 使用 subprocess.Popen 启动服务器
    if sys.platform == "win32":
        process = subprocess.Popen(
            "node server.js",
            shell=True,
            creationflags=subprocess.CREATE_NEW_PROCESS_GROUP
        )
    else:
        process = subprocess.Popen(
            "node server.js",
            shell=True
        )

    return process


def open_browser():
    """打开浏览器"""
    time.sleep(3)
    try:
        webbrowser.open("http://localhost:3000")
        Colors.info("浏览器已自动打开")
    except Exception:
        Colors.warning("无法自动打开浏览器，请手动访问")


def main():
    """主函数"""
    # 居中窗口（仅 Windows）
    center_console_window()

    # 清屏
    os.system("cls" if sys.platform == "win32" else "clear")

    print("\n" + "=" * 50)
    print("  宿舍管理系统 - 生产环境")
    print("=" * 50 + "\n")

    # 步骤 1: 检查 Node.js
    print("[1/5] 环境检查")
    print("-" * 50)
    if not check_nodejs():
        input("\n按回车键退出...")
        sys.exit(1)

    # 步骤 2: 检查配置
    print("\n[2/5] 配置检查")
    print("-" * 50)
    if not check_env_file():
        input("\n按回车键退出...")
        sys.exit(1)

    # 步骤 3: 检查文件
    print("\n[3/5] 文件检查")
    print("-" * 50)
    if not check_server_file():
        input("\n按回车键退出...")
        sys.exit(1)
    if not check_build_files():
        input("\n按回车键退出...")
        sys.exit(1)

    # 步骤 4: 数据库准备
    print("\n[4/5] 数据库准备")
    print("-" * 50)
    if not install_dependencies():
        input("\n按回车键退出...")
        sys.exit(1)
    if not generate_prisma_client():
        input("\n按回车键退出...")
        sys.exit(1)
    sync_database()

    # 步骤 5: 端口检查
    print("\n[5/5] 端口检查")
    print("-" * 50)
    if not check_port_3000():
        Colors.warning("端口被占用，将在启动前清理...")
        kill_processes_on_port_3000()
        time.sleep(2)

    # 启动服务器
    print("\n" + "=" * 50)
    print("  准备启动")
    print("=" * 50 + "\n")

    server_process = None
    try:
        # 启动服务器
        server_process = start_server()

        # 打开浏览器
        open_browser()

        # 等待用户退出
        Colors.warning("按下 Ctrl+C 停止服务器")

        # 等待进程运行
        while True:
            if server_process.poll() is not None:
                Colors.error("服务器进程意外退出")
                break
            time.sleep(1)

    except KeyboardInterrupt:
        Colors.info("\n正在停止服务器...")

        # 停止服务器
        if server_process:
            server_process.terminate()
            try:
                server_process.wait(timeout=5)
                Colors.success("服务器已停止")
            except subprocess.TimeoutExpired:
                Colors.warning("服务器停止超时，强制清理端口...")
                kill_processes_on_port_3000()

        sys.exit(0)
    except Exception as e:
        Colors.error(f"发生错误: {e}")

        # 发生错误时尝试清理
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
        input("\n按回车键退出...")
        sys.exit(1)
