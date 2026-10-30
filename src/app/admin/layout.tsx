'use client';

import React, { useState, useEffect } from 'react';
import {
  HomeIcon,
  UsersIcon,
  BuildingOfficeIcon,
  ShieldCheckIcon,
  CurrencyYenIcon,
  WrenchIcon,
  UserGroupIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  ArrowRightOnRectangleIcon,
  ClipboardDocumentCheckIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';

const defaultMenuConfig = {
  dashboard: { label: '仪表盘', enabled: true },
  persons: { label: '人员档案', enabled: true },
  dorms: { label: '宿舍资源', enabled: true },
  lockers: { label: '更衣柜管理', enabled: true },
  fees: { label: '费用管理', enabled: true },
  maintenance: { label: '报修维护', enabled: true },
  access: { label: '门禁管理', enabled: true },
  applications: { label: '申请管理', enabled: true },
  visitors: { label: '访客管理', enabled: true },
  reports: { label: '报表分析', enabled: true },
  inspections7s: { label: '7S检查记录', enabled: true },
};

interface SidebarItemProps {
  href: string;
  icon: React.ElementType;
  label: string;
  disabled?: boolean;
}

function SidebarItem({ href, icon: Icon, label, disabled }: SidebarItemProps) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(`${href}/`);

  if (disabled) {
    return null;
  }

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
        isActive
          ? 'bg-blue-50 text-blue-700'
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
      }`}
    >
      <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
      <span className="font-medium">{label}</span>
    </Link>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status: sessionStatus } = useSession();
  const [menuConfig, setMenuConfig] = useState(defaultMenuConfig);
  const [menuLoading, setMenuLoading] = useState(true);

  useEffect(() => {
    const fetchMenuConfig = async () => {
      try {
        const res = await fetch('/api/settings?category=menu');
        const data = await res.json();
        if (data.menu) {
          setMenuConfig({ ...defaultMenuConfig, ...data.menu });
        }
      } catch (error) {
        console.error('Error fetching menu config:', error);
      } finally {
        setMenuLoading(false);
      }
    };
    fetchMenuConfig();
  }, []);

  // 会话加载中
  if (sessionStatus === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          加载中...
        </div>
      </div>
    );
  }

  // 未认证：重定向到登录页
  if (sessionStatus === 'unauthenticated' || !session) {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          跳转中...
        </div>
      </div>
    );
  }

  // 菜单配置加载中
  if (menuLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          加载中...
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex">
        {/* 侧边栏 */}
        <aside className="w-64 bg-white shadow-sm min-h-screen fixed left-0 top-0 z-10">
          <div className="p-6 border-b border-slate-100">
            <h1 className="text-xl font-bold text-blue-900">宿舍管理系统</h1>
            <p className="text-sm text-slate-500">管理后台</p>
          </div>
          <nav className="p-4 space-y-1">
            <SidebarItem href="/admin" icon={HomeIcon} label="仪表盘" disabled={!menuConfig.dashboard?.enabled} />
            <SidebarItem href="/admin/persons" icon={UsersIcon} label="人员档案" disabled={!menuConfig.persons?.enabled} />
            <SidebarItem href="/admin/dorms" icon={BuildingOfficeIcon} label="宿舍资源" disabled={!menuConfig.dorms?.enabled} />
            <SidebarItem href="/admin/lockers" icon={LockClosedIcon} label="更衣柜管理" disabled={!menuConfig.lockers?.enabled} />
            <SidebarItem href="/admin/fees" icon={CurrencyYenIcon} label="费用管理" disabled={!menuConfig.fees?.enabled} />
            <SidebarItem href="/admin/maintenance" icon={WrenchIcon} label="报修维护" disabled={!menuConfig.maintenance?.enabled} />
            <SidebarItem href="/admin/access" icon={ShieldCheckIcon} label="门禁管理" disabled={!menuConfig.access?.enabled} />
            <SidebarItem href="/admin/applications" icon={DocumentTextIcon} label="申请管理" disabled={!menuConfig.applications?.enabled} />
            <SidebarItem href="/admin/visitors" icon={UserGroupIcon} label="访客管理" disabled={!menuConfig.visitors?.enabled} />
            <SidebarItem href="/admin/reports" icon={ChartBarIcon} label="报表分析" disabled={!menuConfig.reports?.enabled} />
            <SidebarItem href="/admin/7s-inspections" icon={ClipboardDocumentCheckIcon} label="7S检查记录" disabled={!menuConfig.inspections7s?.enabled} />
            <SidebarItem href="/admin/settings" icon={Cog6ToothIcon} label="系统设置" />
          </nav>
          
          {/* 底部用户信息和退出 */}
          <div className="absolute bottom-0 left-0 right-0 border-t border-slate-100">
            {session?.user && (
              <div className="px-4 py-3 bg-slate-50">
                <p className="text-xs text-slate-500">当前登录</p>
                <p className="text-sm font-medium text-slate-900">{session.user.username}</p>
              </div>
            )}
            <div className="p-4">
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors w-full"
              >
                <ArrowRightOnRectangleIcon className="w-5 h-5 text-slate-400" />
                <span className="font-medium">退出登录</span>
              </button>
            </div>
          </div>
        </aside>

        {/* 主内容区 */}
        <main className="flex-1 ml-64 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
