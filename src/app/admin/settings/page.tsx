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
  BuildingOffice2Icon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { Button, Card, Badge, Input, Modal } from '@/components/ui';
import { FactoryOption, sortFactoryOptions } from '@/lib/factory-utils';
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
    id: 'factories',
    label: '工厂管理',
    description: '自定义工厂代号、名称、颜色与排序',
    icon: BuildingOffice2Icon,
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
  lockers: { label: '更衣柜管理', enabled: true },
  fees: { label: '费用管理', enabled: true },
  maintenance: { label: '报修维护', enabled: true },
  access: { label: '门禁管理', enabled: true },
  applications: { label: '申请管理', enabled: true },
  visitors: { label: '访客管理', enabled: true },
  reports: { label: '报表分析', enabled: true },
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

// 工厂设置（自定义工厂代号）
const FactorySettings = () => {
  const [factories, setFactories] = useState<FactoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFactory, setEditingFactory] = useState<FactoryOption | null>(null);
  const [deletingFactory, setDeletingFactory] = useState<FactoryOption | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    color: '#10b981',
    sortOrder: 0,
    isActive: true,
  });

  const fetchFactories = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/factories', { cache: 'no-store' });
      if (!res.ok) throw new Error('获取工厂配置失败');
      const result = await res.json();
      const list: FactoryOption[] = Array.isArray(result) ? result : result.data || [];
      setFactories(sortFactoryOptions(list));
    } catch (error) {
      console.error('Error loading factories:', error);
      setMessage({ type: 'error', text: '获取工厂配置失败' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFactories();
  }, []);

  const openCreateModal = () => {
    setEditingFactory(null);
    setFormData({
      code: '',
      name: '',
      color: '#10b981',
      sortOrder: factories.length > 0 ? Math.max(...factories.map((item) => item.sortOrder)) + 1 : 0,
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (factory: FactoryOption) => {
    setEditingFactory(factory);
    setFormData({
      code: factory.code,
      name: factory.name,
      color: factory.color,
      sortOrder: factory.sortOrder,
      isActive: factory.isActive,
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.code.trim() || !formData.name.trim()) {
      setMessage({ type: 'error', text: '工厂代号和名称不能为空' });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(
        editingFactory ? `/api/factories/${editingFactory.id}` : '/api/factories',
        {
          method: editingFactory ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        }
      );

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || '保存失败');

      setMessage({ type: 'success', text: editingFactory ? '工厂配置更新成功' : '工厂配置创建成功' });
      setIsModalOpen(false);
      await fetchFactories();
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : '保存失败' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!deletingFactory) return;

    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/factories/${deletingFactory.id}`, { method: 'DELETE' });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || '停用失败');

      setMessage({ type: 'success', text: '工厂配置已停用，历史数据保持不变' });
      setDeletingFactory(null);
      await fetchFactories();
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : '停用失败' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (factory: FactoryOption) => {
    setMessage(null);
    try {
      const res = await fetch(`/api/factories/${factory.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !factory.isActive }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || '状态切换失败');
      setMessage({ type: 'success', text: `工厂配置已${factory.isActive ? '停用' : '启用'}` });
      await fetchFactories();
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : '状态切换失败' });
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-slate-500">加载中...</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <BuildingOffice2Icon className="w-5 h-5 text-blue-500 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-800">工厂代号用于人员档案、宿舍资源、报表分析等项目</p>
            <p className="text-sm text-blue-700 mt-1">
              修改工厂代号时，系统会自动同步更新人员档案和 7S 检查记录中的历史数据；名称和颜色会立即在相关页面生效。
            </p>
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">共 {factories.length} 个工厂配置</p>
        <Button onClick={openCreateModal}>
          <PlusIcon className="w-4 h-4 mr-2" />
          新增工厂
        </Button>
      </div>

      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left text-slate-600">
              <th className="py-3 px-4 font-medium">工厂代号</th>
              <th className="py-3 px-4 font-medium">显示名称</th>
              <th className="py-3 px-4 font-medium">颜色</th>
              <th className="py-3 px-4 font-medium">排序</th>
              <th className="py-3 px-4 font-medium">状态</th>
              <th className="py-3 px-4 font-medium text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {factories.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-slate-400">暂无工厂配置</td>
              </tr>
            ) : (
              factories.map((factory) => (
                <tr key={factory.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4 font-medium text-blue-900">{factory.code}</td>
                  <td className="py-3 px-4">
                    <span
                      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: factory.color }}
                    >
                      {factory.name}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-2 text-slate-600">
                      <span className="w-4 h-4 rounded border border-slate-200" style={{ backgroundColor: factory.color }} />
                      {factory.color}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600">{factory.sortOrder}</td>
                  <td className="py-3 px-4">
                    <Badge variant={factory.isActive ? 'success' : 'warning'}>
                      {factory.isActive ? '启用' : '停用'}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditModal(factory)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                        title="编辑"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleActive(factory)}
                        className="px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded"
                      >
                        {factory.isActive ? '停用' : '启用'}
                      </button>
                      <button
                        onClick={() => setDeletingFactory(factory)}
                        className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded"
                        title="删除"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {message && (
        <div className={`p-3 rounded-lg ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingFactory ? '编辑工厂配置' : '新增工厂配置'}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} disabled={saving}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? '保存中...' : '保存'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">工厂代号 *</label>
            <Input
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              placeholder="例如 IMCN"
            />
            <p className="text-xs text-slate-400">代号用于数据关联，修改后会自动同步已有人员与检查记录</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">显示名称 *</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="例如 IMCN"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">标识颜色</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-10 h-10 rounded border border-slate-200 bg-white cursor-pointer"
                />
                <Input
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">排序</label>
              <Input
                type="number"
                value={String(formData.sortOrder)}
                onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
            />
            启用该工厂（停用后不再出现在新增/编辑下拉框中）
          </label>
        </div>
      </Modal>

      <Modal
        isOpen={!!deletingFactory}
        onClose={() => setDeletingFactory(null)}
        title="删除工厂配置"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeletingFactory(null)} disabled={saving}>
              取消
            </Button>
            <Button
              onClick={handleDeactivate}
              disabled={saving}
              className="bg-red-500 hover:bg-red-600 border-red-500 text-white"
            >
              {saving ? '处理中...' : '确认删除'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          删除后将停用工厂「{deletingFactory?.name}」，已有的人员和检查记录会保留。确认继续吗？
        </p>
      </Modal>
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
      case 'factories':
        return <FactorySettings />;
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
              {activeMenu !== 'password' && activeMenu !== 'users' && activeMenu !== 'factories' && activeMenu !== 'fees' && activeMenu !== 'menu' && activeMenu !== 'general' && (
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
