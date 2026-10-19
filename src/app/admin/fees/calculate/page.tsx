'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BuildingOfficeIcon,
  HomeIcon,
  CheckIcon,
  ArrowLeftIcon,
  BuildingLibraryIcon,
  CalendarIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';

interface Building {
  id: number;
  name: string;
  floors: number;
  room?: Room[];
}

interface Room {
  id: number;
  buildingId: number;
  roomNumber: string;
  floorNumber: number;
  bedCount: number;
  status: string;
  building?: Building;
}

interface Person {
  id: number;
  name: string;
  employeeId: string;
}

interface MonthOption {
  year: number;
  month: number;
  label: string;
  isLatest?: boolean;
}

interface Occupant {
  personId: number;
  name: string;
  employeeId: string;
  gender: string | null;
  checkInDate: string;
  checkOutDate: string;
  daysInRoom: number;
}

interface PerCapitaRoomData {
  roomId: number;
  roomNumber: string;
  occupants: Occupant[];
  daysInMonth: number;
}

export default function FeesCalculatePage() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBuilding, setSelectedBuilding] = useState<number | null>(null);
  const [selectedRooms, setSelectedRooms] = useState<number[]>([]);
  const [exporting, setExporting] = useState(false);

  // 人均日均分摊法状态
  const [showPerCapitaModal, setShowPerCapitaModal] = useState(false);
  const [perCapitaRooms, setPerCapitaRooms] = useState<PerCapitaRoomData[]>([]);
  const [perCapitaLoading, setPerCapitaLoading] = useState(false);
  const [perCapitaExporting, setPerCapitaExporting] = useState(false);

  // 年月选择状态
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [availableMonths, setAvailableMonths] = useState<MonthOption[]>([]);
  const [latestBillDate, setLatestBillDate] = useState<{ year: number; month: number } | null>(null);

  // 生成最近12个月的可选月份列表
  const generateMonthOptions = (latestYear?: number, latestMonth?: number): MonthOption[] => {
    const options: MonthOption[] = [];
    const now = new Date();

    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const isLatest = latestYear !== undefined && latestMonth !== undefined
        && year === latestYear && month === latestMonth;

      options.push({
        year,
        month,
        label: `${year}年${month}月`,
        isLatest,
      });
    }
    return options;
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // 获取楼栋数据
        const buildingsRes = await fetch('/api/buildings');
        const buildingsData = await buildingsRes.json();
        setBuildings(buildingsData.data || []);

        // 获取最新账单月份
        const billsRes = await fetch('/api/bills');
        const billsData = await billsRes.json();

        let targetYear = now.getFullYear();
        let targetMonth = now.getMonth() + 1;

        // 从账单列表中找到最新的年月
        if (Array.isArray(billsData) && billsData.length > 0) {
          // 按年份和月份排序（降序）
          const sortedBills = [...billsData].sort((a, b) => {
            if (a.year !== b.year) return b.year - a.year;
            return b.month - a.month;
          });
          const latestBill = sortedBills[0];
          if (latestBill.year && latestBill.month) {
            targetYear = latestBill.year;
            targetMonth = latestBill.month;
            setLatestBillDate({ year: targetYear, month: targetMonth });
          }
        }

        // 生成可选月份列表
        const options = generateMonthOptions(targetYear, targetMonth);
        setAvailableMonths(options);

        // 设置默认选中的年月
        setSelectedYear(targetYear);
        setSelectedMonth(targetMonth);
      } catch (error) {
        console.error('Error fetching initial data:', error);
      } finally {
        setLoading(false);
      }
    };

    const now = new Date();
    fetchInitialData();
  }, []);

  useEffect(() => {
    const fetchRooms = async () => {
      if (!selectedBuilding) {
        setRooms([]);
        return;
      }
      try {
        const res = await fetch(`/api/rooms?buildingId=${selectedBuilding}`);
        const data = await res.json();
        // 只显示有人入住的房间（有入住人员）
        const occupiedRooms = (data.data || []).filter((room: Room) => {
          // 通过 person 数组判断是否有入住人员
          const persons = (room as any).person || [];
          return persons.length > 0;
        });
        setRooms(occupiedRooms);
      } catch (error) {
        console.error('Error fetching rooms:', error);
      }
    };
    fetchRooms();
  }, [selectedBuilding]);

  const handleSelectAll = () => {
    if (selectedRooms.length === rooms.length) {
      setSelectedRooms([]);
    } else {
      setSelectedRooms(rooms.map((r) => r.id));
    }
  };

  const handleRoomToggle = (roomId: number) => {
    setSelectedRooms((prev) =>
      prev.includes(roomId)
        ? prev.filter((id) => id !== roomId)
        : [...prev, roomId]
    );
  };

  const handleExport = async () => {
    if (selectedRooms.length === 0) {
      alert('请先选择房间');
      return;
    }
    setExporting(true);
    try {
      const roomIdsParam = selectedRooms.join(',');
      const res = await fetch(
        `/api/bills/export-split?year=${selectedYear}&month=${selectedMonth}&roomIds=${roomIdsParam}`
      );

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedYear}年${selectedMonth}月费用分摊.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        const data = await res.json();
        alert('导出失败: ' + (data.error || '未知错误'));
      }
    } catch (error) {
      console.error('Error exporting bills:', error);
      alert('导出失败，请稍后重试');
    } finally {
      setExporting(false);
    }
  };

  const selectedBuildingName = buildings.find((b) => b.id === selectedBuilding)?.name;

  const handlePerCapitaCalculate = async () => {
    if (selectedRooms.length === 0) {
      alert('请先选择房间');
      return;
    }

    setPerCapitaLoading(true);
    try {
      const roomsData: PerCapitaRoomData[] = [];

      for (const roomId of selectedRooms) {
        const res = await fetch(`/api/bills/room-occupants?roomId=${roomId}&year=${selectedYear}&month=${selectedMonth}`);
        const data = await res.json();

        if (data.success) {
          const room = rooms.find(r => r.id === roomId);
          roomsData.push({
            roomId,
            roomNumber: room?.roomNumber || '',
            occupants: data.data,
            daysInMonth: data.daysInMonth,
          });
        }
      }

      setPerCapitaRooms(roomsData);
      setShowPerCapitaModal(true);
    } catch (error) {
      console.error('Error loading occupants:', error);
      alert('加载人员数据失败');
    } finally {
      setPerCapitaLoading(false);
    }
  };

  const handleDaysChange = (roomId: number, personId: number, days: number) => {
    setPerCapitaRooms(prev =>
      prev.map(room => {
        if (room.roomId !== roomId) return room;
        return {
          ...room,
          occupants: room.occupants.map(occupant => {
            if (occupant.personId !== personId) return occupant;
            return { ...occupant, daysInRoom: Math.max(0, Math.min(days, room.daysInMonth)) };
          }),
        };
      })
    );
  };

  const handlePerCapitaExport = async () => {
    setPerCapitaExporting(true);
    try {
      // 构建 customDays 参数
      const customDays: Record<number, Record<number, number>> = {};
      for (const room of perCapitaRooms) {
        customDays[room.roomId] = {};
        for (const occupant of room.occupants) {
          customDays[room.roomId][occupant.personId] = occupant.daysInRoom;
        }
      }

      const res = await fetch('/api/bills/export-per-capita', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: selectedYear,
          month: selectedMonth,
          roomIds: selectedRooms,
          customDays,
        }),
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedYear}年${selectedMonth}月人均日均分摊.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        setShowPerCapitaModal(false);
      } else {
        const data = await res.json();
        alert('导出失败: ' + (data.error || '未知错误'));
      }
    } catch (error) {
      console.error('Error exporting per capita:', error);
      alert('导出失败，请稍后重试');
    } finally {
      setPerCapitaExporting(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link
          href="/admin/fees"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          返回费用管理
        </Link>
        <h1 className="text-2xl font-semibold text-blue-900">智能结算</h1>
        <p className="text-sm text-slate-500 mt-1">根据楼栋自动生成对应房间号的费用账单</p>
      </div>

      {/* 年月选择 */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <h2 className="text-lg font-medium text-slate-800 mb-4 flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-blue-600" />
          选择结算月份
        </h2>
        <div className="flex items-center gap-4">
          <select
            value={`${selectedYear}-${selectedMonth}`}
            onChange={(e) => {
              const [year, month] = e.target.value.split('-').map(Number);
              setSelectedYear(year);
              setSelectedMonth(month);
            }}
            className="h-10 px-3 border border-slate-200 rounded-lg text-sm text-slate-700
                     focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none
                     cursor-pointer min-w-[200px] bg-white"
          >
            {availableMonths.map((m) => (
              <option key={`${m.year}-${m.month}`} value={`${m.year}-${m.month}`}>
                {m.label} {m.isLatest && '(最新)'}
              </option>
            ))}
          </select>
          <p className="text-sm text-slate-500">
            将生成 {selectedYear}年{selectedMonth}月 的账单
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <h2 className="text-lg font-medium text-slate-800 mb-4 flex items-center gap-2">
          <BuildingOfficeIcon className="w-5 h-5 text-blue-600" />
          选择楼栋
        </h2>
        
        {loading ? (
          <div className="text-center py-8 text-slate-500">加载中...</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {buildings.map((building) => (
              <button
                key={building.id}
                onClick={() => {
                  setSelectedBuilding(building.id);
                  setSelectedRooms([]);
                }}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  selectedBuilding === building.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 hover:border-blue-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <BuildingLibraryIcon className="w-5 h-5 text-slate-400" />
                  <span className="font-medium text-slate-800">{building.name}</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">{building.floors} 层</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedBuilding && (
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-slate-800 flex items-center gap-2">
              <HomeIcon className="w-5 h-5 text-blue-600" />
              房间列表 - {selectedBuildingName}
            </h2>
            <button
              onClick={handleSelectAll}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 
                       hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
            >
              <CheckIcon className="w-4 h-4" />
              {selectedRooms.length === rooms.length ? '取消全选' : '全选'}
            </button>
          </div>

          {rooms.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              该楼栋暂无房间数据
            </div>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 max-h-[400px] overflow-y-auto">
              {rooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => handleRoomToggle(room.id)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    selectedRooms.includes(room.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    {selectedRooms.includes(room.id) && (
                      <CheckIcon className="w-4 h-4 text-blue-600" />
                    )}
                    <span className="font-medium text-slate-800">{room.roomNumber}</span>
                  </div>
                  <p className="text-xs text-slate-500 text-center mt-1">
                    {room.bedCount}床位
                  </p>
                </button>
              ))}
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
            <p className="text-sm text-slate-600">
              已选择 <span className="font-medium text-blue-600">{selectedRooms.length}</span> 个房间
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={handlePerCapitaCalculate}
                disabled={selectedRooms.length === 0 || perCapitaLoading}
                className={`flex items-center gap-2 px-6 py-2.5 font-medium rounded-lg transition-all cursor-pointer ${
                  selectedRooms.length === 0 || perCapitaLoading
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
              >
                {perCapitaLoading ? '加载中...' : '人均日均分摊'}
              </button>
              <button
                onClick={handleExport}
                disabled={selectedRooms.length === 0 || exporting}
                className={`flex items-center gap-2 px-6 py-2.5 font-medium rounded-lg transition-all cursor-pointer ${
                  selectedRooms.length === 0 || exporting
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-green-500 hover:bg-green-600 text-white'
                }`}
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                {exporting ? '导出中...' : '导出分摊表'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-amber-50 rounded-lg p-4 text-sm text-amber-800">
        <p className="font-medium mb-1">说明：</p>
        <ul className="list-disc list-inside space-y-1 text-amber-700">
          <li>系统默认选择最新的账单月份，您也可以选择其他月份进行结算</li>
          <li>请先选择需要结算的楼栋</li>
          <li>选择楼栋后，系统将自动加载该楼栋有人入住的房间</li>
          <li>您可以选择全部或部分房间进行批量导出</li>
          <li>点击&quot;导出分摊表&quot;可将费用按房间人数均分后导出为 Excel 表格</li>
          <li>点击&quot;人均日均分摊&quot;可按每人实际居住天数计算分摊费用</li>
        </ul>
      </div>

      {showPerCapitaModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-800">
                  人均日均分摊 — {selectedYear}年{selectedMonth}月
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  请核对并调整每人的实际居住天数，系统将按日均费用×天数计算分摊
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowPerCapitaModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  取消
                </button>
                <button
                  onClick={handlePerCapitaExport}
                  disabled={perCapitaExporting}
                  className={`flex items-center gap-2 px-6 py-2.5 font-medium rounded-lg transition-all cursor-pointer ${
                    perCapitaExporting
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : 'bg-green-500 hover:bg-green-600 text-white'
                  }`}
                >
                  {perCapitaExporting ? '导出中...' : '确认并导出'}
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {perCapitaRooms.map(room => (
                <div key={room.roomId} className="border border-slate-200 rounded-lg p-4">
                  <h3 className="font-medium text-slate-800 mb-3">
                    房间 {room.roomNumber}（当月{room.daysInMonth}天）
                  </h3>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-2 px-3">姓名</th>
                        <th className="text-left py-2 px-3">工号</th>
                        <th className="text-left py-2 px-3">入住日期</th>
                        <th className="text-left py-2 px-3">居住天数</th>
                        <th className="text-left py-2 px-3">说明</th>
                      </tr>
                    </thead>
                    <tbody>
                      {room.occupants.map(occupant => (
                        <tr key={occupant.personId} className="border-b border-slate-100">
                          <td className="py-2 px-3">{occupant.name}</td>
                          <td className="py-2 px-3">{occupant.employeeId}</td>
                          <td className="py-2 px-3">{occupant.checkInDate}</td>
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              min={0}
                              max={room.daysInMonth}
                              value={occupant.daysInRoom}
                              onChange={(e) => handleDaysChange(room.roomId, occupant.personId, parseInt(e.target.value) || 0)}
                              className="w-20 px-2 py-1 border border-slate-300 rounded text-center focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none"
                            />
                          </td>
                          <td className="py-2 px-3 text-slate-500">
                            {occupant.daysInRoom === room.daysInMonth ? '整月' :
                             occupant.daysInRoom === 0 ? '未入住' : '部分月份'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>

            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setShowPerCapitaModal(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={handlePerCapitaExport}
                disabled={perCapitaExporting}
                className={`flex items-center gap-2 px-6 py-2.5 font-medium rounded-lg transition-all cursor-pointer ${
                  perCapitaExporting
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-green-500 hover:bg-green-600 text-white'
                }`}
              >
                {perCapitaExporting ? '导出中...' : '确认并导出'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
