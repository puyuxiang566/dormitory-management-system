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
import tempfile
import time
import types
import urllib.request
import webbrowser
from pathlib import Path

# Windows 平台特定导入
if sys.platform == "win32":
    import ctypes
    from ctypes import wintypes


# ==================== 网络 / 代理（镜像源）配置 ====================
# 国内直连 npm 官方源（registry.npmjs.org）经常超时，会导致 npm install 长时间卡住。
# 这里默认改用国内可用的 npm 镜像源作为「代理加速」，可通过环境变量覆盖：
#   DORM_NPM_REGISTRY       自定义 npm 镜像地址（默认 https://registry.npmmirror.com）
#   HTTP_PROXY / HTTPS_PROXY 本机若有代理，设置后脚本与 npm 会自动透传使用
NPM_REGISTRY = os.environ.get("DORM_NPM_REGISTRY", "https://registry.npmmirror.com")
NPM_REGISTRY_FALLBACK = "https://registry.npmjs.org/"

# Prisma 引擎二进制镜像：prisma 默认从 binaries.prisma.sh 下载，国内经常超时
PRISMA_ENGINES_MIRROR = os.environ.get(
    "PRISMA_ENGINES_MIRROR", "https://registry.npmmirror.com/-/binary/prisma"
)


def build_env():
    """构造子进程环境变量：让 npm / npx / prisma 都走可用的镜像源（代理加速）"""
    env = os.environ.copy()
    # npm 会读取 npm_config_* 形式的环境变量作为配置
    env["npm_config_registry"] = NPM_REGISTRY
    env["npm_config_fetch_timeout"] = "60000"   # 单次请求超时 60s，避免无限等待
    env["npm_config_fetch_retries"] = "3"       # 失败重试 3 次
    env["PRISMA_ENGINES_MIRROR"] = PRISMA_ENGINES_MIRROR
    env.setdefault("NEXT_TELEMETRY_DISABLED", "1")
    return env


def npm_install_command(*packages):
    """统一构造带镜像源与健壮性参数的 npm install 命令"""
    parts = ["npm", "install"]
    parts.extend(packages)
    parts.append(f"--registry={NPM_REGISTRY}")
    parts.append("--no-audit")
    parts.append("--no-fund")
    parts.append("--fetch-timeout=60000")
    parts.append("--fetch-retries=3")
    return " ".join(parts)


def _ping(url, timeout=8):
    """探测一个 URL 是否可访问（自动遵循 HTTP_PROXY/HTTPS_PROXY 环境变量）"""
    try:
        req = urllib.request.Request(url, method="GET")
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status == 200
    except Exception:
        return False


def check_registry():
    """检测 npm 镜像源（代理）是否可用，不可用则自动回退到官方源"""
    global NPM_REGISTRY

    Colors.info("正在检查 npm 镜像源（网络代理加速）...")
    Colors.info(f"当前源: {NPM_REGISTRY}")

    if _ping(NPM_REGISTRY.rstrip("/") + "/-/ping"):
        Colors.success(f"镜像源可用: {NPM_REGISTRY}")
        return True

    Colors.warning(f"镜像源不可用，尝试回退官方源: {NPM_REGISTRY_FALLBACK}")
    if _ping(NPM_REGISTRY_FALLBACK.rstrip("/") + "/-/ping"):
        NPM_REGISTRY = NPM_REGISTRY_FALLBACK
        Colors.success(f"官方源可用: {NPM_REGISTRY}")
        return True

    Colors.warning("未检测到可用的 npm 源，仍按当前配置继续（可能较慢，请耐心等待）")
    return True


def _tail_file(path, n=15):
    """读取文件最后 n 行"""
    try:
        with open(path, "r", encoding="utf-8", errors="replace") as fh:
            lines = fh.readlines()
        return lines[-n:]
    except Exception:
        return []


