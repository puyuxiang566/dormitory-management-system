'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  PlusIcon,
  CurrencyYenIcon,
  CalculatorIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  HomeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SparklesIcon,
  SunIcon,
  MoonIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui';

interface Bill {
  id: number;
  roomId: number;
  roomNumber: string;
  buildingName: string;
  period: string;
  year: number;
  month: number;
  startMeterReading: number;
  endMeterReading: number;
  electricityUsage: number;
  electricityCost: number;
  hotWaterUsage: number;
  hotWaterCost: number;
  coldWaterUsage: number;
  coldWaterCost: number;
  totalCost: number;
}

interface ImportResult {
  success: boolean;
  message: string;
  results?: {
    success: number;
    failed: number;
    errors: { roomNumber: string; reason: string }[];
  };
}

function FeeStatCard({
  title,
  amount,
  change,
  changeType,
  icon: Icon,
  color,
}: {
  title: string;
  amount: string;
  change?: string;
  changeType?: 'up' | 'down';
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
          <p className="text-2xl font-bold text-slate-900">{amount}</p>
          {change && (
            <p className={`text-sm mt-1 ${changeType === 'up' ? 'text-emerald-600' : 'text-red-600'}`}>
              {change}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
}

interface EditBillData {
  id: number;
  startMeterReading: number;
  endMeterReading: number;
  electricityUsage: number;
  electricityCost: number;
  hotWaterCost: number;
  coldWaterCost: number;
}

function EditBillModal({
  bill,
  onClose,
  onSave,
  electricityPrice,
}: {
  bill: Bill | null;
  onClose: () => void;
  onSave: (data: EditBillData) => void;
  electricityPrice: number;
}) {
  const [formData, setFormData] = useState<EditBillData>({
    id: bill?.id || 0,
    startMeterReading: 0,
    endMeterReading: 0,
    electricityUsage: bill?.electricityUsage || 0,
    electricityCost: bill?.electricityCost || 0,
    hotWaterCost: bill?.hotWaterCost || 0,
    coldWaterCost: bill?.coldWaterCost || 0,
  });

  useEffect(() => {
    if (bill) {
      setFormData({
        id: bill.id,
        startMeterReading: bill.startMeterReading || 0,
        endMeterReading: bill.endMeterReading || bill.electricityUsage || 0,
        electricityUsage: bill.electricityUsage,
        electricityCost: bill.electricityCost,
        hotWaterCost: bill.hotWaterCost,
        coldWaterCost: bill.coldWaterCost,
      });
    }
  }, [bill]);

  useEffect(() => {
    const usage = Math.abs(formData.endMeterReading - formData.startMeterReading);
    const cost = usage * electricityPrice;
    setFormData(prev => ({ ...prev, electricityUsage: usage, electricityCost: cost }));
  }, [formData.startMeterReading, formData.endMeterReading, electricityPrice]);

  if (!bill) return null;

  const totalAmount = formData.electricityCost + formData.hotWaterCost + formData.coldWaterCost;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">编辑账单</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg">
            <XMarkIcon className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-slate-500 mb-1">房间</p>
            <p className="text-base font-medium text-slate-900">{bill.roomNumber}</p>
          </div>

          <div>
            <p className="text-sm text-slate-500 mb-1">账单周期</p>
            <p className="text-base font-medium text-slate-900">{bill.period}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                起始电数
              </label>
              <input
                type="number"
                step="1"
                value={formData.startMeterReading || ''}
                onChange={(e) => setFormData({ ...formData, startMeterReading: parseInt(e.target.value) || 0 })}
                className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm
                         text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200
                         outline-none"
                placeholder="起始读数"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                结束电数
              </label>
              <input
                type="number"
                step="1"
                value={formData.endMeterReading || ''}
                onChange={(e) => setFormData({ ...formData, endMeterReading: parseInt(e.target.value) || 0 })}
                className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm
                         text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200
                         outline-none"
                placeholder="结束读数"
              />
            </div>
          </div>

          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">使用电数</span>
              <span className="text-base font-medium text-slate-900">{formData.electricityUsage} 度</span>
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="text-sm text-slate-600">电费 (¥{electricityPrice}/度)</span>
              <span className="text-base font-medium text-blue-900">¥{formData.electricityCost.toFixed(2)}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              热水费 (元)
            </label>
            <input
              type="number"
              step="1"
              value={formData.hotWaterCost}
              onChange={(e) => setFormData({ ...formData, hotWaterCost: parseInt(e.target.value) || 0 })}
              className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm
                       text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200
                       outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              冷水费 (元)
            </label>
            <input
              type="number"
              step="1"
              value={formData.coldWaterCost}
              onChange={(e) => setFormData({ ...formData, coldWaterCost: parseInt(e.target.value) || 0 })}
              className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm
                       text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200
                       outline-none"
            />
          </div>

          <div className="pt-4 border-t border-slate-100">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-slate-700">合计</span>
              <span className="text-lg font-bold text-blue-900">¥{totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-4 mt-8">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 border border-slate-200 text-slate-700 text-base font-medium rounded-lg hover:bg-slate-50 transition-colors"
          >
            取消
          </button>
          <button
            onClick={() => onSave(formData)}
            className="flex-1 px-6 py-3 bg-blue-600 text-white text-base font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

interface Room {
  id: number;
  roomNumber: string;
  status: string;
  building: {
    name: string;
  };
  person: { id: number }[];
}

interface AddBillFormData {
  roomId: number;
  personId: number;
  startDate: string;
  endDate: string;
  startMeterReading: number;
  endMeterReading: number;
  electricityUsage: number;
  electricityCost: number;
  hotWaterCost: number;
  coldWaterCost: number;
}

function AddBillModal({
  isOpen,
  onClose,
  onSave,
  rooms,
  electricityPrice,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: AddBillFormData) => void;
  rooms: Room[];
  electricityPrice: number;
}) {
  const [formData, setFormData] = useState<AddBillFormData>({
    roomId: 0,
    personId: 0,
    startDate: '',
    endDate: '',
    startMeterReading: 0,
    endMeterReading: 0,
    electricityUsage: 0,
    electricityCost: 0,
    hotWaterCost: 0,
    coldWaterCost: 0,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      setFormData({
        roomId: 0,
        personId: 0,
        startDate: '',
        endDate: '',
        startMeterReading: 0,
        endMeterReading: 0,
        electricityUsage: 0,
        electricityCost: 0,
        hotWaterCost: 0,
        coldWaterCost: 0,
      });
      setErrors({});
    }
  }, [isOpen]);

  useEffect(() => {
    const usage = Math.abs(formData.endMeterReading - formData.startMeterReading);
    const cost = parseFloat((usage * electricityPrice).toFixed(2));
    setFormData(prev => ({ ...prev, electricityUsage: usage, electricityCost: cost }));
  }, [formData.startMeterReading, formData.endMeterReading, electricityPrice]);

  const handleRoomChange = (roomId: number) => {
    const room = rooms.find(r => r.id === roomId);
    const personId = room?.person?.[0]?.id || 0;
    setFormData(prev => ({ ...prev, roomId, personId }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.roomId) newErrors.roomId = '请选择房间';
    if (!formData.startDate) newErrors.startDate = '请选择起始日期';
    if (!formData.endDate) newErrors.endDate = '请选择结束日期';
    if (formData.startDate && formData.endDate && formData.startDate > formData.endDate) {
      newErrors.endDate = '结束日期不能早于起始日期';
    }
    if (formData.endMeterReading <= formData.startMeterReading) {
      newErrors.electricityUsage = '结束电数必须大于起始电数';
    }
    if (formData.electricityUsage <= 0) newErrors.electricityUsage = '请填写使用度数';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validate()) {
      onSave(formData);
    }
  };

  if (!isOpen) return null;

  const totalAmount = formData.electricityCost + formData.hotWaterCost + formData.coldWaterCost;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-slate-900">新增账单</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg">
            <XMarkIcon className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              房间 <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.roomId || ''}
              onChange={(e) => handleRoomChange(parseInt(e.target.value))}
              className={`w-full h-10 px-3 border rounded-lg text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none ${errors.roomId ? 'border-red-500' : 'border-slate-200'}`}
            >
              <option value="">请选择房间</option>
              {rooms
                .filter((room) => room.status !== 'CLOSED' && room.person.length > 0)
                .map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.roomNumber} ({room.building.name})
                  </option>
                ))}
            </select>
            {errors.roomId && <p className="text-xs text-red-500 mt-1">{errors.roomId}</p>}
            {rooms.filter((room) => room.status !== 'CLOSED' && room.person.length > 0).length === 0 && (
              <p className="text-xs text-amber-600 mt-1">暂无可用的已入住房间</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                起始日期 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className={`w-full h-10 px-3 border rounded-lg text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none ${errors.startDate ? 'border-red-500' : 'border-slate-200'}`}
              />
              {errors.startDate && <p className="text-xs text-red-500 mt-1">{errors.startDate}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                结束日期 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className={`w-full h-10 px-3 border rounded-lg text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none ${errors.endDate ? 'border-red-500' : 'border-slate-200'}`}
              />
              {errors.endDate && <p className="text-xs text-red-500 mt-1">{errors.endDate}</p>}
            </div>
          </div>

          {formData.endDate && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">
                账单周期: <span className="font-medium">{formData.startDate} 至 {formData.endDate}</span>
              </p>
              <p className="text-xs text-blue-600 mt-1">
                将保存为 {new Date(formData.endDate).getFullYear()}年{new Date(formData.endDate).getMonth() + 1}月 账单
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                起始电数 <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="1"
                value={formData.startMeterReading || ''}
                onChange={(e) => setFormData({ ...formData, startMeterReading: parseInt(e.target.value) || 0 })}
                className={`w-full h-10 px-3 border rounded-lg text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none ${errors.electricityUsage ? 'border-red-500' : 'border-slate-200'}`}
                placeholder="起始读数"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                结束电数 <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="1"
                value={formData.endMeterReading || ''}
                onChange={(e) => setFormData({ ...formData, endMeterReading: parseInt(e.target.value) || 0 })}
                className={`w-full h-10 px-3 border rounded-lg text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none ${errors.electricityUsage ? 'border-red-500' : 'border-slate-200'}`}
                placeholder="结束读数"
              />
            </div>
          </div>

          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">使用电数</span>
              <span className="text-base font-medium text-slate-900">{formData.electricityUsage} 度</span>
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="text-sm text-slate-600">电费 (¥{electricityPrice.toFixed(2)}/度)</span>
              <span className="text-base font-medium text-blue-900">¥{formData.electricityCost.toFixed(2)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                热水费 (元)
              </label>
              <input
                type="number"
                step="1"
                value={formData.hotWaterCost || ''}
                onChange={(e) => setFormData({ ...formData, hotWaterCost: parseInt(e.target.value) || 0 })}
                className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                冷水费 (元)
              </label>
              <input
                type="number"
                step="1"
                value={formData.coldWaterCost || ''}
                onChange={(e) => setFormData({ ...formData, coldWaterCost: parseInt(e.target.value) || 0 })}
                className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                placeholder="0"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-slate-700">合计</span>
              <span className="text-xl font-bold text-blue-900">¥{totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-4 mt-8">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 border border-slate-200 text-slate-700 text-base font-medium rounded-lg hover:bg-slate-50 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-6 py-3 bg-blue-600 text-white text-base font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

function ImportResultModal({
  result,
  onClose,
}: {
  result: ImportResult;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">导入结果</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg">
            <XMarkIcon className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {result.success ? (
          <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-lg mb-4">
            <CheckCircleIcon className="w-8 h-8 text-emerald-500" />
            <div>
              <p className="font-medium text-emerald-700">{result.message}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg mb-4">
            <ExclamationCircleIcon className="w-8 h-8 text-red-500" />
            <div>
              <p className="font-medium text-red-700">{result.message}</p>
            </div>
          </div>
        )}

        {result.results && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-emerald-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-emerald-600">{result.results.success}</p>
                <p className="text-sm text-emerald-600">成功</p>
              </div>
              <div className="p-3 bg-red-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-red-600">{result.results.failed}</p>
                <p className="text-sm text-red-600">失败</p>
              </div>
            </div>

            {result.results.errors.length > 0 && (
              <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-slate-600">房间</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-600">失败原因</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {result.results.errors.map((error, idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-2 text-slate-900">{error.roomNumber}</td>
                        <td className="px-3 py-2 text-red-600">{error.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full mt-4 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          关闭
        </button>
      </div>
    </div>
  );
}

export default function FeesPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [availablePeriods, setAvailablePeriods] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [deletingBill, setDeletingBill] = useState<Bill | null>(null);
  const [selectedBillIds, setSelectedBillIds] = useState<number[]>([]);
  const [isBatchDelete, setIsBatchDelete] = useState(false);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportPeriod, setExportPeriod] = useState<string>('');
  const [rooms, setRooms] = useState<Room[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [electricityPrice, setElectricityPrice] = useState(0.65);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings?category=fees');
        const data = await res.json();
        if (data.fees?.electricityPrice) {
          setElectricityPrice(parseFloat(data.fees.electricityPrice));
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      }
    };
    fetchSettings();
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const res = await fetch('/api/rooms');
      const data = await res.json();
      setRooms(data.data || []);
    } catch (error) {
      console.error('Error fetching rooms:', error);
    }
  };

  const fetchBills = async () => {
    try {
      const res = await fetch('/api/bills');
      const data = await res.json();

      const mappedBills: Bill[] = (data || []).map((b: any) => {
        const electricityCost = b.electricity ? b.electricity * electricityPrice : 0;
        const hotWaterCost = b.hotWater ? b.hotWater : 0;
        const coldWaterCost = b.coldWater ? b.coldWater : 0;
        return {
          id: b.id,
          roomId: b.person?.roomId || 0,
          roomNumber: b.person?.room?.roomNumber || '未知',
          buildingName: b.person?.building?.name || '未知',
          period: `${b.year}-${String(b.month).padStart(2, '0')}`,
          year: b.year,
          month: b.month,
          startMeterReading: b.startMeterReading || 0,
          endMeterReading: b.endMeterReading || 0,
          electricityUsage: b.electricity || 0,
          electricityCost,
          hotWaterUsage: b.hotWater || 0,
          hotWaterCost,
          coldWaterUsage: b.coldWater || 0,
          coldWaterCost,
          totalCost: b.totalAmount || 0,
        };
      });

      // 提取所有唯一的年月组合
      const periods = new Set<string>();
      mappedBills.forEach((bill) => {
        periods.add(`${bill.year}-${String(bill.month).padStart(2, '0')}`);
      });
      // 按时间倒序排列
      const sortedPeriods = Array.from(periods).sort().reverse();
      setAvailablePeriods(sortedPeriods);

      setBills(mappedBills);
    } catch (error) {
      console.error('Error fetching bills:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, [electricityPrice]);

  // 获取最新账单月份
  const getLatestPeriod = () => {
    if (bills.length === 0) return null;
    const sortedBills = [...bills].sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
    return sortedBills[0];
  };

  const latestPeriod = getLatestPeriod();

  // 页面加载时自动选择最新月份
  useEffect(() => {
    if (availablePeriods.length > 0 && !selectedPeriod) {
      setSelectedPeriod(availablePeriods[0]);
    }
  }, [availablePeriods, selectedPeriod]);

  // 根据筛选月份计算统计数据
  const getFilteredBills = () => {
    return bills.filter((bill) => {
      const matchSearch =
        bill.roomNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bill.buildingName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchPeriod = !selectedPeriod || bill.period === selectedPeriod;
      return matchSearch && matchPeriod;
    });
  };

  const filteredBills = getFilteredBills();

  const stats = {
    totalAmount: filteredBills.reduce((sum, b) => sum + b.totalCost, 0),
    electricityAmount: filteredBills.reduce((sum, b) => sum + b.electricityCost, 0),
    hotWaterAmount: filteredBills.reduce((sum, b) => sum + b.hotWaterCost, 0),
    coldWaterAmount: filteredBills.reduce((sum, b) => sum + b.coldWaterCost, 0),
  };

  const currentPeriodText = selectedPeriod
    ? (() => {
        const [year, month] = selectedPeriod.split('-');
        return `${year}年${parseInt(month)}月`;
      })()
    : '全部月份';

  const handleExport = () => {
    // 默认选择最新的月份
    if (availablePeriods.length > 0) {
      setExportPeriod(availablePeriods[0]);
    }
    setIsExportModalOpen(true);
  };

  const handleExportConfirm = () => {
    // 根据选择的年月筛选账单并导出
    const billsToExport = exportPeriod === 'all'
      ? bills
      : bills.filter(bill => bill.period === exportPeriod);

    if (billsToExport.length === 0) {
      alert('所选月份没有账单数据');
      return;
    }

    // 准备 Excel 数据，与导入格式一致
    const exportData = billsToExport.map(bill => ({
      '房间号': bill.roomNumber,
      '起始电数': bill.startMeterReading,
      '结束电数': bill.endMeterReading,
      '使用电数': bill.electricityUsage,
      '电费': bill.electricityCost,
      '冷水费': bill.coldWaterCost,
      '热水费': bill.hotWaterCost,
    }));

    // 创建工作簿
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '账单数据');

    // 导出文件，格式：202602月水电费.xlsx
    let fileName: string;
    if (exportPeriod === 'all') {
      fileName = '全部月份水电费.xlsx';
    } else {
      const [year, month] = exportPeriod.split('-');
      fileName = `${year}${month.padStart(2, '0')}月水电费.xlsx`;
    }
    XLSX.writeFile(wb, fileName);

    setIsExportModalOpen(false);
  };

  const handleAutoGenerate = () => {
    window.location.href = '/admin/fees/calculate';
  };

  const handleEditBill = async (data: EditBillData) => {
    try {
      const totalAmount = data.electricityCost + data.hotWaterCost + data.coldWaterCost;

      const response = await fetch(`/api/bills/${data.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          electricity: data.electricityUsage,
          startMeterReading: data.startMeterReading,
          endMeterReading: data.endMeterReading,
          hotWater: data.hotWaterCost,
          coldWater: data.coldWaterCost,
          totalAmount: totalAmount,
        }),
      });

      if (response.ok) {
        setEditingBill(null);
        fetchBills();
      } else {
        const error = await response.json();
        alert(error.error || '更新账单失败');
      }
    } catch (error) {
      console.error('Error updating bill:', error);
      alert('更新账单失败');
    }
  };

  const handleDeleteBill = async () => {
    if (!deletingBill) return;

    try {
      const response = await fetch(`/api/bills/${deletingBill.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setDeletingBill(null);
        fetchBills();
      } else {
        const error = await response.json();
        alert(error.error || '删除账单失败');
      }
    } catch (error) {
      console.error('Error deleting bill:', error);
      alert('删除账单失败');
    }
  };

  const handleBatchDelete = () => {
    if (selectedBillIds.length === 0) {
      alert('请先选择要删除的账单');
      return;
    }
    setIsBatchDelete(true);
    setDeletingBill(null);
  };

  const handleBatchDeleteConfirm = async () => {
    if (selectedBillIds.length === 0) return;

    setIsBatchDeleting(true);
    try {
      const response = await fetch('/api/bills/batch-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ids: selectedBillIds,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSelectedBillIds([]);
        setIsBatchDelete(false);
        fetchBills();
      } else {
        alert(result.error || '批量删除失败');
      }
    } catch (error) {
      console.error('Error batch deleting bills:', error);
      alert('批量删除失败');
    } finally {
      setIsBatchDeleting(false);
    }
  };

  const handleAddBill = async (formData: AddBillFormData) => {
    try {
      if (!formData.personId) {
        alert('该房间暂无住户，无法创建账单');
        return;
      }

      const endDate = new Date(formData.endDate);
      const year = endDate.getFullYear();
      const month = endDate.getMonth() + 1;
      const totalAmount = formData.electricityCost + formData.hotWaterCost + formData.coldWaterCost;

      const response = await fetch('/api/bills', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personId: formData.personId,
          year,
          month,
          electricity: formData.electricityUsage,
          startMeterReading: formData.startMeterReading,
          endMeterReading: formData.endMeterReading,
          hotWater: formData.hotWaterCost,
          coldWater: formData.coldWaterCost,
          totalAmount,
          status: 'UNPAID',
        }),
      });

      if (response.ok) {
        setIsAddModalOpen(false);
        fetchBills();
      } else {
        const error = await response.json();
        alert(error.error || '创建账单失败');
      }
    } catch (error) {
      console.error('Error creating bill:', error);
      alert('创建账单失败');
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const parseYearMonthFromFileName = (fileName: string): { year: number; month: number } | null => {
    // 格式：202602月水电费.xlsx
    const match = fileName.match(/(\d{4})(\d{2})月/);
    if (match) {
      const year = parseInt(match[1]);
      const month = parseInt(match[2]);
      return { year, month };
    }
    return null;
  };

  const parseMeterReading = (colName: string): number | null => {
    const match = colName.match(/(\d+)月(\d+)日/);
    if (match) {
      return parseInt(match[2]);
    }
    return null;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx')) {
      setImportResult({
        success: false,
        message: '请选择有效的Excel文件(.xlsx)',
      });
      return;
    }

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as (string | number | undefined)[][];

      if (!rawData || rawData.length < 2) {
        setImportResult({
          success: false,
          message: '文件为空或无法解析',
        });
        return;
      }

      const headers = rawData[0].map(h => String(h || '').trim());

      const roomColIndex = headers.findIndex(h => h.includes('房间号'));
      const startMeterColIndex = headers.findIndex(h => h.includes('起始电数') || (h.match(/\d+月\d+日/) && !h.includes('1月')));
      const endMeterColIndex = headers.findIndex(h => h.includes('结束电数') || h.match(/1月\d+日/));
      const electricityDegreeColIndex = headers.findIndex(h => h.includes('使用电数') || h.match(/^\d+月份电度数$/) || h.includes('实际使用'));
      const electricityCostColIndex = headers.findIndex(h => h === '电费' || (h.includes('电费') && !h.includes('电度数') && !h.includes('起始') && !h.includes('结束') && !h.includes('使用')));
      const hotWaterCostColIndex = headers.findIndex(h => h.includes('热水费'));
      const coldWaterCostColIndex = headers.findIndex(h => h.includes('冷水费'));

      if (roomColIndex === -1) {
        setImportResult({
          success: false,
          message: 'Excel格式不符合预期，请检查列名（需包含"房间号"列）',
        });
        return;
      }

      const yearMonth = parseYearMonthFromFileName(file.name);
      if (!yearMonth) {
        setImportResult({
          success: false,
          message: '无法从文件名识别年月，请将文件命名为如"202602月水电费.xlsx"',
        });
        return;
      }

      const billsToImport = rawData.slice(1).map(row => {
        const roomNumber = row[roomColIndex];
        let electricityUsage = 0;
        let electricityCost = 0;
        let startMeterReading = 0;
        let endMeterReading = 0;

        // 提取起始电数和结束电数
        if (startMeterColIndex !== -1) {
          const val = row[startMeterColIndex];
          startMeterReading = typeof val === 'number' ? val : (parseFloat(String(val)) || 0);
        }
        if (endMeterColIndex !== -1) {
          const val = row[endMeterColIndex];
          endMeterReading = typeof val === 'number' ? val : (parseFloat(String(val)) || 0);
        }

        // 优先使用"使用电数"列，如果为0或空，则计算起始电数和结束电数的差值
        if (electricityDegreeColIndex !== -1) {
          const val = row[electricityDegreeColIndex];
          const degreeValue = typeof val === 'number' ? val : (parseFloat(String(val)) || 0);
          electricityUsage = degreeValue > 0 ? degreeValue : 0;
        }

        // 如果使用电数为0，尝试用起始电数和结束电数计算
        if (electricityUsage === 0 && startMeterReading > 0 && endMeterReading > 0) {
          electricityUsage = Math.abs(endMeterReading - startMeterReading);
        }

        // 电费：如果Excel中有值且大于0则使用，否则自动计算
        if (electricityCostColIndex !== -1) {
          const val = row[electricityCostColIndex];
          const costValue = typeof val === 'number' ? val : (parseFloat(String(val)) || 0);
          electricityCost = costValue > 0 ? costValue : electricityUsage * electricityPrice;
        } else {
          electricityCost = electricityUsage * electricityPrice;
        }

        const hotWaterCost = hotWaterCostColIndex !== -1 ? (() => {
          const val = row[hotWaterCostColIndex];
          if (val === undefined || val === null || val === '') return 0;
          const num = typeof val === 'number' ? val : parseFloat(String(val));
          return isNaN(num) ? 0 : num;
        })() : 0;
        const coldWaterCost = coldWaterCostColIndex !== -1 ? (() => {
          const val = row[coldWaterCostColIndex];
          if (val === undefined || val === null || val === '') return 0;
          const num = typeof val === 'number' ? val : parseFloat(String(val));
          return isNaN(num) ? 0 : num;
        })() : 0;
        const totalAmount = electricityCost + hotWaterCost + coldWaterCost;

        return {
          roomNumber: String(roomNumber || '').trim(),
          electricityUsage,
          electricityCost,
          startMeterReading,
          endMeterReading,
          hotWaterCost,
          coldWaterCost,
          totalAmount,
        };
      }).filter(b => b.roomNumber && b.roomNumber !== '');

      const response = await fetch('/api/bills/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bills: billsToImport,
          year: yearMonth.year,
          month: yearMonth.month,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setImportResult({
          success: true,
          message: result.message,
          results: result.results,
        });
        fetchBills();
      } else {
        setImportResult({
          success: false,
          message: result.error || '导入失败',
        });
      }
    } catch (error) {
      console.error('Error importing bills:', error);
      setImportResult({
        success: false,
        message: '文件解析失败，请检查文件格式是否正确',
      });
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {importResult && (
        <ImportResultModal result={importResult} onClose={() => setImportResult(null)} />
      )}

      <AddBillModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleAddBill}
        rooms={rooms}
        electricityPrice={electricityPrice}
      />

      {editingBill && (
        <EditBillModal
          bill={editingBill}
          onClose={() => setEditingBill(null)}
          onSave={handleEditBill}
          electricityPrice={electricityPrice}
        />
      )}

      {deletingBill && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <TrashIcon className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">确认删除</h3>
            </div>
            <p className="text-slate-600 mb-6">
              确定要删除 <span className="font-medium text-slate-900">{deletingBill.roomNumber}</span> 的账单吗？此操作不可恢复。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingBill(null)}
                className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleDeleteBill}
                className="flex-1 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      {isBatchDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <TrashIcon className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">确认批量删除</h3>
            </div>
            <p className="text-slate-600 mb-6">
              确定要删除选中的 <span className="font-medium text-slate-900">{selectedBillIds.length}</span> 条账单吗？此操作不可恢复。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setIsBatchDelete(false);
                  setSelectedBillIds([]);
                }}
                disabled={isBatchDeleting}
                className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={handleBatchDeleteConfirm}
                disabled={isBatchDeleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isBatchDeleting ? '删除中...' : '删除'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isExportModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">导出账单</h3>
              <button onClick={() => setIsExportModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                <XMarkIcon className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  选择月份
                </label>
                <select
                  value={exportPeriod}
                  onChange={(e) => setExportPeriod(e.target.value)}
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm
                           text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200
                           outline-none cursor-pointer"
                >
                  <option value="all">全部月份</option>
                  {availablePeriods.map((period) => {
                    const [year, month] = period.split('-');
                    return (
                      <option key={period} value={period}>
                        {year}年{parseInt(month)}月
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="text-sm text-slate-500">
                将导出 {exportPeriod === 'all' ? '所有月份' : `${exportPeriod.split('-')[0]}年${parseInt(exportPeriod.split('-')[1])}月`} 的账单数据
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleExportConfirm}
                className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                导出
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-blue-900">费用管理</h1>
          <p className="text-sm text-slate-500 mt-1">水电费用抄表、账单生成与费用结算</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".xlsx"
            className="hidden"
          />
          <Button variant="primary" onClick={() => setIsAddModalOpen(true)}>
            <PlusIcon className="w-4 h-4 mr-2" />
            新增账单
          </Button>
          <Button variant="success" onClick={handleImportClick}>
            <ArrowUpTrayIcon className="w-4 h-4 mr-2" />
            导入账单
          </Button>
          <Button variant="info" onClick={handleExport}>
            <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
            导出账单
          </Button>
          <Link href="/admin/fees/calculate">
            <Button variant="info" className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 focus:ring-purple-300">
              <CalculatorIcon className="w-4 h-4 mr-2" />
              计算费用
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <FeeStatCard
          title="应收总额"
          amount={`¥${stats.totalAmount.toLocaleString()}`}
          change={currentPeriodText}
          icon={CurrencyYenIcon}
          color="bg-blue-500"
        />
        <FeeStatCard
          title="电费总额"
          amount={`¥${stats.electricityAmount.toLocaleString()}`}
          change={currentPeriodText}
          icon={SparklesIcon}
          color="bg-amber-500"
        />
        <FeeStatCard
          title="热水费总额"
          amount={`¥${stats.hotWaterAmount.toLocaleString()}`}
          change={currentPeriodText}
          icon={SunIcon}
          color="bg-orange-500"
        />
        <FeeStatCard
          title="冷水费总额"
          amount={`¥${stats.coldWaterAmount.toLocaleString()}`}
          change={currentPeriodText}
          icon={MoonIcon}
          color="bg-cyan-500"
        />
      </div>

      <div className="bg-white rounded-xl shadow-md p-4">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="h-10 px-3 border border-slate-200 rounded-lg text-sm
                     text-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-200
                     outline-none cursor-pointer"
          >
            <option value="">全部月份</option>
            {availablePeriods.map((period) => {
              const [year, month] = period.split('-');
              return (
                <option key={period} value={period}>
                  {year}年{parseInt(month)}月
                </option>
              );
            })}
          </select>

          <div className="relative flex-1 min-w-[200px] max-w-[300px]">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="搜索房间号..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-4 border border-slate-200 rounded-lg
                       text-sm text-slate-900 placeholder-slate-400
                       focus:border-blue-500 focus:ring-2 focus:ring-blue-200
                       outline-none"
            />
          </div>

          {selectedBillIds.length > 0 && (
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm text-blue-700">
                已选择 {selectedBillIds.length} 项
              </span>
              <button
                onClick={handleBatchDelete}
                className="flex items-center gap-1 h-9 px-3 bg-red-50 text-red-600 text-sm font-medium rounded-lg hover:bg-red-100 transition-colors cursor-pointer"
              >
                <TrashIcon className="w-4 h-4" />
                批量删除
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 text-slate-600 text-sm">
              <tr>
                <th className="px-4 py-3 text-left font-medium w-[5%]">
                  <input
                    type="checkbox"
                    checked={filteredBills.length > 0 && selectedBillIds.length === filteredBills.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedBillIds(filteredBills.map(b => b.id));
                      } else {
                        setSelectedBillIds([]);
                      }
                    }}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th className="px-4 py-3 text-left font-medium w-[12%]">房间号</th>
                <th className="px-4 py-3 text-left font-medium w-[12%]">账单周期</th>
                <th className="px-4 py-3 text-left font-medium w-[14%]">电费</th>
                <th className="px-4 py-3 text-left font-medium w-[14%]">热水费</th>
                <th className="px-4 py-3 text-left font-medium w-[14%]">冷水费</th>
                <th className="px-4 py-3 text-left font-medium w-[14%]">合计</th>
                <th className="px-4 py-3 text-center font-medium w-[15%]">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      加载中...
                    </div>
                  </td>
                </tr>
              ) : filteredBills.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                    <CurrencyYenIcon className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                    <p>暂无账单数据</p>
                  </td>
                </tr>
              ) : (
                filteredBills
                  .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                  .map((bill) => (
                    <tr key={bill.id} className="hover:bg-blue-50 transition-colors">
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedBillIds.includes(bill.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedBillIds([...selectedBillIds, bill.id]);
                            } else {
                              setSelectedBillIds(selectedBillIds.filter(id => id !== bill.id));
                            }
                          }}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <HomeIcon className="w-4 h-4 text-slate-400" />
                          <div>
                            <p className="text-sm font-medium text-slate-900">{bill.roomNumber}</p>
                            <p className="text-xs text-slate-500">{bill.buildingName}</p>
                          </div>
                        </div>
                      </td>
                    <td className="px-4 py-4 text-left text-slate-700">{bill.period}</td>
                    <td className="px-4 py-4 text-left">
                      <p className="text-sm font-medium text-slate-900">¥{bill.electricityCost.toFixed(2)}</p>
                      <p className="text-xs text-slate-500">{bill.electricityUsage}度</p>
                    </td>
                    <td className="px-4 py-4 text-left">
                      <p className="text-sm font-medium text-slate-900">¥{bill.hotWaterCost.toFixed(2)}</p>
                    </td>
                    <td className="px-4 py-4 text-left">
                      <p className="text-sm font-medium text-slate-900">¥{bill.coldWaterCost.toFixed(2)}</p>
                    </td>
                    <td className="px-4 py-4 text-left">
                      <p className="text-sm font-bold text-blue-900">¥{bill.totalCost.toFixed(2)}</p>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => setEditingBill(bill)}
                        >
                          <PencilIcon className="w-4 h-4 mr-1" />
                          编辑
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setDeletingBill(bill)}
                        >
                          <TrashIcon className="w-4 h-4 mr-1" />
                          删除
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500">
              显示 {(currentPage - 1) * pageSize + 1} -{' '}
              {Math.min(currentPage * pageSize, filteredBills.length)} 共{' '}
              {filteredBills.length} 条
            </span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 text-sm border border-slate-200 rounded focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
            >
              <option value={10}>10 条/页</option>
              <option value={20}>20 条/页</option>
              <option value={50}>50 条/页</option>
              <option value={100}>100 条/页</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
            >
              <ChevronLeftIcon className="w-4 h-4" />
            </Button>
            {(() => {
              const totalPages = Math.ceil(filteredBills.length / pageSize) || 1;
              return Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              });
            })()}
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= Math.ceil(filteredBills.length / pageSize)}
              onClick={() => setCurrentPage(prev => prev + 1)}
            >
              <ChevronRightIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
