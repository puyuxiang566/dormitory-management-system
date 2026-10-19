'use client';

import React, { useState, useEffect } from 'react';
import {
  Cog6ToothIcon,
  CreditCardIcon,
  CheckIcon,
  ChevronRightIcon,
  CloudArrowUpIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  KeyIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline';
import { Button, Card, Badge, Input } from '@/components/ui';
import UserManagement from '@/components/ui/UserManagement';

// 设置菜单项
interface SettingMenu {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
}

const menuItems: SettingMenu[] = [
  {
    id: 'general',
    label: '基本设置',
    description: '系统名称、Logo、联系方式等基础信息',
    icon: Cog6ToothIcon,
  },
  {
    id: 'password',
    label: '修改密码',
    description: '修改当前账号的登录密码',
    icon: KeyIcon,
  },
  {
    id: 'users',
    label: '用户管理',
    description: '管理系统登录账号、添加删除用户',
    icon: UserGroupIcon,
  },
  {
    id: 'fees',
    label: '费用设置',
    description: '水电单价、押金标准、结算周期',
    icon: CreditCardIcon,
  },
  {
    id: 'menu',
    label: '菜单设置',
    description: '配置侧边栏菜单的显示与隐藏',
    icon: EyeIcon,
  },
];

// 侧边栏菜单配置
const defaultMenuConfig = {
  dashboard: { label: '仪表盘', enabled: true },
  persons: { label: '人员档案', enabled: true },
  dorms: { label: '宿舍资源', enabled: true },
  fees: { label: '费用管理', enabled: true },
  maintenance: { label: '报修维护', enabled: true },
  access: { label: '门禁管理', enabled: true },
  applications: { label: '申请管理', enabled: true },
  visitors: { label: '访客管理', enabled: true },
  reports: { label: '报表统计', enabled: true },
  inspections7s: { label: '7S检查记录', enabled: true },
};

// 基本设置表单
const GeneralSettings = () => {
  const [formData, setFormData] = useState({
    systemName: '宿舍管理系统',
    companyName: '',
    contactPhone: '',
    contactEmail: '',
    address: '',
  });
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings?category=general');
        const data = await res.json();
        if (data.general) {
          setFormData({
            systemName: data.general.systemName || '宿舍管理系统',
            companyName: data.general.companyName || '',
            contactPhone: data.general.contactPhone || '',
            contactEmail: data.general.contactEmail || '',
            address: data.general.address || '',
          });
        }
      } catch (error) {
        console.error('Error loading general settings:', error);
      } finally {
        setInitLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: 'general',
          settings: formData,
        }),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: '基本设置保存成功' });
      } else {
        setMessage({ type: 'error', text: '保存失败' });
      }
    } catch {
      setMessage({ type: 'error', text: '请求失败，请稍后重试' });
    } finally {
      setLoading(false);
    }
  };

  if (initLoading) {
    return <div className="text-center py-8 text-slate-500">加载中...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">系统名称</label>
          <Input
            value={formData.systemName}
            onChange={(e) => setFormData({ ...formData, systemName: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">公司名称</label>
          <Input
            value={formData.companyName}
            onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">联系电话</label>
          <Input
            value={formData.contactPhone}
            onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">联系邮箱</label>
          <Input
            type="email"
            value={formData.contactEmail}
            onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium text-slate-700">公司地址</label>
          <Input
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />
        </div>
      </div>

      {/* Logo 上传 */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">系统 Logo</label>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 bg-slate-100 rounded-lg flex items-center justify-center border border-dashed border-slate-300">
            <span className="text-xs text-slate-400">Logo</span>
          </div>
          <div>
            <Button variant="outline" size="sm">
              <CloudArrowUpIcon className="w-4 h-4 mr-2" />
              上传 Logo
            </Button>
            <p className="text-xs text-slate-400 mt-2">建议尺寸 200x200px，支持 PNG、JPG 格式</p>
          </div>
        </div>
      </div>

      {message && (
        <div className={`p-3 rounded-lg ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={loading}>
          {loading ? '保存中...' : '保存设置'}
        </Button>
      </div>
    </div>
  );
};

// 修改密码表单
const PasswordSettings = () => {
  const [formData, setFormData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: data.message || '密码修改成功' });
        setFormData({ oldPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        setMessage({ type: 'error', text: data.error || '修改失败' });
      }
    } catch {
      setMessage({ type: 'error', text: '请求失败，请稍后重试' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700">原密码</label>
            <Input
              type="password"
              value={formData.oldPassword}
              onChange={(e) => setFormData({ ...formData, oldPassword: e.target.value })}
              placeholder="请输入原密码"
              className="mt-1"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">新密码</label>
            <Input
              type="password"
              value={formData.newPassword}
              onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
              placeholder="请输入新密码（至少6位）"
              className="mt-1"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">确认密码</label>
            <Input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              placeholder="请再次输入新密码"
              className="mt-1"
              required
            />
          </div>
        </div>

        {message && (
          <div className={`mt-4 p-3 rounded-lg ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
            {message.text}
          </div>
        )}

        <div className="mt-6">
          <Button type="submit" disabled={loading}>
            {loading ? '提交中...' : '修改密码'}
          </Button>
        </div>
      </form>
    </div>
  );
};

// 菜单设置表单
const MenuSettings = () => {
  const [menuConfig, setMenuConfig] = useState(defaultMenuConfig);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
      }
    };
    fetchMenuConfig();
  }, []);

  const handleToggle = async (key: string) => {
    const newConfig = {
      ...menuConfig,
      [key]: { ...menuConfig[key as keyof typeof menuConfig], enabled: !menuConfig[key as keyof typeof menuConfig].enabled }
    };
    setMenuConfig(newConfig);
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: 'menu', settings: menuConfig }),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: '菜单设置保存成功' });
      } else {
        setMessage({ type: 'error', text: '保存失败' });
      }
    } catch {
      setMessage({ type: 'error', text: '保存失败' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <div className="grid grid-cols-5 gap-4">
          {Object.entries(menuConfig).map(([key, config]) => (
            <div key={key} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
              <span className="font-medium text-slate-700">{config.label}</span>
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={() => handleToggle(key)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
            </div>
          ))}
        </div>
      </Card>

      {message && (
        <div className={`p-3 rounded-lg ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <Button onClick={handleSave} disabled={loading}>
        {loading ? '保存中...' : '保存设置'}
      </Button>
    </div>
  );
};

// 费用设置表单
const FeeSettings = () => {
  const [settings, setSettings] = useState({
    electricityPrice: '0.65',
    hotWaterPrice: '30.00',
    coldWaterPrice: '4.00',
    depositAmount: '500',
    rentCycle: 'month',
  });
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings?category=fees');
        const data = await res.json();
        
        if (data.fees) {
          setSettings({
            electricityPrice: String(data.fees.electricityPrice ?? '0.65'),
            hotWaterPrice: String(data.fees.hotWaterPrice ?? '30.00'),
            coldWaterPrice: String(data.fees.coldWaterPrice ?? '4.00'),
            depositAmount: String(data.fees.depositAmount ?? '500'),
            rentCycle: data.fees.rentCycle ?? 'month',
          });
        }
      } catch (error) {
        console.error('Error loading fee settings:', error);
      } finally {
        setInitLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: 'fees',
          settings: {
            electricityPrice: parseFloat(settings.electricityPrice) || 0,
            hotWaterPrice: parseFloat(settings.hotWaterPrice) || 0,
            coldWaterPrice: parseFloat(settings.coldWaterPrice) || 0,
            depositAmount: parseFloat(settings.depositAmount) || 0,
            rentCycle: settings.rentCycle,
          },
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: '费用设置保存成功' });
      } else {
        setMessage({ type: 'error', text: data.error || '保存失败' });
      }
    } catch {
      setMessage({ type: 'error', text: '请求失败，请稍后重试' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">电费单价 (元/度)</label>
          <div className="relative">
            <Input
              type="number"
              step="0.01"
              value={settings.electricityPrice}
              onChange={(e) => setSettings({ ...settings, electricityPrice: e.target.value })}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">元/度</span>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">热水单价 (元/吨)</label>
          <div className="relative">
            <Input
              type="number"
              step="0.01"
              value={settings.hotWaterPrice}
              onChange={(e) => setSettings({ ...settings, hotWaterPrice: e.target.value })}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">元/吨</span>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">冷水单价 (元/吨)</label>
          <div className="relative">
            <Input
              type="number"
              step="0.01"
              value={settings.coldWaterPrice}
              onChange={(e) => setSettings({ ...settings, coldWaterPrice: e.target.value })}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">元/吨</span>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">住宿押金标准</label>
          <div className="relative">
            <Input
              type="number"
              value={settings.depositAmount}
              onChange={(e) => setSettings({ ...settings, depositAmount: e.target.value })}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">元/人</span>
          </div>
        </div>
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium text-slate-700">收费周期</label>
          <select
            value={settings.rentCycle}
            onChange={(e) => setSettings({ ...settings, rentCycle: e.target.value })}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none bg-white"
          >
            <option value="month">按月</option>
            <option value="quarter">按季度</option>
            <option value="year">按年</option>
          </select>
        </div>
      </div>

      {message && (
        <div className={`p-3 rounded-lg ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <Card className="bg-amber-50 border-amber-200">
        <div className="flex items-start gap-3">
          <ExclamationTriangleIcon className="w-5 h-5 text-amber-500 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">注意事项</p>
            <p className="text-sm text-amber-700 mt-1">
              修改费用设置后，将从下一个结算周期开始生效，已生成的账单不会受到影响。
            </p>
          </div>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={loading}>
          {loading ? '保存中...' : '保存设置'}
        </Button>
      </div>
    </div>
  );
};

// 通知设置表单
const NotificationSettings = () => {
  const [settings, setSettings] = useState({
    emailEnabled: true,
    smsEnabled: true,
    appEnabled: true,
    feeReminder: true,
    accessReminder: true,
    maintenanceReminder: true,
    applicationReminder: true,
  });

  const toggleSetting = (key: keyof typeof settings) => {
    setSettings({ ...settings, [key]: !settings[key] });
  };

  const Switch = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <button
      onClick={onChange}
      className={`relative w-11 h-6 rounded-full transition-colors ${
        checked ? 'bg-blue-500' : 'bg-slate-200'
      }`}
    >
      <span
        className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );

  return (
    <div className="space-y-6">
      {/* 通知渠道 */}
      <div>
        <h4 className="font-medium text-blue-900 mb-4">通知渠道</h4>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-slate-100">
            <div>
              <p className="font-medium text-slate-700">邮件通知</p>
              <p className="text-sm text-slate-500">通过邮件发送系统通知</p>
            </div>
            <Switch checked={settings.emailEnabled} onChange={() => toggleSetting('emailEnabled')} />
          </div>
          <div className="flex items-center justify-between py-3 border-b border-slate-100">
            <div>
              <p className="font-medium text-slate-700">短信通知</p>
              <p className="text-sm text-slate-500">通过短信发送重要提醒</p>
            </div>
            <Switch checked={settings.smsEnabled} onChange={() => toggleSetting('smsEnabled')} />
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium text-slate-700">站内消息</p>
              <p className="text-sm text-slate-500">在系统内推送消息通知</p>
            </div>
            <Switch checked={settings.appEnabled} onChange={() => toggleSetting('appEnabled')} />
          </div>
        </div>
      </div>

      {/* 通知场景 */}
      <div>
        <h4 className="font-medium text-blue-900 mb-4">通知场景</h4>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-slate-100">
            <div>
              <p className="font-medium text-slate-700">费用提醒</p>
              <p className="text-sm text-slate-500">账单生成、缴费截止提醒</p>
            </div>
            <Switch checked={settings.feeReminder} onChange={() => toggleSetting('feeReminder')} />
          </div>
          <div className="flex items-center justify-between py-3 border-b border-slate-100">
            <div>
              <p className="font-medium text-slate-700">门禁提醒</p>
              <p className="text-sm text-slate-500">异常出入、访客到访提醒</p>
            </div>
            <Switch checked={settings.accessReminder} onChange={() => toggleSetting('accessReminder')} />
          </div>
          <div className="flex items-center justify-between py-3 border-b border-slate-100">
            <div>
              <p className="font-medium text-slate-700">维修提醒</p>
              <p className="text-sm text-slate-500">工单进度、维修完成通知</p>
            </div>
            <Switch checked={settings.maintenanceReminder} onChange={() => toggleSetting('maintenanceReminder')} />
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium text-slate-700">申请提醒</p>
              <p className="text-sm text-slate-500">入住/退宿申请进度通知</p>
            </div>
            <Switch checked={settings.applicationReminder} onChange={() => toggleSetting('applicationReminder')} />
          </div>
        </div>
      </div>
    </div>
  );
};

// 安全设置表单
const SecuritySettings = () => {
  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-start justify-between">
          <div>
            <h4 className="font-medium text-blue-900 mb-1">密码策略</h4>
            <p className="text-sm text-slate-500 mb-4">设置密码强度要求和定期更换规则</p>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckIcon className="w-4 h-4 text-emerald-500" />
                <span className="text-sm text-slate-600">最少 8 位字符</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckIcon className="w-4 h-4 text-emerald-500" />
                <span className="text-sm text-slate-600">包含大小写字母</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckIcon className="w-4 h-4 text-emerald-500" />
                <span className="text-sm text-slate-600">包含数字和特殊字符</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckIcon className="w-4 h-4 text-emerald-500" />
                <span className="text-sm text-slate-600">90 天强制更换</span>
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm">修改策略</Button>
        </div>
      </Card>

      <Card>
        <div className="flex items-start justify-between">
          <div>
            <h4 className="font-medium text-blue-900 mb-1">登录安全</h4>
            <p className="text-sm text-slate-500 mb-4">配置登录保护和异常检测</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-sm text-slate-600">登录失败锁定</span>
                <Badge variant="success">已启用</Badge>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-sm text-slate-600">异地登录提醒</span>
                <Badge variant="success">已启用</Badge>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-slate-600">双因素认证</span>
                <Badge variant="warning">未启用</Badge>
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm">配置</Button>
        </div>
      </Card>

      <Card className="border-red-200">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="font-medium text-red-600 mb-1">危险操作</h4>
            <p className="text-sm text-slate-500">以下操作可能导致数据丢失，请谨慎操作</p>
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
            清除缓存
          </Button>
          <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
            重置系统
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default function SettingsPage() {
  const [activeMenu, setActiveMenu] = useState('general');

  const renderContent = () => {
    switch (activeMenu) {
      case 'general':
        return <GeneralSettings />;
      case 'password':
        return <PasswordSettings />;
      case 'users':
        return <UserManagement />;
      case 'fees':
        return <FeeSettings />;
      case 'menu':
        return <MenuSettings />;
      default:
        return (
          <div className="text-center py-12">
            <Cog6ToothIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">该功能正在开发中</p>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-semibold text-blue-900">系统设置</h1>
        <p className="text-sm text-slate-500 mt-1">管理系统配置和基础参数</p>
      </div>

      <div className="flex gap-6">
        {/* 左侧菜单 */}
        <div className="w-64 flex-shrink-0">
          <Card className="p-2">
            <div className="space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeMenu === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveMenu(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{item.label}</p>
                    </div>
                    <ChevronRightIcon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-300'}`} />
                  </button>
                );
              })}
            </div>
          </Card>
        </div>

        {/* 右侧内容 */}
        <div className="flex-1">
          <Card className="min-h-[500px]">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-blue-900">
                  {menuItems.find(m => m.id === activeMenu)?.label}
                </h2>
                <p className="text-sm text-slate-500">
                  {menuItems.find(m => m.id === activeMenu)?.description}
                </p>
              </div>
              {activeMenu !== 'password' && activeMenu !== 'users' && activeMenu !== 'fees' && activeMenu !== 'menu' && activeMenu !== 'general' && (
                <Button variant="primary">
                  <CheckIcon className="w-4 h-4 mr-2" />
                  保存设置
                </Button>
              )}
            </div>
            {renderContent()}
          </Card>
        </div>
      </div>
    </div>
  );
}
