'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeftIcon, HomeIcon, UserIcon } from '@heroicons/react/24/outline';
import { Button, Card, Input } from '@/components/ui';
import { useToastHelpers } from '@/components/ui';
import { get, patch } from '@/lib/api';
import { useFactories } from '@/hooks/useFactories';
import { normalizeFactoryCode } from '@/lib/factory-utils';

interface Room {
  id: number;
  roomNumber: string;
  status: string;
  person: Person[];
}

interface Person {
  id: number;
  name: string;
  department: string;
  factory: string;
}

interface InspectionRecord {
  id: number;
  inspectionDate: string;
  roomNumber: string;
  factory: string;
  department: string;
  personName: string;
  personId?: number | null;
  violationDesc: string;
  action?: string;
  inspector: string;
  notes?: string;
}

export default function EditInspectionPage() {
  const router = useRouter();
  const params = useParams();
  const recordId = params.id as string;
  const toast = useToastHelpers();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [selectedPersonId, setSelectedPersonId] = useState<string>('');
  const { factories } = useFactories();

  const [formData, setFormData] = useState({
    inspectionDate: '',
    roomNumber: '',
    factory: 'imcn',
    department: '',
    personName: '',
    violationDesc: '',
    action: '',
    inspector: '',
    notes: '',
  });

  // 加载已住人房间列表和记录数据
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const [roomsResult, recordResult] = await Promise.all([
          get<Room[]>('/api/rooms?status=OCCUPIED'),
          get<InspectionRecord>(`/api/7s-inspections/${recordId}`),
        ]);

        if (!isMounted) return;

        const roomsData = roomsResult.data || [];
        setRooms(roomsData);

        const record = recordResult.data;

        if (record && record.id) {
          const inspectionDateStr = record.inspectionDate
            ? new Date(record.inspectionDate).toISOString().split('T')[0]
            : '';

          setFormData({
            inspectionDate: inspectionDateStr,
            roomNumber: record.roomNumber || '',
            factory: normalizeFactoryCode(record.factory) || 'imcn',
            department: record.department || '',
            personName: record.personName || '',
            violationDesc: record.violationDesc || '',
            action: record.action || '',
            inspector: record.inspector || '',
            notes: record.notes || '',
          });

          const matchedRoom = roomsData.find((room) => room.roomNumber === record.roomNumber);
          if (matchedRoom) {
            setSelectedRoomId(matchedRoom.id.toString());

            const matchedPerson = matchedRoom.person.find((person) => {
              if (record.personId) {
                return person.id === record.personId;
              }
              return person.name === record.personName;
            });

            if (matchedPerson) {
              setSelectedPersonId(matchedPerson.id.toString());
            }
          }
        } else if (recordResult.error) {
          toast.error('加载失败', recordResult.error);
        }
      } catch (error) {
        console.error('Failed to load data:', error);
        toast.error('加载失败', '无法加载检查记录');
      } finally {
        if (isMounted) {
          setInitialLoading(false);
          setRoomsLoading(false);
        }
      }
    }

    if (recordId) {
      loadData();
    }

    return () => {
      isMounted = false;
    };
  }, [recordId, toast]);

  // 处理房间选择
  const handleRoomChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const roomId = e.target.value;
    setSelectedRoomId(roomId);
    setSelectedPersonId('');

    if (!roomId) {
      setFormData(prev => ({
        ...prev,
        roomNumber: '',
        personName: '',
        department: '',
        factory: 'imcn',
      }));
      return;
    }

    const selectedRoom = rooms.find(r => r.id.toString() === roomId);
    if (selectedRoom) {
      setFormData(prev => ({
        ...prev,
        roomNumber: selectedRoom.roomNumber,
        personName: '',
        department: '',
        factory: 'imcn',
      }));
    }
  };

  // 处理人员选择
  const handlePersonChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const personId = e.target.value;
    setSelectedPersonId(personId);

    if (!personId || !selectedRoomId) {
      setFormData(prev => ({
        ...prev,
        personName: '',
        department: '',
        factory: 'imcn',
      }));
      return;
    }

    const selectedRoom = rooms.find(r => r.id.toString() === selectedRoomId);
    const selectedPerson = selectedRoom?.person.find(p => p.id.toString() === personId);

    if (selectedPerson) {
      setFormData(prev => ({
        ...prev,
        personName: selectedPerson.name,
        department: selectedPerson.department || '',
        factory: normalizeFactoryCode(selectedPerson.factory) || 'imcn',
      }));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const validateForm = (): boolean => {
    const requiredFields = [
      { field: 'inspectionDate', label: '检查日期' },
      { field: 'roomNumber', label: '宿舍号' },
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
      await patch(`/api/7s-inspections/${recordId}`, {
        inspectionDate: new Date(formData.inspectionDate).toISOString(),
        roomNumber: formData.roomNumber.trim(),
        factory: formData.factory,
        department: formData.department.trim(),
        personName: formData.personName.trim(),
        personId: selectedPersonId || null,
        categoryId: null,
        violationDesc: formData.violationDesc.trim(),
        action: formData.action.trim() || null,
        inspector: formData.inspector.trim(),
        notes: formData.notes.trim() || null,
      });

      toast.success('更新成功', '检查记录已更新');
      router.push('/admin/7s-inspections');
    } catch (error: any) {
      toast.error('更新失败', error.message || '请检查输入信息');
    } finally {
      setLoading(false);
    }
  };

  // 获取当前选中房间的人员列表
  const selectedRoom = rooms.find(r => r.id.toString() === selectedRoomId);
  const roomPersons = selectedRoom?.person || [];

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-500">加载中...</p>
        </div>
      </div>
    );
  }

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
          <h1 className="text-2xl font-semibold text-blue-900">编辑检查记录</h1>
          <p className="text-sm text-slate-500 mt-1">修改7S检查记录</p>
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

              {/* 宿舍号选择 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  宿舍号 *
                </label>
                <div className="relative">
                  <HomeIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <select
                    value={selectedRoomId}
                    onChange={handleRoomChange}
                    disabled={roomsLoading}
                    className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none bg-white h-11 disabled:bg-slate-100"
                    required
                  >
                    <option value="">{roomsLoading ? '加载中...' : '请选择宿舍'}</option>
                    {rooms.filter((room) => room.person && room.person.length > 0).map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.roomNumber} ({room.person?.length || 0}人)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 人员选择 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  选择人员 *
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <select
                    value={selectedPersonId}
                    onChange={handlePersonChange}
                    disabled={!selectedRoomId || roomPersons.length === 0}
                    className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none bg-white h-11 disabled:bg-slate-100"
                    required
                  >
                    <option value="">
                      {!selectedRoomId 
                        ? '请先选择宿舍' 
                        : roomPersons.length === 0 
                          ? '该宿舍无在住人员' 
                          : '请选择人员'}
                    </option>
                    {roomPersons.map((person) => (
                      <option key={person.id} value={person.id}>
                        {person.name} - {person.department || '未设置部门'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

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
                  {factories
                    .filter((factory) => factory.isActive || normalizeFactoryCode(factory.code) === normalizeFactoryCode(formData.factory))
                    .map((factory) => (
                      <option key={factory.id} value={factory.code}>{factory.name}</option>
                    ))}
                </select>
              </div>

              <Input
                label="所属部门 *"
                name="department"
                value={formData.department}
                onChange={handleChange}
                placeholder="请选择人员自动填入"
                required
                readOnly
                className="bg-slate-50"
              />

              <Input
                label="员工姓名 *"
                name="personName"
                value={formData.personName}
                onChange={handleChange}
                placeholder="请选择人员自动填入"
                required
                readOnly
                className="bg-slate-50"
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
            保存
          </Button>
        </div>
      </form>
    </div>
  );
}
