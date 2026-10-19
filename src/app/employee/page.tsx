'use client';

import Link from 'next/link';
import {
  HomeIcon,
  UserIcon,
  CurrencyDollarIcon,
  WrenchScrewdriverIcon,
  DocumentTextIcon,
  BellIcon,
  ArrowRightIcon,
  BuildingOfficeIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';

const navItems = [
  { href: '/employee', label: '首页', icon: HomeIcon },
  { href: '/employee/profile', label: '个人信息', icon: UserIcon },
  { href: '/employee/bills', label: '我的账单', icon: CurrencyDollarIcon },
  { href: '/employee/maintenance', label: '报修', icon: WrenchScrewdriverIcon },
  { href: '/employee/applications', label: '申请', icon: DocumentTextIcon },
  { href: '/employee/announcements', label: '通知', icon: BellIcon },
];

const quickActions = [
  { 
    icon: WrenchScrewdriverIcon, 
    label: '在线报修', 
    href: '/employee/maintenance/new',
    color: 'bg-blue-100 text-blue-600',
  },
  { 
    icon: BuildingOfficeIcon, 
    label: '调房申请', 
    href: '/employee/applications/transfer',
    color: 'bg-purple-100 text-purple-600',
  },
  { 
    icon: UserIcon, 
    label: '访客预约', 
    href: '/employee/visitors/new',
    color: 'bg-emerald-100 text-emerald-600',
  },
  { 
    icon: DocumentTextIcon, 
    label: '意见反馈', 
    href: '/employee/feedback',
    color: 'bg-amber-100 text-amber-600',
  },
];

const announcements = [
  {
    id: 1,
    title: '端午节放假通知',
    date: '2024-06-01',
    content: '端午节期间宿舍服务时间调整，请提前做好安排。',
    unread: true,
  },
  {
    id: 2,
    title: '5号楼电梯维护',
    date: '2024-05-28',
    content: '5号楼电梯将于本周五进行例行维护，届时请使用楼梯。',
    unread: false,
  },
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

function QuickAction({ icon: Icon, label, href, color }: { 
  icon: React.ElementType; 
  label: string; 
  href: string;
  color: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center justify-center p-5 rounded-xl bg-slate-50 hover:bg-slate-100 
                 transition-all duration-200 hover:-translate-y-0.5 cursor-pointer group"
    >
      <div className={`p-3 rounded-full ${color} mb-3 transition-transform duration-200 group-hover:scale-110`}>
        <Icon className="w-6 h-6" />
      </div>
      <span className="text-sm font-medium text-slate-700">{label}</span>
    </Link>
  );
}

export default function EmployeeDashboard() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900 mb-1">欢迎回来，张三 👋</h1>
        <p className="text-slate-500">今天是 {new Date().toLocaleDateString('zh-CN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card className="hover:shadow-lg transition-shadow duration-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-500 mb-1">我的宿舍</p>
              <p className="text-xl font-semibold text-slate-900">3号楼 201室</p>
              <p className="text-sm text-slate-500 mt-2">入住日期: 2024-01-15</p>
            </div>
            <div className="p-2 bg-blue-100 rounded-lg">
              <BuildingOfficeIcon className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="hover:shadow-lg transition-shadow duration-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-500 mb-1">本月账单</p>
              <p className="text-xl font-semibold text-amber-600">¥256.00</p>
              <p className="text-sm text-slate-500 mt-2">电费 ¥180 · 水费 ¥76</p>
            </div>
            <div className="p-2 bg-amber-100 rounded-lg">
              <CurrencyDollarIcon className="w-5 h-5 text-amber-600" />
            </div>
          </div>
          <Link 
            href="/employee/bills"
            className="mt-4 flex items-center text-sm text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
          >
            立即缴费 <ArrowRightIcon className="w-4 h-4 ml-1" />
          </Link>
        </Card>

        <Card className="hover:shadow-lg transition-shadow duration-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-500 mb-1">待办事项</p>
              <p className="text-xl font-semibold text-slate-900">2</p>
              <p className="text-sm text-slate-500 mt-2">1条通知 · 1个报修处理中</p>
            </div>
            <div className="p-2 bg-purple-100 rounded-lg">
              <ClockIcon className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <Link 
            href="/employee/maintenance"
            className="mt-4 flex items-center text-sm text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
          >
            查看详情 <ArrowRightIcon className="w-4 h-4 ml-1" />
          </Link>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-slate-900">快捷服务</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {quickActions.map((action) => (
              <QuickAction key={action.label} {...action} />
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-slate-900">最新通知</h2>
            <Link 
              href="/employee/announcements" 
              className="text-sm text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
            >
              查看全部
            </Link>
          </div>
          <div className="space-y-4">
            {announcements.map((item) => (
              <div 
                key={item.id} 
                className="p-4 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors duration-200 cursor-pointer"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-slate-900">{item.title}</h3>
                    {item.unread && (
                      <Badge variant="info">新</Badge>
                    )}
                  </div>
                  <span className="text-sm text-slate-500">{item.date}</span>
                </div>
                <p className="text-sm text-slate-600 line-clamp-2">{item.content}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
