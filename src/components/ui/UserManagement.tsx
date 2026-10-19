import { useState, useEffect } from 'react';
import { Button, Card, Badge, Input, Modal } from '@/components/ui';
import { api } from '@/lib/api';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  UserCircleIcon,
  KeyIcon,
} from '@heroicons/react/24/outline';

interface User {
  id: number;
  username: string;
  role: string;
  personId: number | null;
  person?: {
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: '超级管理员',
  ADMIN: '管理员',
  EMPLOYEE: '普通员工',
};

const roleColors: Record<string, string> = {
  SUPER_ADMIN: 'bg-red-100 text-red-700',
  ADMIN: 'bg-blue-100 text-blue-700',
  EMPLOYEE: 'bg-slate-100 text-slate-700',
};

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'EMPLOYEE',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = async () => {
    try {
      const res = await api.users.list();
      if (res?.data) {
        setUsers(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSubmit = async () => {
    if (!formData.username || !formData.password) {
      setError('用户名和密码不能为空');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      if (editingUser) {
        const updateData: any = { username: formData.username, role: formData.role };
        if (formData.password) {
          updateData.password = formData.password;
        }
        await api.users.update(editingUser.id, updateData);
      } else {
        await api.users.create(formData);
      }
      setShowModal(false);
      setEditingUser(null);
      setFormData({ username: '', password: '', role: 'EMPLOYEE' });
      fetchUsers();
    } catch (err: any) {
      setError(err.message || '操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除该用户吗？')) return;

    try {
      await api.users.delete(id);
      fetchUsers();
    } catch (err: any) {
      alert(err.message || '删除失败');
    }
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: '',
      role: user.role,
    });
    setError('');
    setShowModal(true);
  };

  const openAddModal = () => {
    setEditingUser(null);
    setFormData({ username: '', password: '', role: 'EMPLOYEE' });
    setError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setFormData({ username: '', password: '', role: 'EMPLOYEE' });
    setError('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-blue-900">用户管理</h3>
          <p className="text-sm text-slate-500">管理系统登录账号</p>
        </div>
        <Button onClick={openAddModal}>
          <PlusIcon className="w-4 h-4 mr-2" />
          添加用户
        </Button>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">用户名</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">角色</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">关联人员</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">创建时间</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <UserCircleIcon className="w-5 h-5 text-slate-400" />
                    <span className="font-medium text-slate-900">{user.username}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleColors[user.role] || 'bg-slate-100 text-slate-700'}`}>
                    {roleLabels[user.role] || user.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {user.person?.name || '-'}
                </td>
                <td className="px-4 py-3 text-sm text-slate-500">
                  {user.createdAt ? new Date(user.createdAt).toLocaleDateString('zh-CN') : '-'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => openEditModal(user)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(user.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  暂无用户，请添加
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <Modal isOpen={showModal} onClose={closeModal} title={editingUser ? '编辑用户' : '添加用户'}>
        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">用户名</label>
            <Input
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              placeholder="请输入用户名"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              密码 {editingUser && <span className="text-slate-400 font-normal">(留空保持不变)</span>}
            </label>
            <Input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder={editingUser ? '留空保持原密码' : '请输入密码'}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">角色</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none bg-white"
            >
              <option value="SUPER_ADMIN">超级管理员</option>
              <option value="ADMIN">管理员</option>
              <option value="EMPLOYEE">普通员工</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={closeModal}>
              取消
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? '提交中...' : editingUser ? '保存' : '添加'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
