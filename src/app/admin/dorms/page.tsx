'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  PlusIcon,
  BuildingOfficeIcon,
  HomeIcon,
  UsersIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  PencilIcon,
  TrashIcon,
  MapPinIcon,
  CloudArrowUpIcon,
  CloudArrowDownIcon,
} from '@heroicons/react/24/outline';
import { Button, Card, Loading, ConfirmModal, Modal } from '@/components/ui';
import { useBuildings, useStatistics, useDistribution } from '@/hooks/useApi';
import { useToastHelpers } from '@/components/ui';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { api, Building, Room } from '@/lib/api';
import { formatNumber, getStatusColor, getStatusLabel } from '@/lib/utils';

// colors for gender and factory specifically
const GENDER_COLORS: Record<string, string> = { '男': '#3b82f6', '女': '#ec4899', '未知': '#94a3b8' };
const FACTORY_COLORS: Record<string, string> = { 'IMCN': '#10b981', 'IMAW': '#f59e0b', 'IMFT': '#8b5cf6', '职能部门': '#ec4899', '未知': '#94a3b8' };

// 楼栋卡片组件
function BuildingCard({
  building,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
  onAddRoom,
  onRoomClick,
}: {
  building: Building;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: (building: Building) => void;
  onDelete: (building: Building) => void;
  onAddRoom?: (building: Building) => void;
  onRoomClick?: (room: Room) => void;
}) {
  // 统计计算（与页面顶部统计保持一致）
  const totalRooms = building.room?.length || 0;
  // 排除已关闭房间的床位
  const availableRoomsList = building.room?.filter(r => r.status !== 'CLOSED') || [];
  const totalBeds = availableRoomsList.reduce((sum, r) => sum + r.bedCount, 0);
  const occupiedBeds = availableRoomsList.reduce((sum, r) => sum + (r.person?.length || 0), 0);
  // 入住率
  const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;
  // 已用房间数（有人员入住）
  const usedRooms = availableRoomsList.filter(r => (r.person?.length || 0) > 0).length;
  // 可用房间数（非关闭状态）
  const availableRooms = availableRoomsList.length;
  // 房间利用率
  const roomUtilizationRate = totalRooms > 0 ? Math.round((availableRooms / totalRooms) * 100) : 0;

  // group rooms by floor
  const roomsByFloor = building.room?.reduce((acc, room) => {
    const floor = room.floorNumber || 1;
    if (!acc[floor]) acc[floor] = [];
    acc[floor].push(room);
    return acc;
  }, {} as Record<number, Room[]>) || {};

  // 确保即使某层没有房间，也显示出该层（楼层平铺）
  const sortedFloors = [];
  for (let i = 1; i <= building.floors; i++) {
    sortedFloors.push(i);
    if (!roomsByFloor[i]) roomsByFloor[i] = [];
  }

  return (
    <Card 
      className={`transition-all duration-200 cursor-pointer ${isExpanded ? 'ring-2 ring-blue-500' : 'hover:shadow-md'}`}
      onClick={onToggle}
    >
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-100 rounded-xl">
              <BuildingOfficeIcon className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-blue-900">{building.name}</h3>
              <p className="text-sm text-slate-500 mt-1">{building.description || '暂无描述'}</p>
              <div className="flex items-center gap-4 mt-3 text-sm text-slate-600 flex-wrap">
                 <span className="flex items-center gap-1">
                  <MapPinIcon className="w-4 h-4" />
                  {building.floors} 楼层
                </span>
                <span className="flex items-center gap-1">
                  <HomeIcon className="w-4 h-4" />
                  {totalRooms} 房间
                </span>
                <span className="flex items-center gap-1">
                  <UsersIcon className="w-4 h-4" />
                  {occupiedBeds}/{totalBeds} 床位
                </span>
                <span>入住率 {occupancyRate}%</span>
                <span>已用: {usedRooms}</span>
                <span>可用: {availableRooms}</span>
                <span>利用率: {roomUtilizationRate}%</span>
              </div>
              {/* 颜色图例 */}
              <div className="flex flex-wrap gap-2 mt-3">
                {(() => {
                  const maleRooms = building.room?.filter(r => {
                    const persons = r.person || [];
                    return persons.some(p => p.gender === 'MALE' || p.gender === '男') && !persons.some(p => p.gender === 'FEMALE' || p.gender === '女');
                  }).length || 0;
                  const femaleRooms = building.room?.filter(r => {
                    const persons = r.person || [];
                    return persons.some(p => p.gender === 'FEMALE' || p.gender === '女') && !persons.some(p => p.gender === 'MALE' || p.gender === '男');
                  }).length || 0;
                  const mixedRooms = building.room?.filter(r => {
                    const persons = r.person || [];
                    return persons.some(p => p.gender === 'MALE' || p.gender === '男') && persons.some(p => p.gender === 'FEMALE' || p.gender === '女');
                  }).length || 0;
                  const emptyRooms = building.room?.filter(r => !r.person?.length && r.status !== 'CLOSED' && r.status !== 'MAINTENANCE').length || 0;
                  const closedRooms = building.room?.filter(r => r.status === 'CLOSED').length || 0;
                  const maintRooms = building.room?.filter(r => r.status === 'MAINTENANCE').length || 0;
                  
                  return (
                    <>
                      {maleRooms > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-200 text-blue-800 rounded text-xs">
                          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                          男: {maleRooms}
                        </span>
                      )}
                      {femaleRooms > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-pink-200 text-pink-800 rounded text-xs">
                          <span className="w-2 h-2 bg-pink-500 rounded-full"></span>
                          女: {femaleRooms}
                        </span>
                      )}
                      {mixedRooms > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-200 text-purple-800 rounded text-xs">
                          <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                          混: {mixedRooms}
                        </span>
                      )}
                      {emptyRooms > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-200 text-emerald-800 rounded text-xs">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                          空: {emptyRooms}
                        </span>
                      )}
                      {closedRooms > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-200 text-slate-600 rounded text-xs">
                          <span className="w-2 h-2 bg-slate-400 rounded-full"></span>
                          关: {closedRooms}
                        </span>
                      )}
                      {maintRooms > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-200 text-red-800 rounded text-xs">
                          <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                          修: {maintRooms}
                        </span>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(building); }}
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <TrashIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 展开的房间列表 */}
        {isExpanded && (
          <div className="mt-6 pt-6 border-t border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-slate-700">房间分布</h4>
              <div className="flex items-center gap-3">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddRoom && onAddRoom(building);
                  }}
                >
                  <PlusIcon className="w-4 h-4 mr-2" />
                  添加房间
                </Button>
              </div>
            </div>
            
            <div className="space-y-6">
              {sortedFloors.map(floor => (
                <div key={floor} className="bg-slate-50 p-4 rounded-xl">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="px-2 py-1 bg-slate-200 text-slate-700 rounded text-sm font-bold">{floor}F</span>
                    <span className="text-sm text-slate-500">共 {roomsByFloor[floor].length} 个房间</span>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                    {roomsByFloor[floor].map((room) => (
                      <RoomCard key={room.id} room={room} onClick={onRoomClick} />
                    ))}
                  </div>
                </div>
              ))}
              
              {sortedFloors.length === 0 && (
                <div className="text-center py-8 text-slate-500">该楼栋暂无房间，请先添加房间。</div>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

// 房间卡片组件
function RoomCard({ room, isMap = false, onClick }: { room: Room; isMap?: boolean; onClick?: (room: Room) => void }) {
  // 房间满载逻辑
  const occupied = room.person?.length || 0;
  const isEmpty = occupied === 0;
  const isFull = occupied >= room.bedCount && !isEmpty;

  // 根据在住人员性别决定背景色
  let genderBg = '';
  let genderText = 'text-blue-800';
  if (room.person && room.person.length > 0) {
    const hasMale = room.person.some(p => p.gender === 'MALE' || p.gender === '男');
    const hasFemale = room.person.some(p => p.gender === 'FEMALE' || p.gender === '女');
    if (hasMale) {
      genderBg = 'bg-blue-200 border-blue-300';
      genderText = 'text-blue-800';
    }
    if (hasFemale) {
      genderBg = 'bg-pink-200 border-pink-300';
      genderText = 'text-pink-800';
    }
    if (hasMale && hasFemale) {
      genderBg = 'bg-purple-200 border-purple-300';
      genderText = 'text-purple-800';
    }
  }

  let config = { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', label: '空置' };

  if (room.status === 'MAINTENANCE') {
    config = { bg: 'bg-red-50 border-red-200', text: 'text-red-700', label: '维修' };
  } else if (room.status === 'CLOSED') {
    config = { bg: 'bg-slate-100 border-slate-300', text: 'text-slate-500', label: '不可用' };
  } else if (isFull) {
    config = { bg: genderBg || 'bg-blue-200 border-blue-300', text: `${genderText} font-bold`, label: '已满' };
  } else if (!isEmpty) {
    config = { bg: genderBg || 'bg-blue-200 border-blue-300', text: genderText, label: '未满' };
  }

  return (
    <div
      onClick={(e) => { e.stopPropagation(); onClick && onClick(room); }}
      className={`p-3 rounded-lg border flex flex-col justify-center ${config.bg} ${isMap ? 'h-24' : ''} cursor-pointer hover:shadow-md transition-all group relative`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-slate-900">{room.roomNumber}</span>
        <span className={`text-xs ${config.text}`}>{config.label}</span>
      </div>
      <div className="flex items-center gap-1 text-xs text-slate-600">
        <UsersIcon className="w-3 h-3" />
        <span>{occupied}/{room.bedCount}人</span>
      </div>
      {/* 操作蒙层 */}
      {onClick && (
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-5 transition-all rounded-lg flex items-center justify-center">
          <span className="text-white opacity-0 group-hover:opacity-100 bg-black bg-opacity-50 px-2 py-1 rounded text-xs">管理</span>
        </div>
      )}
    </div>
  );
}

export default function DormsPage() {
  const [expandedBuilding, setExpandedBuilding] = useState<number | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [buildingToDelete, setBuildingToDelete] = useState<Building | null>(null);
  const [manageModalOpen, setManageModalOpen] = useState(false);
  const [manageRoom, setManageRoom] = useState<Room | null>(null);

  const toast = useToastHelpers();

  // 获取数据
  const { data: buildingsData, loading: buildingsLoading, error: buildingsError, refetch } = useBuildings();
  const { data: statsData, loading: statsLoading } = useStatistics();
  const { data: distributionData, loading: distributionLoading } = useDistribution();

  const buildings = buildingsData?.data || [];
  console.log('buildingsData:', buildingsData);
  console.log('buildings:', buildings);
  const stats = (statsData as any)?.data;
  const dist = (distributionData as any)?.data;

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  // 确保分布数据顺序正确（性别分布需要反转顺序以实现男左女右）
  const genderData = useMemo(() => {
    const data: { name: string; value: number }[] = dist?.gender || [];
    const order = ['女', '男', '未知']; // 反转顺序，让男显示在左侧
    const result: { name: string; value: number }[] = [];
    for (const name of order) {
      const item = data.find((d) => d.name === name);
      if (item) result.push(item);
    }
    return result;
  }, [dist?.gender]);

  const factoryData = useMemo(() => {
    const data: { name: string; value: number }[] = dist?.factory || [];
    const order = ['IMCN', 'IMFT', 'IMAW', '职能部门', '未知'];
    const result: { name: string; value: number }[] = [];
    for (const name of order) {
      const item = data.find((d) => d.name === name);
      if (item) result.push(item);
    }
    return result;
  }, [dist?.factory]);

  const handleToggle = (id: number) => {
    setExpandedBuilding(expandedBuilding === id ? null : id);
  };

  const handleEdit = (building: Building) => {
    toast.info('功能开发中', '编辑功能即将上线');
  };

  // 楼栋表单状态
  const [buildingFormOpen, setBuildingFormOpen] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState<Building | null>(null);
  const [buildingForm, setBuildingForm] = useState({
    name: '',
    address: '',
    description: '',
    floors: 5,
    roomsPerFloor: '' as any,
    bedsPerRoom: '' as any,
  });
  const [buildingSaving, setBuildingSaving] = useState(false);

  // 房间表单状态
  const [roomFormOpen, setRoomFormOpen] = useState(false);
  const [targetBuildingForRoom, setTargetBuildingForRoom] = useState<Building | null>(null);
  const [roomForm, setRoomForm] = useState({
    roomNumber: '',
    floorNumber: 1,
    bedCount: 4,
  });
  const [roomSaving, setRoomSaving] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error('文件格式错误', '请选择 .xlsx 或 .xls 格式的文件');
      return;
    }

    setImportLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const result = await api.buildings.import(formData) as any;
      if (result.success !== undefined) {
        if (result.failed > 0) {
          toast.warning('导入完成', `成功: ${result.success}, 失败: ${result.failed}`);
          if (result.errors && result.errors.length > 0) {
            console.error('导入错误:', result.errors);
          }
        } else {
          toast.success('导入成功', `成功导入 ${result.success} 条房间记录`);
        }
      }
      refetch();
    } catch (err: any) {
      toast.error('导入失败', err.message);
    } finally {
      setImportLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleExportClick = async () => {
    setExportLoading(true);
    try {
      await api.buildings.export();
      toast.success('导出成功', '文件已开始下载');
    } catch (err: any) {
      toast.error('导出失败', err.message);
    } finally {
      setExportLoading(false);
    }
  };

  const openRoomModal = (building: Building) => {
    setTargetBuildingForRoom(building);
    setRoomForm({
      roomNumber: '',
      floorNumber: 1,
      bedCount: 4,
    });
    setRoomFormOpen(true);
  };

  const saveRoom = async () => {
    if (!targetBuildingForRoom || !roomForm.roomNumber) {
      toast.warning('请输入房间号');
      return;
    }
    setRoomSaving(true);
    try {
      await api.rooms.create({
        ...roomForm,
        buildingId: targetBuildingForRoom.id,
        status: 'VACANT',
      });
      toast.success('添加房间成功');
      setRoomFormOpen(false);
      refetch();
    } catch (err: any) {
      toast.error('添加失败', err.message);
    } finally {
      setRoomSaving(false);
    }
  };

  const openBuildingModal = (building?: Building) => {
    if (building) {
      setEditingBuilding(building);
      setBuildingForm({
        name: building.name,
        address: building.address || '',
        description: building.description || '',
        floors: building.floors,
        roomsPerFloor: '' as any,
        bedsPerRoom: '' as any,
      });
    } else {
      setEditingBuilding(null);
      setBuildingForm({ name: '', address: '', description: '', floors: 5, roomsPerFloor: '' as any, bedsPerRoom: '' as any });
    }
    setBuildingFormOpen(true);
  };

  const saveBuilding = async () => {
    if (!buildingForm.name) {
      toast.warning('请输入楼栋名称');
      return;
    }
    if (!editingBuilding) {
      if (!buildingForm.roomsPerFloor || !buildingForm.bedsPerRoom) {
        toast.warning('请填写每层房间数和每房床位数');
        return;
      }
    }
    setBuildingSaving(true);
    try {
      if (editingBuilding) {
        await api.buildings.update(editingBuilding.id, buildingForm);
        toast.success('更新成功');
      } else {
        await api.buildings.create({
          ...buildingForm,
          roomsPerFloor: Number(buildingForm.roomsPerFloor),
          bedsPerRoom: Number(buildingForm.bedsPerRoom),
        } as any);
        toast.success('添加成功');
      }
      setBuildingFormOpen(false);
      refetch();
    } catch (err: any) {
      toast.error('保存失败', err.message);
    } finally {
      setBuildingSaving(false);
    }
  };

  const handleDeleteClick = (building: Building) => {
    setBuildingToDelete(building);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!buildingToDelete) return;

    try {
      await api.buildings.delete(buildingToDelete.id);
      toast.success('删除成功', `楼栋 ${buildingToDelete.name} 已删除`);
      refetch();
    } catch (err: any) {
      toast.error('删除失败', err.message);
    } finally {
      setDeleteModalOpen(false);
      setBuildingToDelete(null);
    }
  };

  if (buildingsError) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">⚠️</div>
        <h3 className="text-lg font-semibold text-red-900 mb-2">数据加载失败</h3>
        <p className="text-slate-500 mb-4">{buildingsError}</p>
        <Button onClick={refetch}>重新加载</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-blue-900">宿舍资源</h1>
          <p className="text-sm text-slate-500 mt-1">管理楼栋、房间和床位资源</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="success" onClick={handleImportClick} loading={importLoading}>
            <CloudArrowUpIcon className="w-5 h-5 mr-2" />
            导入
          </Button>
          <Button variant="info" onClick={handleExportClick} loading={exportLoading}>
            <CloudArrowDownIcon className="w-5 h-5 mr-2" />
            导出
          </Button>
          <Button variant="primary" onClick={() => openBuildingModal()}>
            <PlusIcon className="w-5 h-5 mr-2" />
            添加楼栋
          </Button>
        </div>
      </div>

      {/* 隐藏的文件输入框 */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".xlsx,.xls"
        style={{ display: 'none' }}
      />

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <BuildingOfficeIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">楼栋数量</p>
              <p className="text-2xl font-semibold text-blue-900">
                {statsLoading ? '-' : formatNumber(stats?.totalBuildings || 0)}
              </p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-100 rounded-lg">
              <HomeIcon className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">房间总数</p>
              <p className="text-2xl font-semibold text-blue-900">
                {statsLoading ? '-' : formatNumber(stats?.roomStats?.totalRooms || 0)}
              </p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <UsersIcon className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">总床位数</p>
              <p className="text-2xl font-semibold text-blue-900">
                {statsLoading ? '-' : formatNumber(stats?.bedStats?.totalBeds || 0)}
              </p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-100 rounded-lg">
              <HomeIcon className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">入住率</p>
              <p className="text-2xl font-semibold text-blue-900">
                {statsLoading ? '-' : `${stats?.bedStats?.occupancyRate || 0}%`}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* 房间统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-cyan-100 rounded-lg">
              <UsersIcon className="w-6 h-6 text-cyan-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">总入住人数</p>
              <p className="text-2xl font-semibold text-blue-900">
                {statsLoading ? '-' : formatNumber(stats?.bedStats?.occupiedBeds || 0)}
              </p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-100 rounded-lg">
              <HomeIcon className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">已用房间数</p>
              <p className="text-2xl font-semibold text-blue-900">
                {statsLoading ? '-' : formatNumber(stats?.roomStats?.usedRooms || 0)}
              </p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-teal-100 rounded-lg">
              <HomeIcon className="w-6 h-6 text-teal-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">可用房间数</p>
              <p className="text-2xl font-semibold text-blue-900">
                {statsLoading ? '-' : formatNumber(stats?.roomStats?.availableRooms || 0)}
              </p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-rose-100 rounded-lg">
              <HomeIcon className="w-6 h-6 text-rose-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">房间利用率</p>
              <p className="text-2xl font-semibold text-blue-900">
                {statsLoading ? '-' : `${stats?.roomStats?.roomUtilizationRate || 0}%`}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* 高级分布统计图表 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="p-4">
          <h3 className="text-lg font-medium text-slate-800 mb-4">性别分布</h3>
          <div className="h-64">
            {distributionLoading ? <div className="h-full flex items-center justify-center"><Loading /></div> : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={genderData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({name, value}) => `${name} ${value}人`}
                    startAngle={85}
                    endAngle={-270}
                    isAnimationActive={false}
                  >
                    {genderData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={GENDER_COLORS[entry.name] || COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          {/* 自定义图例 - 使用原始顺序（男 → 女） */}
          <div className="flex justify-center gap-4 mt-2">
            {(['男', '女'] as const).map((name) => (
              <div key={name} className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: GENDER_COLORS[name] }}></span>
                <span className="text-sm text-slate-600">{name}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="text-lg font-medium text-slate-800 mb-4">工厂分布</h3>
          <div className="h-64">
            {distributionLoading ? <div className="h-full flex items-center justify-center"><Loading /></div> : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={factoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({name, value}) => `${name} ${value}人`}
                    startAngle={90}
                    endAngle={-270}
                    isAnimationActive={false}
                  >
                    {factoryData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={FACTORY_COLORS[entry.name] || COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          {/* 自定义图例 */}
          <div className="flex justify-center gap-4 mt-2 flex-wrap">
            {factoryData.map((item: any) => (
              <div key={item.name} className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: FACTORY_COLORS[item.name] }}></span>
                <span className="text-sm text-slate-600">{item.name}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>


      {/* 楼栋列表 */}
      <div className="space-y-4">
        {buildingsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loading size="lg" />
          </div>
        ) : buildings.length === 0 ? (
          <Card className="py-12 text-center">
            <BuildingOfficeIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">暂无楼栋数据</p>
          </Card>
        ) : (
          buildings.map((building: Building) => (
            <BuildingCard
              key={building.id}
              building={building}
              isExpanded={expandedBuilding === building.id}
              onToggle={() => handleToggle(building.id)}
              onEdit={openBuildingModal}
      onDelete={handleDeleteClick}
      onAddRoom={openRoomModal}
      onRoomClick={(room: Room) => {
        setManageRoom(room);
        setManageModalOpen(true);
      }}
    />
  ))
)}
</div>

{/* 添加房间对话框 */}
<Modal
isOpen={roomFormOpen}
onClose={() => setRoomFormOpen(false)}
title={`添加房间 - ${targetBuildingForRoom?.name || ''}`}
size="sm"
>
<div className="space-y-4">
  <div>
    <label className="block text-sm font-medium text-slate-700 mb-1">房间号 *</label>
    <input
      className="w-full px-3 py-2 border rounded-lg focus:ring-2 outline-none"
      value={roomForm.roomNumber}
      onChange={e => setRoomForm({ ...roomForm, roomNumber: e.target.value })}
      placeholder="例如：101、A101"
    />
  </div>
  <div>
    <label className="block text-sm font-medium text-slate-700 mb-1">所在楼层 *</label>
    <input
      type="number"
      min="1"
      max={targetBuildingForRoom?.floors}
      className="w-full px-3 py-2 border rounded-lg focus:ring-2 outline-none"
      value={roomForm.floorNumber}
      onChange={e => setRoomForm({ ...roomForm, floorNumber: Number(e.target.value) })}
    />
  </div>
  <div>
    <label className="block text-sm font-medium text-slate-700 mb-1">床位数量 *</label>
    <input
      type="number"
      min="1"
      max="20"
      className="w-full px-3 py-2 border rounded-lg focus:ring-2 outline-none"
      value={roomForm.bedCount}
      onChange={e => setRoomForm({ ...roomForm, bedCount: Number(e.target.value) })}
    />
  </div>
</div>
<div className="flex justify-end gap-3 mt-6">
  <Button variant="ghost" onClick={() => setRoomFormOpen(false)}>取消</Button>
  <Button variant="primary" onClick={saveRoom} loading={roomSaving}>保存</Button>
</div>
</Modal>

      {/* 删除确认对话框 */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="确认删除"
        message={`确定要删除楼栋 "${buildingToDelete?.name}" 吗？此操作将同时删除该楼栋下的所有房间数据，不可恢复。`}
        type="danger"
      />

      {/* 添加/编辑楼栋 */}
      <Modal
        isOpen={buildingFormOpen}
        onClose={() => setBuildingFormOpen(false)}
        title={editingBuilding ? "编辑楼栋" : "添加新楼栋"}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">名称 *</label>
            <input
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 outline-none"
              value={buildingForm.name}
              onChange={e => setBuildingForm({ ...buildingForm, name: e.target.value })}
              placeholder="例如：1栋、A栋"
            />
          </div>
          <div>
             <label className="block text-sm font-medium text-slate-700 mb-1">规划楼层数 (1-100) *</label>
             <input
               type="number"
               min="1"
               max="100"
               className="w-full px-3 py-2 border rounded-lg focus:ring-2 outline-none"
               value={buildingForm.floors}
               onChange={e => setBuildingForm({ ...buildingForm, floors: Number(e.target.value) })}
             />
          </div>
          {!editingBuilding && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">每层房间数 *</label>
                 <input
                   type="number"
                   min="1"
                   max="100"
                   className="w-full px-3 py-2 border rounded-lg focus:ring-2 outline-none"
                   value={buildingForm.roomsPerFloor}
                   onChange={e => setBuildingForm({ ...buildingForm, roomsPerFloor: Number(e.target.value) })}
                 />
              </div>
              <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">每房床位数 *</label>
                 <input
                   type="number"
                   min="1"
                   max="20"
                   className="w-full px-3 py-2 border rounded-lg focus:ring-2 outline-none"
                   value={buildingForm.bedsPerRoom}
                   onChange={e => setBuildingForm({ ...buildingForm, bedsPerRoom: Number(e.target.value) })}
                 />
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">位置描述</label>
            <input
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 outline-none"
              value={buildingForm.address}
              onChange={e => setBuildingForm({ ...buildingForm, address: e.target.value })}
              placeholder="例如：厂区北门入口处"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">备注说明</label>
            <textarea
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 outline-none resize-none h-20"
              value={buildingForm.description}
              onChange={e => setBuildingForm({ ...buildingForm, description: e.target.value })}
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
           <Button variant="ghost" onClick={() => setBuildingFormOpen(false)}>取消</Button>
           <Button variant="primary" onClick={saveBuilding} loading={buildingSaving}>保存</Button>
        </div>
      </Modal>

      {/* 房间资产管理模态框 */}
      <RoomManageModal
        isOpen={manageModalOpen}
        onClose={() => {
          setManageModalOpen(false);
          setManageRoom(null);
        }}
        room={manageRoom}
        onRefresh={refetch}
      />
    </div>
  );
}

// 房间资产管理弹出层
import { Input } from '@/components/ui';

function RoomManageModal({
  isOpen,
  onClose,
  room,
  onRefresh,
}: {
  isOpen: boolean;
  onClose: () => void;
  room: Room | null;
  onRefresh?: () => void;
}) {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [bindFormOpen, setBindFormOpen] = useState(false);
  const [formData, setFormData] = useState({ assetCode: '', name: '', category: '家具', specification: '', price: '' });
  const [bedCountEdit, setBedCountEdit] = useState<number | ''>('');
  const toast = useToastHelpers();

  const loadAssets = useCallback(async () => {
    if (!room) return;
    setLoading(true);
    try {
      const result = await api.assets.list({ roomId: room.id });
      setAssets(result.data as any[] || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [room]);

  useEffect(() => {
    if (isOpen && room) {
      loadAssets();
      setBedCountEdit(room.bedCount);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, room, loadAssets]);

  const handleBind = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!room) return;
    try {
      await api.assets.create({ ...formData, roomId: room.id });
      toast.success('绑定成功', '资产已添加到该房间');
      setBindFormOpen(false);
      setFormData({ assetCode: '', name: '', category: '家具', specification: '', price: '' });
      loadAssets();
    } catch (err: any) {
      toast.error('绑定失败', err.message);
    }
  };

  const handleUnbind = async (assetId: number) => {
    try {
      await api.assets.update(assetId, { roomId: null });
      toast.success('解绑成功');
      loadAssets();
    } catch (err: any) {
      toast.error('解绑失败', err.message);
    }
  };

  // 获取入住人员信息
  const persons = room?.person || [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`房间管理 - ${room?.roomNumber || ''}`}
      size="lg"
    >
      <div className="space-y-6">
        {/* 入住人员信息 */}
        <div>
          <div className="flex items-center gap-4 mb-4 border-b border-slate-100 pb-2">
            <h3 className="font-semibold text-slate-800">入住人员</h3>
            <span className="text-sm text-slate-500">共 {persons.length} 人</span>
          </div>
          {persons.length === 0 ? (
            <div className="py-4 text-center text-slate-500 text-sm bg-slate-50 rounded-lg">该房间暂无入住人员</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {persons.map((person: any) => (
                <div key={person.id} className="p-3 border border-slate-200 rounded-lg bg-blue-50">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-sm text-slate-800">{person.name}</div>
                    <span className={`text-xs px-2 py-0.5 rounded ${person.gender === 'MALE' || person.gender === '男' ? 'bg-blue-200 text-blue-800' : person.gender === 'FEMALE' || person.gender === '女' ? 'bg-pink-200 text-pink-800' : 'bg-slate-200 text-slate-600'}`}>
                      {person.gender === 'MALE' || person.gender === '男' ? '男' : person.gender === 'FEMALE' || person.gender === '女' ? '女' : '未知'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {person.employeeId && <span>工号: {person.employeeId}</span>}
                    {person.department && <span className="ml-2">部门: {person.department}</span>}
                    {person.factory && <span className="ml-2">工厂: {person.factory === 'imaw' ? 'IMAW' : person.factory === 'imft' ? 'IMFT' : person.factory === '职能部门' ? '职能部门' : 'IMCN'}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center gap-4 mb-4 border-b border-slate-100 pb-2">
            <h3 className="font-semibold text-slate-800">资产关联</h3>
            <span className="text-sm text-slate-500">共 {assets.length} 件</span>
            <button
              onClick={() => setBindFormOpen(!bindFormOpen)}
              className="ml-auto text-sm text-blue-600 hover:text-blue-700"
            >
              {bindFormOpen ? '取消绑定' : '+ 新增/绑定资产'}
            </button>
          </div>

          {bindFormOpen && (
            <form onSubmit={handleBind} className="bg-slate-50 p-4 rounded-lg mb-6 grid grid-cols-2 gap-4">
              <Input
                label="资产编码 *"
                value={formData.assetCode}
                onChange={(e) => setFormData({ ...formData, assetCode: e.target.value })}
                required
              />
              <Input
                label="资产名称 *"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  分类
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none bg-white"
                >
                  <option value="家具">家具</option>
                  <option value="电器">家电</option>
                  <option value="其他">其他</option>
                </select>
              </div>
              <Input
                label="规格/型号"
                value={formData.specification}
                onChange={(e) => setFormData({ ...formData, specification: e.target.value })}
              />
              <div className="col-span-2 flex justify-end">
                <Button variant="primary" size="sm" type="submit">保存绑定</Button>
              </div>
            </form>
          )}

          {loading ? (
            <div className="py-8 text-center"><Loading /></div>
          ) : assets.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-sm">该房间暂未绑定任何资产</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {assets.map(asset => (
                <div key={asset.id} className="p-3 border border-slate-200 rounded-lg flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm text-slate-800">{asset.name} <span className="text-xs text-slate-500 font-normal ml-1">({asset.category})</span></div>
                    <div className="text-xs text-slate-500 mt-1">编码: {asset.assetCode} | 状态: <span className={asset.status === 'IN_USE' ? 'text-blue-600' : 'text-slate-500'}>{asset.status === 'IN_USE' ? '在用' : asset.status}</span></div>
                  </div>
                  <button 
                    onClick={() => handleUnbind(asset.id)}
                    className="text-xs text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2 py-1 rounded transition-colors"
                  >
                    解除绑定
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 pt-6">
          <div className="flex flex-col items-center justify-center pb-4 border-b border-slate-100 mb-4">
            <div className="text-center mb-4">
              <h3 className="font-semibold text-slate-800">床位管理</h3>
              <p className="text-xs text-slate-500 mt-1">更新客房的实际可用床位数量上限</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                value={bedCountEdit}
                onChange={e => setBedCountEdit(Number(e.target.value))}
                className="w-20 px-2 py-1 border rounded focus:ring-2 outline-none text-sm"
              />
              <Button 
                 variant="outline" 
                 size="sm"
                 onClick={async () => {
                   if (!room || bedCountEdit === '') return;
                   try {
                     await api.rooms.update(room.id, { bedCount: Number(bedCountEdit) });
                     toast.success('更新床位数成功');
                     onRefresh?.();
                     onClose(); 
                   } catch (e: any) {
                     toast.error('操作失败', e.message);
                   }
                 }}
              >
                保存床位
              </Button>
            </div>
          </div>
        </div>
          <div className="flex flex-col items-center justify-center pt-4">
            <div className="text-center mb-4">
              <h3 className="font-semibold text-slate-800">运营状态</h3>
              <p className="text-xs text-slate-500 mt-1">控制此房间是否可供系统继续分配人员居住</p>
            </div>
            <div className="flex items-center gap-4">
              <Button 
                 variant={room?.status === 'CLOSED' ? 'primary' : 'danger'} 
                 size="sm"
                 onClick={async () => {
                   if (!room) return;
                   const newStatus = room.status === 'CLOSED' ? 'VACANT' : 'CLOSED';
                   try {
                     await api.rooms.update(room.id, { status: newStatus });
                     toast.success(newStatus === 'CLOSED' ? '房间已设为不可用' : '房间已启用');
                     onRefresh?.();
                     onClose(); 
                   } catch (e: any) {
                     toast.error('状态更新失败', e.message);
                   }
                 }}
              >
                {room?.status === 'CLOSED' ? '启用房间' : '关闭此房间'}
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={async () => {
                  if (!room) return;
                  if (room.person && room.person.length > 0) {
                    toast.warning('房间内仍有人员，无法删除');
                    return;
                  }
                  if (confirm(`确定要删除房间 ${room.roomNumber} 吗？`)) {
                    try {
                      await api.rooms.delete(room.id);
                      toast.success('房间已删除');
                      onRefresh?.();
                      onClose();
                    } catch (e: any) {
                      toast.error('删除失败', e.message);
                    }
                  }
                }}
              >
                删除房间
              </Button>
            </div>
          </div>
      </div>
    </Modal>
  );
}