def run_npm_install(cmd, label="安装依赖"):
    """执行 npm install：输出写入临时日志并周期性打印心跳。

    这样可以避免长时间无输出看起来像「卡死」，完成后打印日志尾部便于定位问题。
    """
    env = build_env()
    log_path = os.path.join(tempfile.gettempdir(), "dorm_npm_install.log")

    Colors.info(f"执行命令: {cmd}")
    Colors.info("（首次安装或网络较慢时耗时较长，持续心跳表示仍在进行）")

    try:
        with open(log_path, "w", encoding="utf-8", errors="replace") as fh:
            process = subprocess.Popen(
                cmd,
                shell=True,
                stdout=fh,
                stderr=subprocess.STDOUT,
                env=env,
            )

            start = time.time()
            last_tick = start
            while process.poll() is None:
                time.sleep(1)
                now = time.time()
                if now - last_tick >= 10:
                    last_tick = now
                    print(f"    [..] {label}进行中，已用时 {int(now - start)}s", flush=True)

            elapsed = int(time.time() - start)
    except Exception as e:
        Colors.error(f"执行 {label} 时出错: {e}")
        return None

    tail = _tail_file(log_path, 15)
    if tail:
        print("-" * 50)
        for line in tail:
            print(f"    {line.rstrip()}")
        print("-" * 50)

    return types.SimpleNamespace(returncode=process.returncode, stdout="", elapsed=elapsed)


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


def run_command(cmd, check=True, shell=True, env=None):
    """运行 shell 命令（默认带镜像源环境变量）"""
    if env is None:
        env = build_env()
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
            errors=errors,
            env=env
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

    result = run_npm_install(npm_install_command(*missing), label="安装缺失依赖")
    if result is None or result.returncode != 0:
        Colors.error("安装缺失包失败")
        return False

    Colors.success("缺失依赖包安装完成")
    return True


def dependencies_up_to_date():
    """判断依赖是否已经是最新，无需再执行 npm install。

    注意：不能拿 package.json 与 node_modules「目录」的时间戳比较。
    npm install 在依赖已是最新时（up to date）不会改动 node_modules 目录本身，
    该目录的 mtime 会一直停在很久以前，导致每次启动都误判为「有更新」。
    这里改用 npm 每次安装后都会更新的 node_modules/.package-lock.json 作为基准。
    """
    stamp = os.path.join("node_modules", ".package-lock.json")
    if not os.path.exists(stamp):
        # 没有安装痕迹（例如由 pnpm 管理），保守起见执行一次同步
        return False

    stamp_time = os.path.getmtime(stamp)
    # 2 秒容差：容忍 npm 写 package-lock.json 与 .package-lock.json 的先后微差
    tolerance = 2.0
    for f in ("package.json", "package-lock.json"):
        if os.path.exists(f) and os.path.getmtime(f) > stamp_time + tolerance:
            return False
    return True


def install_dependencies():
    """检查并安装依赖"""
    Colors.info("正在检查依赖...")

    if not os.path.exists("node_modules"):
        Colors.warning("未找到 node_modules，正在安装依赖...")
        Colors.info("这可能需要几分钟，请稍候...")

        result = run_npm_install(npm_install_command(), label="安装依赖")
        if result is None or result.returncode != 0:
            Colors.error("依赖安装失败")
            return False

        Colors.success("依赖安装成功")
        return True

    if not dependencies_up_to_date():
        Colors.warning("package.json / package-lock.json 有更新，正在同步依赖...")
        result = run_npm_install(npm_install_command(), label="同步依赖")
        if result is None or result.returncode != 0:
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
    dev_env = build_env()
    if sys.platform == "win32":
        # Windows: 使用 npm run dev
        process = subprocess.Popen(
            "npm run dev",
            shell=True,
            creationflags=subprocess.CREATE_NEW_PROCESS_GROUP,
            env=dev_env
        )
    else:
        # Unix: 使用 npm run dev
        process = subprocess.Popen(
            "npm run dev",
            shell=True,
            env=dev_env
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
    check_registry()
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