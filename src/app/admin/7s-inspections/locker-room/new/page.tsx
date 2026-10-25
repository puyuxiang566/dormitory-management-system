'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { Button, Card, Input } from '@/components/ui';
import { useToastHelpers } from '@/components/ui';
import { post } from '@/lib/api';
import { useFactories } from '@/hooks/useFactories';

export default function NewLockerRoomInspectionPage() {
  const router = useRouter();
  const toast = useToastHelpers();
  const [loading, setLoading] = useState(false);
  const { activeFactories } = useFactories();

  const [formData, setFormData] = useState({
    inspectionDate: new Date().toISOString().split('T')[0],
    factory: 'imcn',
    department: '',
    personName: '',
    violationDesc: '',
    inspector: '',
    notes: '',
  });

  useEffect(() => {
    if (activeFactories.length === 0) return;
    if (!activeFactories.some((factory) => factory.code === formData.factory)) {
      setFormData((prev) => ({ ...prev, factory: activeFactories[0].code }));
    }
  }, [activeFactories, formData.factory]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const validateForm = (): boolean => {
    const requiredFields = [
      { field: 'inspectionDate', label: '检查日期' },
      { field: 'factory', label: '所属工厂' },
      { field: 'department', label: '所属部门' },
      { field: 'personName', label: '员工姓名' },
      { field: 'violationDesc', label: '不合格项描述' },
      { field: 'inspector', label: '检查人员' },
    ];

    for (const { field, label } of requiredFields) {
      if (!formData[field as keyof typeof formData]?.trim()) {
        toast.warning('请填写必填项', `${label}不能为空`);
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      await post('/api/7s-inspections', {
        inspectionDate: new Date(formData.inspectionDate).toISOString(),
        roomNumber: '更衣室', // 标记为更衣室
        factory: formData.factory,
        department: formData.department.trim(),
        personName: formData.personName.trim(),
        categoryId: null,
        violationDesc: formData.violationDesc.trim(),
        action: null,
        inspector: formData.inspector.trim(),
        notes: formData.notes.trim() || null,
      });

      toast.success('创建成功', '更衣室检查记录已创建');
      router.push('/admin/7s-inspections');
    } catch (error: any) {
      toast.error('创建失败', error.message || '请检查输入信息');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center gap-4">
        <Link href="/admin/7s-inspections">
          <Button variant="ghost" size="sm">
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            返回
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-blue-900">更衣室检查登记</h1>
          <p className="text-sm text-slate-500 mt-1">录入更衣室7S检查记录</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 基本信息 */}
          <Card>
            <h3 className="text-lg font-medium text-blue-900 mb-4">基本信息</h3>
            <div className="space-y-4">
              <Input
                label="检查日期 *"
                name="inspectionDate"
                type="date"
                value={formData.inspectionDate}
                onChange={handleChange}
                required
              />

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  所属工厂 *
                </label>
                <select
                  name="factory"
                  value={formData.factory}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none bg-white h-11"
                  required
                >
                  {activeFactories.map((factory) => (
                    <option key={factory.id} value={factory.code}>{factory.name}</option>
                  ))}
                </select>
              </div>

              <Input
                label="所属部门 *"
                name="department"
                value={formData.department}
                onChange={handleChange}
                placeholder="请输入部门名称"
                required
              />

              <Input
                label="员工姓名 *"
                name="personName"
                value={formData.personName}
                onChange={handleChange}
                placeholder="请输入员工姓名"
                required
              />
            </div>
          </Card>

          {/* 检查信息 */}
          <Card>
            <h3 className="text-lg font-medium text-blue-900 mb-4">检查信息</h3>
            <div className="space-y-4">
              <Input
                label="检查人员 *"
                name="inspector"
                value={formData.inspector}
                onChange={handleChange}
                placeholder="请输入检查人员姓名"
                required
              />
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  不合格项描述 *
                </label>
                <textarea
                  name="violationDesc"
                  value={formData.violationDesc}
                  onChange={handleChange}
                  placeholder="请详细描述不合格项的具体情况"
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none bg-white resize-none text-sm text-slate-900 placeholder-slate-400"
                  required
                />
              </div>
            </div>
          </Card>

          {/* 备注 */}
          <Card className="md:col-span-2">
            <h3 className="text-lg font-medium text-blue-900 mb-4">备注</h3>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                其他备注信息
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="请输入其他备注信息（可选）"
                rows={3}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none bg-white resize-none text-sm text-slate-900 placeholder-slate-400"
              />
            </div>
          </Card>
        </div>

        {/* 操作按钮 */}
        <div className="flex justify-end gap-3 mt-6">
          <Link href="/admin/7s-inspections">
            <Button variant="ghost" type="button">
              取消
            </Button>
          </Link>
          <Button variant="primary" type="submit" loading={loading}>
            创建
          </Button>
        </div>
      </form>
    </div>
  );
}
