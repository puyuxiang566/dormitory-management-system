'use client';

import React, { useState, useEffect } from 'react';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  TagIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { Button, Card, Input, Badge, Modal, ConfirmModal, FormModal, useToastHelpers } from '@/components/ui';

// 分类数据类型
interface ViolationCategory {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// 表单数据类型
interface CategoryFormData {
  name: string;
  description: string;
  isActive: boolean;
}

export default function ViolationCategoriesPage() {
  const [categories, setCategories] = useState<ViolationCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingCategory, setEditingCategory] = useState<ViolationCategory | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<ViolationCategory | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    description: '',
    isActive: true,
  });
  const [formErrors, setFormErrors] = useState<Partial<CategoryFormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toast = useToastHelpers();

  // 获取分类列表
  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/7s-categories');
      if (!res.ok) throw new Error('获取分类列表失败');
      const data = await res.json();
      // 按排序值排序
      const sortedData = (data.data || []).sort((a: ViolationCategory, b: ViolationCategory) => 
        a.sortOrder - b.sortOrder
      );
      setCategories(sortedData);
    } catch (error) {
      toast.error('错误', '获取分类列表失败');
      console.error('获取分类列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // 过滤分类列表
  const filteredCategories = categories.filter(
    (cat) =>
      cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (cat.description && cat.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // 打开新增对话框
  const handleAdd = () => {
    setEditingCategory(null);
    setFormData({ name: '', description: '', isActive: true });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // 打开编辑对话框
  const handleEdit = (category: ViolationCategory) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      isActive: category.isActive,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // 验证表单
  const validateForm = (): boolean => {
    const errors: Partial<CategoryFormData> = {};
    if (!formData.name.trim()) {
      errors.name = '请输入分类名称';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // 保存分类（新增或编辑）
  const handleSave = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      let res;
      if (editingCategory) {
        // 编辑模式
        res = await fetch(`/api/7s-categories/${editingCategory.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
      } else {
        // 新增模式
        res = await fetch('/api/7s-categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
      }

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || '操作失败');
      }

      toast.success('成功', editingCategory ? '分类更新成功' : '分类创建成功');
      setIsModalOpen(false);
      fetchCategories();
    } catch (error) {
      toast.error('错误', error instanceof Error ? error.message : '操作失败');
      console.error('保存分类失败:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 删除分类
  const handleDelete = async () => {
    if (!deletingCategory) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/7s-categories/${deletingCategory.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || '删除失败');
      }

      toast.success('成功', '分类已删除');
      setDeletingCategory(null);
      fetchCategories();
    } catch (error) {
      toast.error('错误', error instanceof Error ? error.message : '删除失败');
      console.error('删除分类失败:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 切换状态
  const handleToggleStatus = async (category: ViolationCategory) => {
    try {
      const res = await fetch(`/api/7s-categories/${category.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !category.isActive }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || '状态切换失败');
      }

      toast.success('成功', `分类已${!category.isActive ? '启用' : '停用'}`);
      fetchCategories();
    } catch (error) {
      toast.error('错误', error instanceof Error ? error.message : '状态切换失败');
      console.error('状态切换失败:', error);
    }
  };

  // 移动排序
  const handleMove = async (category: ViolationCategory, direction: 'up' | 'down') => {
    const currentIndex = categories.findIndex((c) => c.id === category.id);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const targetCategory = categories[targetIndex];

    try {
      // 交换排序值
      const res = await fetch(`/api/7s-categories/${category.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sortOrder: targetCategory.sortOrder }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || '排序调整失败');
      }

      toast.success('成功', '排序调整成功');
      fetchCategories();
    } catch (error) {
      toast.error('错误', error instanceof Error ? error.message : '排序调整失败');
      console.error('排序调整失败:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-blue-900 flex items-center gap-3">
            <TagIcon className="w-7 h-7 text-blue-600" />
            7S违规分类管理
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            管理7S检查中的违规项目分类，用于检查记录和统计分析
          </p>
        </div>
        <Button onClick={handleAdd}>
          <PlusIcon className="w-5 h-5 mr-2" />
          新增分类
        </Button>
      </div>

      {/* 搜索栏 */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="搜索分类名称或描述..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-sm"
            />
          </div>
          <div className="text-sm text-slate-500">
            共 <span className="font-medium text-slate-700">{filteredCategories.length}</span> 个分类
          </div>
        </div>
      </Card>

      {/* 分类列表 */}
      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-slate-500">加载中...</span>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="text-center py-12">
            <TagIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">暂无分类数据</p>
            <p className="text-sm text-slate-400 mt-1">
              {searchQuery ? '请调整搜索条件' : '点击上方按钮新增分类'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-16">
                    排序
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    分类名称
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    描述
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider w-24">
                    状态
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider w-40">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCategories.map((category, index) => (
                  <tr
                    key={category.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 text-sm font-medium text-slate-600">
                        {index + 1}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{category.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-600 max-w-md truncate">
                        {category.description || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleToggleStatus(category)}
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          category.isActive
                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {category.isActive ? '启用' : '停用'}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-1">
                        {/* 上移按钮 */}
                        <button
                          onClick={() => handleMove(category, 'up')}
                          disabled={index === 0}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          title="上移"
                        >
                          <ArrowUpIcon className="w-4 h-4" />
                        </button>
                        {/* 下移按钮 */}
                        <button
                          onClick={() => handleMove(category, 'down')}
                          disabled={index === filteredCategories.length - 1}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          title="下移"
                        >
                          <ArrowDownIcon className="w-4 h-4" />
                        </button>
                        {/* 编辑按钮 */}
                        <button
                          onClick={() => handleEdit(category)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                          title="编辑"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        {/* 删除按钮 */}
                        <button
                          onClick={() => setDeletingCategory(category)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="删除"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* 新增/编辑对话框 */}
      <FormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSave}
        title={editingCategory ? '编辑分类' : '新增分类'}
        size="md"
        loading={isSubmitting}
      >
        <div className="space-y-4">
          <Input
            label="分类名称"
            placeholder="请输入分类名称，如：卫生问题"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            error={formErrors.name}
            required
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              分类描述
            </label>
            <textarea
              placeholder="请输入分类描述（可选）"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none resize-none"
            />
          </div>
          <div className="flex items-center justify-between py-2 border-t border-slate-100 mt-4">
            <span className="text-sm font-medium text-slate-700">启用状态</span>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                formData.isActive ? 'bg-amber-500' : 'bg-slate-200'
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  formData.isActive ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          <p className="text-xs text-slate-500">
            {formData.isActive ? '分类将显示在检查记录中使用' : '分类将被隐藏，不再显示'}
          </p>
        </div>
      </FormModal>

      {/* 删除确认对话框 */}
      <ConfirmModal
        isOpen={!!deletingCategory}
        onClose={() => setDeletingCategory(null)}
        onConfirm={handleDelete}
        title="确认删除"
        message={`确定要删除分类 "${deletingCategory?.name}" 吗？删除后该分类将不再可用。`}
        confirmText="删除"
        type="danger"
        loading={isSubmitting}
      />
    </div>
  );
}
