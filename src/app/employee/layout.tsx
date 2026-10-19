'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  HomeIcon,
  UserIcon,
  CurrencyDollarIcon,
  WrenchScrewdriverIcon,
  DocumentTextIcon,
  BellIcon,
  BuildingOfficeIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';

const navItems = [
  { href: '/employee', label: '首页', icon: HomeIcon },
  { href: '/employee/profile', label: '个人信息', icon: UserIcon },
  { href: '/employee/bills', label: '我的账单', icon: CurrencyDollarIcon },
  { href: '/employee/maintenance', label: '报修', icon: WrenchScrewdriverIcon },
  { href: '/employee/applications', label: '申请', icon: DocumentTextIcon },
  { href: '/employee/announcements', label: '通知', icon: BellIcon },
];

function NavTab({ href, label, icon: Icon, isActive = false }: { 
  href: string; 
  label: string; 
  icon: React.ElementType;
  isActive?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all duration-200
        ${isActive 
          ? 'border-blue-600 text-blue-600' 
          : 'border-transparent text-slate-600 hover:text-blue-600 hover:border-blue-300'
        }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </Link>
  );
}

export default function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="h-full max-w-6xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BuildingOfficeIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">宿舍管理系统</h1>
              <p className="text-xs text-slate-500">员工端</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">张</span>
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-slate-900">张三</p>
                <p className="text-xs text-slate-500">研发部</p>
              </div>
            </div>
            <button 
              onClick={() => signOut({ callbackUrl: '/' })}
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="退出登录"
            >
              <ArrowRightOnRectangleIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>
      
      <nav className="bg-white border-b border-slate-200 sticky top-16 z-40">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex -mb-px overflow-x-auto">
            {navItems.map((item) => (
              <NavTab 
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                isActive={pathname === item.href}
              />
            ))}
          </div>
        </div>
      </nav>
      
      <main className="max-w-6xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}
