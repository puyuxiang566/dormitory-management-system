'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  WrenchIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  TrashIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import { useSession } from 'next-auth/react';
import { Button, Card, DataTable, Modal, useToastHelpers } from '@/components/ui';
import { DataTableColumn } from '@/components/ui';
import { getStatusLabel } from '@/lib/utils';

type DbStatus = 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

interface MaintenanceTicketRow {
  id: string;
  ticketNo: string;
  roomNo: string;
  building: string;
  reporterName: string;
  reporterPhone: string;
  title: string;
  description: string;
  status: DbStatus;
  assignedTo?: number | null;
  createdAt: string;
  completedAt?: string;
}

interface BuildingOption {
  id: number;
  name: string;
}

interface SelectableRoom {
  id: number;
  roomNumber: string;
}

const statusTabIcon: Record<string, React.ElementType> = {
  OPEN: ClockIcon,
  ASSIGNED: CheckCircleIcon,
  COMPLETED: CheckCircleIcon,
  CANCELLED: ExclamationCircleIcon,
};

function statusBadgeClass(status: string) {
  const map: Record<string, string> = {
    OPEN: 'bg-amber-100 text-amber-700',
    ASSIGNED: 'bg-blue-100 text-blue-700',
    IN_PROGRESS: 'bg-purple-100 text-purple-700',
    COMPLETED: 'bg-emerald-100 text-emerald-700',
    CANCELLED: 'bg-slate-100 text-slate-700',
  };
  return map[status] || 'bg-slate-100 text-slate-700';
}

function mapApiToRow(t: Record<string, unknown>): MaintenanceTicketRow {
  const createdAt = t.createdAt
    ? new Date(t.createdAt as string).toLocaleString('zh-CN')
    : '';
  const st = String(t.status || 'OPEN').toUpperCase() as DbStatus;
  // 优先使用后端返回的 reporterName，其次是 person.name，最后是未指定
  const reporterName = (t.reporterName as string)
    || (t.person as { name?: string } | null)?.name
    || (t.reportedBy as string)
    || '未指定';
  return {
    id: String(t.id),
    ticketNo: `WX${new Date(t.createdAt as string).toISOString().slice(0, 10).replace(/-/g, '')}${String(t.id).padStart(3, '0')}`,
    roomNo: (t.room as { roomNumber?: string } | null)?.roomNumber || '—',
    building: (t.room as { building?: { name?: string } } | null)?.building?.name || '—',
    reporterName: reporterName,
    reporterPhone: (t.person as { phone?: string } | null)?.phone || '',
    title: String(t.title || ''),
    description: String((t as { description?: string }).description || ''),
    status: st,
    assignedTo: (t as { assignedTo?: number | null }).assignedTo ?? null,
    createdAt,
    completedAt: t.resolvedAt
      ? new Date(t.resolvedAt as string).toLocaleString('zh-CN')
      : undefined,
  };
}

