'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import {
  PencilIcon,
  TrashIcon,
  CalendarIcon,
  HomeIcon,
  BuildingOfficeIcon,
  UserCircleIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline';
import { DataTableColumn } from '@/components/ui';
import { formatDate } from '@/lib/utils';

// 7S检查记录类型
export interface InspectionRecord {
  id: number;
  inspectionDate: string;
  roomNumber: string;
  factory: string;
  department: string;
  personName: string;
  personId?: number;
  categoryId?: number;
  category?: {
    id: number;
    name: string;
  } | null;
  violationDesc: string;
  action?: string | null;
  inspector: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

// 日期列组件
const DateCell = React.memo(function DateCell({ record }: { record: InspectionRecord }) {
  return (
    <div className="flex items-center gap-2">
      <CalendarIcon className="w-4 h-4 text-slate-400" />
      <span className="text-sm text-slate-700">
        {formatDate(record.inspectionDate, 'date')}
      </span>
    </div>
  );
});

// 宿舍信息列组件
const RoomCell = React.memo(function RoomCell({ record }: { record: InspectionRecord }) {
  return (
    <div className="flex items-center gap-1.5 text-sm text-slate-700">
      <HomeIcon className="w-4 h-4 text-slate-400" />
      <span>{record.roomNumber}</span>
    </div>
  );
});

// 工厂部门列组件
const FactoryDeptCell = React.memo(function FactoryDeptCell({ record }: { record: InspectionRecord }) {
  const factoryLabel = record.factory === 'imaw' ? 'IMAW' 
    : record.factory === 'imft' ? 'IMFT' 
    : record.factory === '职能部门' ? '职能部门' 
    : 'IMCN';

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1.5">
        <BuildingOfficeIcon className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-xs font-medium text-slate-600">{factoryLabel}</span>
      </div>
      <span className="text-xs text-slate-500 pl-5">{record.department || '-'}</span>
    </div>
  );
});

// 人员信息列组件
const PersonCell = React.memo(function PersonCell({ record }: { record: InspectionRecord }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
        <UserCircleIcon className="w-4 h-4 text-blue-600" />
      </div>
      <span className="text-sm font-medium text-slate-700">{record.personName}</span>
    </div>
  );
});

// 不合格项列组件
const ViolationCell = React.memo(function ViolationCell({ record }: { record: InspectionRecord }) {
  return (
    <div className="flex flex-col gap-1 max-w-xs">
      <p className="text-sm text-slate-700 truncate" title={record.violationDesc}>
        {record.violationDesc}
      </p>
    </div>
  );
});

// 检查人列组件
const InspectorCell = React.memo(function InspectorCell({ record }: { record: InspectionRecord }) {
  return (
    <div className="flex items-center gap-1.5 text-sm text-slate-600">
      <ClipboardDocumentListIcon className="w-4 h-4 text-slate-400" />
      <span>{record.inspector}</span>
    </div>
  );
});

// 操作列组件
interface ActionsCellProps {
  record: InspectionRecord;
  onDelete: (record: InspectionRecord) => void;
}

const ActionsCell = React.memo(function ActionsCell({ record, onDelete }: ActionsCellProps) {
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(record);
  };

  return (
    <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
      <Link
        href={`/admin/7s-inspections/${record.id}/edit`}
        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        title="编辑"
        onClick={(e) => e.stopPropagation()}
      >
        <PencilIcon className="w-4 h-4" />
      </Link>
      <button
        type="button"
        onClick={handleDelete}
        className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        title="删除"
      >
        <TrashIcon className="w-4 h-4" />
      </button>
    </div>
  );
});

// 表格列配置 hook
interface UseInspectionColumnsProps {
  onDelete: (record: InspectionRecord) => void;
}

export function useInspectionColumns({
  onDelete,
}: UseInspectionColumnsProps): DataTableColumn<InspectionRecord>[] {
  return useMemo(() => [
    {
      key: 'inspectionDate',
      title: '日期',
      width: '12%',
      render: (record: InspectionRecord) => <DateCell record={record} />,
    },
    {
      key: 'roomNumber',
      title: '宿舍号',
      width: '10%',
      render: (record: InspectionRecord) => <RoomCell record={record} />,
    },
    {
      key: 'factory',
      title: '工厂/部门',
      width: '15%',
      render: (record: InspectionRecord) => <FactoryDeptCell record={record} />,
    },
    {
      key: 'personName',
      title: '姓名',
      width: '12%',
      render: (record: InspectionRecord) => <PersonCell record={record} />,
    },
    {
      key: 'violationDesc',
      title: '不合格项',
      width: '20%',
      render: (record: InspectionRecord) => <ViolationCell record={record} />,
    },
    {
      key: 'inspector',
      title: '检查人',
      width: '15%',
      render: (record: InspectionRecord) => <InspectorCell record={record} />,
    },
    {
      key: 'actions',
      title: '操作',
      width: '120px',
      align: 'center',
      render: (record: InspectionRecord) => (
        <ActionsCell
          record={record}
          onDelete={onDelete}
        />
      ),
    },
  ], [onDelete]);
}
