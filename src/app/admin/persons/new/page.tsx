'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';
import { Button, Card, Input } from '@/components/ui';
import { useToastHelpers } from '@/components/ui';
import { api } from '@/lib/api';
import { useFactories } from '@/hooks/useFactories';

export default function NewPersonPage() {
  const router = useRouter();
  const toast = useToastHelpers();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    employeeId: '',
    name: '',
    department: '',
    position: '',
    phone: '',
    idCard: '',
    gender: '',
    factory: 'imcn',
    status: 'ACTIVE',
    checkInDate: new Date().toISOString().split('T')[0], // 默认当前日期
    buildingId: '',
    roomId: '',
    bedNumber: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: '',
    isRoomLeader: false,
  });

  const [buildings, setBuildings] = useState<{ id: number; name: string }[]>([]);
  const [rooms, setRooms] = useState<{ id: number; roomNumber: string }[]>([]);
  const { activeFactories } = useFactories();

  useEffect(() => {
    async function loadBuildings() {
      try {
        const result = await api.buildings.list();
        if (result.data) {
          setBuildings(result.data as any);
        }
      } catch (error) {
        console.error('Failed to load buildings:', error);
      }
    }
    loadBuildings();
  }, []);

  useEffect(() => {
    if (activeFactories.length === 0) return;
    const exists = activeFactories.some((factory) => factory.code === formData.factory);
    if (!exists) {
      setFormData((prev) => ({ ...prev, factory: activeFactories[0].code }));
    }
  }, [activeFactories, formData.factory]);

  const handleBuildingChange = async (buildingId: string) => {
    setFormData((prev) => ({ ...prev, buildingId, roomId: '' }));
    if (buildingId) {
      try {
        const result = await api.rooms.list({ buildingId: parseInt(buildingId) });
        if (result) {
          setRooms(Array.isArray(result) ? result as any : (result.data as any));
        }
      } catch (error) {
        console.error('Failed to load rooms:', error);
      }
    } else {
      setRooms([]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'buildingId') {
      handleBuildingChange(value);
    } else if (name === 'status') {
      // 当状态变更为入住时，自动设置当前日期
      const newStatus = value;
      const newFormData = { ...formData, [name]: value };
      if (newStatus === 'ACTIVE' && !formData.checkInDate) {
        newFormData.checkInDate = new Date().toISOString().split('T')[0];
      }
      setFormData(newFormData);
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.employeeId || !formData.name) {
      toast.warning('请填写必填项', '工号和姓名不能为空');
      return;
    }

    setLoading(true);
    try {
      const emergencyContacts = [];
      if (formData.emergencyContactName && formData.emergencyContactPhone) {
        emergencyContacts.push({
          name: formData.emergencyContactName,
          relationship: formData.emergencyContactRelationship || '其他',
          phone: formData.emergencyContactPhone,
        });
      }

      await api.persons.create({
        employeeId: formData.employeeId,
        name: formData.name,
        department: formData.department || null,
        position: formData.position || null,
        phone: formData.phone || null,
        idCard: formData.idCard || null,
        gender: formData.gender || null,
        factory: formData.factory,
        status: formData.status,
        buildingId: formData.buildingId ? parseInt(formData.buildingId) : null,
        roomId: formData.roomId ? parseInt(formData.roomId) : null,
        bedNumber: formData.bedNumber || null,
        isRoomLeader: formData.isRoomLeader,
        checkInDate: formData.checkInDate ? new Date(formData.checkInDate).toISOString() : new Date().toISOString(),
        emergencyContacts: emergencyContacts.length > 0 ? emergencyContacts : undefined,
      });
      toast.success('创建成功', '人员档案已创建');
      router.push('/admin/persons');
    } catch (error: any) {
      toast.error('创建失败', error.message || '请检查输入信息');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/persons">
          <Button variant="ghost" size="sm">
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            返回
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-blue-900">新增人员</h1>
          <p className="text-sm text-slate-500 mt-1">创建新的员工档案</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <h3 className="text-lg font-medium text-blue-900 mb-4">基本信息</h3>
            <div className="space-y-4">
              <Input
                label="工号 *"
                name="employeeId"
                value={formData.employeeId}
                onChange={handleChange}
                placeholder="请输入工号"
                required
              />
              <Input
                label="姓名 *"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="请输入姓名"
                required
              />
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  性别
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none bg-white"
                >
                  <option value="">请选择性别</option>
                  <option value="MALE">男</option>
                  <option value="FEMALE">女</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  住宿状态 *
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none bg-white"
                  required
                >
                  <option value="ACTIVE">入住</option>
                  <option value="MOVED_OUT">退宿</option>
                  <option value="BLACKLISTED">黑名单</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  所属工厂 *
                </label>
                <select
                  name="factory"
                  value={formData.factory}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none bg-white"
                  required
                >
                  {activeFactories.map((factory) => (
                    <option key={factory.id} value={factory.code}>{factory.name}</option>
                  ))}
                </select>
              </div>
              <Input
                label="部门"
                name="department"
                value={formData.department}
                onChange={handleChange}
                placeholder="请输入部门"
              />
              <Input
                label="职位"
                name="position"
                value={formData.position}
                onChange={handleChange}
                placeholder="请输入职位"
              />
            </div>
          </Card>

          <Card>
            <h3 className="text-lg font-medium text-blue-900 mb-4">联系方式</h3>
            <div className="space-y-4">
              <Input
                label="手机号码"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="请输入手机号码"
              />
              <Input
                label="身份证号"
                name="idCard"
                value={formData.idCard}
                onChange={handleChange}
                placeholder="请输入身份证号"
              />
              <div className="pt-2 border-t border-slate-100">
                <h4 className="text-sm font-medium text-slate-700 mb-3">紧急联系人</h4>
                <Input
                  label="姓名"
                  name="emergencyContactName"
                  value={formData.emergencyContactName}
                  onChange={handleChange}
                  placeholder="请输入紧急联系人姓名"
                />
                <Input
                  label="关系"
                  name="emergencyContactRelationship"
                  value={formData.emergencyContactRelationship}
                  onChange={handleChange}
                  placeholder="如：配偶、父母、兄弟姐妹、朋友"
                />
                <Input
                label="联系电话"
                name="emergencyContactPhone"
                value={formData.emergencyContactPhone}
                onChange={handleChange}
                placeholder="请输入紧急联系人电话"
              />
              <div className="pt-2 border-t border-slate-100 mt-4">
                <Input
                  label="入住日期"
                  name="checkInDate"
                  type="date"
                  value={formData.checkInDate}
                  onChange={handleChange}
                  disabled={formData.status !== 'ACTIVE'}
                  className={formData.status !== 'ACTIVE' ? 'bg-slate-100' : ''}
                />
                <p className="text-xs text-slate-500 mt-1">
                  {formData.status === 'ACTIVE' ? '当状态为入住时，可手动调整入住日期' : '状态为退宿或黑名单时，入住日期不可编辑'}
                </p>
              </div>
              </div>
            </div>
          </Card>

          <Card className="md:col-span-2">
            <h3 className="text-lg font-medium text-blue-900 mb-4">宿舍分配</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  楼栋
                </label>
                <select
                  name="buildingId"
                  value={formData.buildingId}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none bg-white"
                >
                  <option value="">请选择楼栋</option>
                  {buildings.map((building) => (
                    <option key={building.id} value={building.id}>
                      {building.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  房间
                </label>
                <select
                  name="roomId"
                  value={formData.roomId}
                  onChange={handleChange}
                  disabled={!formData.buildingId}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none bg-white disabled:bg-slate-100"
                >
                  <option value="">请选择房间</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.roomNumber}
                    </option>
                  ))}
                </select>
              </div>
              <Input
                label="床位号"
                name="bedNumber"
                value={formData.bedNumber}
                onChange={handleChange}
                placeholder="如：1号床"
              />
              <div className="flex items-center h-full pt-6">
                <label className="flex items-center gap-2 cursor-pointer bg-amber-50 px-4 py-2 rounded-lg border border-amber-200">
                  <input
                    type="checkbox"
                    checked={formData.isRoomLeader}
                    onChange={(e) => setFormData({ ...formData, isRoomLeader: e.target.checked })}
                    className="w-4 h-4 text-amber-600 rounded border-amber-300 focus:ring-amber-500"
                  />
                  <span className="text-sm font-medium text-amber-700">设为舍长</span>
                </label>
              </div>
            </div>
          </Card>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Link href="/admin/persons">
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