function getMaintenanceColumns(
  onComplete: (id: string) => void,
  onDelete: (ticket: MaintenanceTicketRow) => void,
  completingId: string | null,
  deletingId: string | null
): DataTableColumn<MaintenanceTicketRow>[] {
  return [
    {
      key: 'ticketNo',
      title: '工单号',
      width: '15%',
      render: (record) => (
        <span className="text-sm font-semibold text-blue-900">{record.ticketNo}</span>
      ),
    },
    {
      key: 'room',
      title: '报修房间',
      width: '11%',
      render: (record) => (
        <div>
          <span className="text-sm font-medium text-slate-700">
            {record.building} {record.roomNo}
          </span>
        </div>
      ),
    },
    {
      key: 'title',
      title: '问题描述',
      width: '23%',
      render: (record) => (
        <div className="max-w-full">
          <span className="text-sm text-slate-600 line-clamp-2" title={record.description}>
            {record.description || record.title}
          </span>
        </div>
      ),
    },
    {
      key: 'reporter',
      title: '报修人',
      width: '7%',
      render: (record) => (
        <div>
          <span className="text-sm text-slate-700">{record.reporterName}</span>
          {record.reporterPhone && (
            <span className="text-xs text-slate-500 ml-2">{record.reporterPhone}</span>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      title: '状态',
      width: '15%',
      align: 'center',
      render: (record) => {
        const StatusIcon = statusTabIcon[record.status] || ClockIcon;
        const label = getStatusLabel(record.status);
        return (
          <span
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusBadgeClass(record.status)}`}
          >
            <StatusIcon className="w-3.5 h-3.5" />
            {label}
          </span>
        );
      },
    },
    {
      key: 'createdAt',
      title: '报修时间',
      width: '15%',
      render: (record) => (
        <span className="text-sm text-slate-500">{record.createdAt}</span>
      ),
    },
    {
      key: 'actions',
      title: '操作',
      width: '14%',
      align: 'center',
      render: (record) => {
        const isCompleting = completingId === record.id;
        const isDeleting = deletingId === record.id;
        return (
          <div className="flex items-center justify-center gap-2">
            {record.status === 'OPEN' && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => onComplete(record.id)}
                disabled={isCompleting}
              >
                <CheckCircleIcon className="w-4 h-4 mr-1" />
                {isCompleting ? '完成中…' : '完成'}
              </Button>
            )}
            <Button
              variant="danger"
              size="sm"
              onClick={() => onDelete(record)}
              disabled={isDeleting}
            >
              <TrashIcon className="w-4 h-4 mr-1" />
              {isDeleting ? '删除中…' : '删除'}
            </Button>
          </div>
        );
      },
    },
  ];
}

const TicketCard = ({
  ticket,
  onComplete,
  onDelete,
  completingId,
  deletingId,
}: {
  ticket: MaintenanceTicketRow;
  onComplete: (id: string) => void;
  onDelete: (ticket: MaintenanceTicketRow) => void;
  completingId: string | null;
  deletingId: string | null;
}) => {
  const StatusIcon = statusTabIcon[ticket.status] || ClockIcon;
  const label = getStatusLabel(ticket.status);
  const isCompleting = completingId === ticket.id;
  const isDeleting = deletingId === ticket.id;

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-blue-900">{ticket.ticketNo}</span>
            <span className="text-xs text-slate-500 truncate max-w-[200px]" title={ticket.title}>
              {ticket.title}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className="font-medium text-slate-700">
              {ticket.building} {ticket.roomNo}
            </span>
          </div>
        </div>
        <div
          className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusBadgeClass(ticket.status)}`}
        >
          <StatusIcon className="w-3.5 h-3.5" />
          {label}
        </div>
      </div>

      <p className="text-sm text-slate-600 mb-3 line-clamp-2">{ticket.description || ticket.title}</p>

      <div className="flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-4">
          <span>报修人: {ticket.reporterName}</span>
          {ticket.reporterPhone ? <span>{ticket.reporterPhone}</span> : null}
        </div>
        <span>{ticket.createdAt}</span>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(ticket)}
          disabled={isDeleting}
        >
          <TrashIcon className="w-4 h-4 mr-1" />
          {isDeleting ? '删除中…' : '删除'}
        </Button>
        {ticket.status === 'OPEN' && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => onComplete(ticket.id)}
            disabled={isCompleting}
          >
            <CheckCircleIcon className="w-4 h-4 mr-1" />
            {isCompleting ? '完成中…' : '已完成'}
          </Button>
        )}
      </div>
    </div>
  );
};

export default function MaintenancePage() {
  const toast = useToastHelpers();
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [buildingFilter, setBuildingFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [tickets, setTickets] = useState<MaintenanceTicketRow[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);

  const [buildings, setBuildings] = useState<BuildingOption[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [createBuildingId, setCreateBuildingId] = useState('');
  const [createRoomId, setCreateRoomId] = useState('');
  const [selectableRooms, setSelectableRooms] = useState<SelectableRoom[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [createDescription, setCreateDescription] = useState('');
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingTicket, setDeletingTicket] = useState<MaintenanceTicketRow | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const loadBuildings = useCallback(async () => {
    try {
      const res = await fetch('/api/buildings');
      const json = await res.json();
      const list = (json.data || []).map((b: { id: number; name: string }) => ({
        id: b.id,
        name: b.name,
      }));
      setBuildings(list);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));

      if (debouncedSearch.trim()) {
        params.set('search', debouncedSearch.trim());
      }
      if (buildingFilter !== 'all') {
        params.set('buildingId', buildingFilter);
      }
      if (startDate) {
        params.set('startDate', startDate);
      }
      if (endDate) {
        params.set('endDate', endDate);
      }

      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      } else {
        if (activeTab === 'pending') {
          params.set('status', 'OPEN');
        } else if (activeTab === 'completed') {
          params.set('status', 'COMPLETED');
        }
      }

      const res = await fetch(`/api/maintenance?${params.toString()}`);
      const result = await res.json();
      if (!res.ok) {
        throw new Error((result as { error?: string }).error || '加载失败');
      }
      const rows = ((result as { data?: unknown[] }).data || []).map((t) =>
        mapApiToRow(t as Record<string, unknown>)
      );
      setTickets(rows);
      const p = (result as {
        pagination?: { total?: number; totalPages?: number };
      }).pagination;
      if (p) {
        setTotal(p.total ?? 0);
        setTotalPages(p.totalPages ?? 0);
      }
    } catch (error) {
      console.error(error);
      toast.error('加载工单列表失败');
    } finally {
      setLoading(false);
    }
  }, [
    activeTab,
    debouncedSearch,
    buildingFilter,
    statusFilter,
    startDate,
    endDate,
    page,
    pageSize,
    toast,
  ]);

  useEffect(() => {
    loadBuildings();
  }, [loadBuildings]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  // 弹窗内：选定楼栋后加载房间
  useEffect(() => {
    if (!modalOpen) return;
    if (!createBuildingId) {
      setSelectableRooms([]);
      setCreateRoomId('');
      setRoomsLoading(false);
      return;
    }
    let cancelled = false;
    setRoomsLoading(true);
    (async () => {
      try {
        const res = await fetch(
          `/api/rooms?buildingId=${encodeURIComponent(createBuildingId)}`
        );
        const json = (await res.json()) as { data?: unknown[]; error?: string };
        if (!res.ok) {
          if (!cancelled) {
            setSelectableRooms([]);
            toast.error(
              typeof json.error === 'string' ? json.error : '加载房间列表失败'
            );
          }
          return;
        }
        const raw = json.data;
        const rooms = Array.isArray(raw) ? raw : [];
        const list = (rooms as Array<{ id: number; roomNumber: string; person?: any[] }>)
          .filter((r) => (r.person || []).length > 0)
          .map((r) => ({
            id: r.id,
            roomNumber: String(r.roomNumber).trim(),
          }))
          .sort((a, b) =>
            a.roomNumber.localeCompare(b.roomNumber, 'zh-CN', { numeric: true })
          );
        if (!cancelled) {
          setSelectableRooms(list);
        }
      } catch {
        if (!cancelled) {
          setSelectableRooms([]);
          toast.error('加载房间列表失败');
        }
      } finally {
        if (!cancelled) setRoomsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [modalOpen, createBuildingId, toast]);

  const openCreateModal = () => {
    setCreateBuildingId('');
    setCreateRoomId('');
    setSelectableRooms([]);
    setCreateDescription('');
    setModalOpen(true);
  };

  const submitCreate = async () => {
    if (!createBuildingId) {
      toast.error('请选择楼栋');
      return;
    }
    if (!createRoomId) {
      toast.error('请选择房间');
      return;
    }
    const selectedRoom = selectableRooms.find((r) => String(r.id) === createRoomId);
    if (!selectedRoom) {
      toast.error('房间无效，请重新选择');
      return;
    }
    if (!createDescription.trim()) {
      toast.error('请填写问题原因');
      return;
    }

    setCreateSubmitting(true);
    try {
      const res = await fetch('/api/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buildingId: parseInt(createBuildingId, 10),
          roomNumber: selectedRoom.roomNumber,
          description: createDescription.trim(),
          personId: session?.user?.personId,
          reportedBy: session?.user?.username,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(typeof data.error === 'string' ? data.error : '创建失败');
        return;
      }
      toast.success('工单已创建');
      setModalOpen(false);
      setPage(1);
      await loadTickets();
    } catch (e) {
      console.error(e);
      toast.error('创建工单失败');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (startDate) {
        params.set('startDate', startDate);
      }
      if (endDate) {
        params.set('endDate', endDate);
      }
      if (buildingFilter !== 'all') {
        params.set('buildingId', buildingFilter);
      }
      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }
      if (debouncedSearch.trim()) {
        params.set('search', debouncedSearch.trim());
      }
      const res = await fetch(`/api/maintenance/export?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(
          typeof (data as { error?: string }).error === 'string'
            ? (data as { error: string }).error
            : '导出失败'
        );
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const rangeLabel =
        startDate || endDate
          ? `${startDate || '开始'}_至_${endDate || '现在'}`
          : new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `报修工单报表_${rangeLabel}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('报表导出成功');
    } catch (e) {
      console.error(e);
      toast.error('导出失败');
    } finally {
      setExporting(false);
    }
  }, [startDate, endDate, buildingFilter, statusFilter, debouncedSearch, toast]);

  const handleComplete = useCallback(async (id: string) => {
    setCompletingId(id);
    try {
      const res = await fetch(`/api/maintenance/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'COMPLETED' }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(typeof data.error === 'string' ? data.error : '操作失败');
        return;
      }
      toast.success('工单已完成');
      await loadTickets();
    } catch (e) {
      console.error(e);
      toast.error('操作失败');
    } finally {
      setCompletingId(null);
    }
  }, [loadTickets, toast]);

  const handleDelete = useCallback((ticket: MaintenanceTicketRow) => {
    setDeletingTicket(ticket);
  }, []);

  const handleDeleteConfirm = async () => {
    if (!deletingTicket) return;
    setDeletingId(deletingTicket.id);
    try {
      const res = await fetch(`/api/maintenance/${deletingTicket.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(typeof data.error === 'string' ? data.error : '删除失败');
        return;
      }
      toast.success('工单已删除');
      setDeletingTicket(null);
      await loadTickets();
    } catch (e) {
      console.error(e);
      toast.error('删除失败');
    } finally {
      setDeletingId(null);
    }
  };

  const stats = {
    total: tickets.length,
    pending: tickets.filter((t) => t.status === 'OPEN').length,
    completed: tickets.filter((t) => t.status === 'COMPLETED').length,
  };

  const tabs = [
    { id: 'all' as const, label: '全部工单', count: stats.total },
    { id: 'pending' as const, label: '待维修', count: stats.pending },
    { id: 'completed' as const, label: '已完成', count: stats.completed },
  ];

  const statusFilterOptions = [
    { value: 'all', label: '全部状态' },
    { value: 'OPEN', label: '待维修' },
    { value: 'COMPLETED', label: '已完成' },
    { value: 'CANCELLED', label: '已取消' },
  ];

  const handlePage = (next: number) => {
    if (next < 1 || next > totalPages) return;
    setPage(next);
  };

  const columns = useMemo(
    () => getMaintenanceColumns(handleComplete, handleDelete, completingId, deletingId),
    [completingId, deletingId, handleComplete, handleDelete]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-blue-900">报修维护</h1>
          <p className="text-sm text-slate-500 mt-1">处理宿舍报修工单，维修任务</p>
        </div>
        <Button variant="primary" onClick={openCreateModal}>
          <PlusIcon className="w-5 h-5 mr-2" />
          新建工单
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <div className="text-sm text-slate-500 mb-1">本页工单数</div>
          <div className="text-2xl font-semibold text-blue-900">{stats.total}</div>
          <div className="text-xs text-slate-400 mt-1">当前列表</div>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <div className="text-sm text-slate-500 mb-1">待维修</div>
          <div className="text-2xl font-semibold text-amber-600">{stats.pending}</div>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <div className="text-sm text-slate-500 mb-1">已完成</div>
          <div className="text-2xl font-semibold text-emerald-600">{stats.completed}</div>
        </Card>
      </div>

      <div className="border-b border-slate-200">
        <div className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                setPage(1);
              }}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors relative ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
              <span
                className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                  activeTab === tab.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="搜索房间号、问题描述…"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
            />
          </div>
          <select
            value={buildingFilter}
            onChange={(e) => {
              setBuildingFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none bg-white min-w-[140px]"
          >
            <option value="all">全部楼栋</option>
            {buildings.map((b) => (
              <option key={b.id} value={String(b.id)}>
                {b.name}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none bg-white min-w-[120px]"
          >
            {statusFilterOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <input
            type="date"
            title="报修开始日期"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none bg-white"
          />
          <span className="text-sm text-slate-400">至</span>
          <input
            type="date"
            title="报修结束日期"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none bg-white"
          />
          <Button
            variant="info"
            onClick={() => void handleExport()}
            disabled={exporting}
          >
            <ArrowDownTrayIcon className="w-5 h-5 mr-1" />
            {exporting ? '导出中…' : '导出报表'}
          </Button>
        </div>
      </Card>

      {loading ? (
        <Card className="py-12 text-center text-slate-500">加载中…</Card>
      ) : (
        <Card>
          <DataTable
            columns={columns}
            data={tickets}
            loading={loading}
            pagination={{
              page,
              pageSize,
              total,
              totalPages,
            }}
            onPageChange={(newPage) => setPage(newPage)}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPage(1);
            }}
            rowKey="id"
            emptyText="暂无工单数据"
          />
        </Card>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => !createSubmitting && setModalOpen(false)}
        title="新建报修工单"
        description="选择楼栋和房间，填写问题原因即可创建工单。"
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              type="button"
              disabled={createSubmitting}
              onClick={() => setModalOpen(false)}
            >
              取消
            </Button>
            <Button
              variant="primary"
              type="button"
              disabled={createSubmitting}
              onClick={() => void submitCreate()}
            >
              {createSubmitting ? '提交中…' : '确定'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 pt-1">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">楼栋</label>
            <select
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none bg-white"
              value={createBuildingId}
              onChange={(e) => {
                setCreateBuildingId(e.target.value);
                setCreateRoomId('');
              }}
            >
              <option value="">请选择楼栋</option>
              {buildings.map((b) => (
                <option key={b.id} value={String(b.id)}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">房间号</label>
            <select
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none bg-white disabled:bg-slate-50 disabled:text-slate-500"
              disabled={!createBuildingId || roomsLoading}
              value={createRoomId}
              onChange={(e) => setCreateRoomId(e.target.value)}
            >
              <option value="">
                {!createBuildingId
                  ? '请先选择楼栋'
                  : roomsLoading
                    ? '正在加载房间…'
                    : '请选择房间'}
              </option>
              {selectableRooms.map((r) => (
                <option key={r.id} value={String(r.id)}>
                  {r.roomNumber}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">问题原因</label>
            <textarea
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none min-h-[100px]"
              placeholder="请描述故障或需求"
              value={createDescription}
              onChange={(e) => setCreateDescription(e.target.value)}
            />
          </div>
        </div>
      </Modal>

      {deletingTicket && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <TrashIcon className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">确认删除</h3>
            </div>
            <p className="text-slate-600 mb-6">
              确定要删除工单 <span className="font-medium text-slate-900">{deletingTicket.ticketNo}</span> 吗？此操作不可恢复。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingTicket(null)}
                disabled={!!deletingId}
                className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={!!deletingId}
                className="flex-1 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deletingId ? '删除中…' : '删除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
