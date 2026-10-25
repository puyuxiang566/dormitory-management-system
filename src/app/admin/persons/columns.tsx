'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import {
  PencilIcon,
  TrashIcon,
  EyeIcon,
  ArrowRightOnRectangleIcon,
  UserCircleIcon,
  BuildingOfficeIcon,
  HomeIcon,
} from '@heroicons/react/24/outline';
import { DataTableColumn } from '@/components/ui';
import { Person } from '@/lib/api';
import { getStatusColor, getStatusLabel, formatDate } from '@/lib/utils';
import { useFactories } from '@/hooks/useFactories';

// 状态标签组件 - 使用 React.memo 优化
export const StatusBadge = React.memo(function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
      {getStatusLabel(status)}
    </span>
  );
});

// 人员信息列组件
const PersonInfoCell = React.memo(function PersonInfoCell({ person, factoryName }: { person: Person; factoryName: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
        <UserCircleIcon className="w-5 h-5 text-blue-600" />
      </div>
      <div className="flex flex-col items-start gap-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-blue-900 leading-none">{person.name}</span>
          {person.gender && (
            <span className={`text-[10px] leading-none px-1.5 py-0.5 rounded ${person.gender === 'MALE' ? 'bg-blue-100 text-blue-600' : 'bg-pink-100 text-pink-600'}`}>
              {person.gender === 'MALE' ? '男' : '女'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 leading-none">{person.employeeId}</span>
          <span className="text-[10px] leading-none px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
            {factoryName}
          </span>
        </div>
      </div>
    </div>
  );
});

// 部门职位列组件
const DepartmentCell = React.memo(function DepartmentCell({ person }: { person: Person }) {
  return (
    <div>
      <p className="text-sm text-slate-700">{person.department || '-'}</p>
      <p className="text-xs text-slate-500">{person.position || '-'}</p>
    </div>
  );
});

// 联系方式列组件
const ContactCell = React.memo(function ContactCell({ person }: { person: Person }) {
  return (
    <div>
      <span className="text-sm text-slate-700">{person.phone || '-'}</span>
      {person.emergencyContacts && person.emergencyContacts.length > 0 && (
        <div className="text-xs text-slate-500 mt-0.5">
          紧急联系人: {person.emergencyContacts[0].phone}
        </div>
      )}
    </div>
  );
});

// 宿舍分配列组件
const RoomCell = React.memo(function RoomCell({ person }: { person: Person }) {
  return (
    <div className="flex items-center gap-1.5 text-sm text-slate-700">
      {person.building ? (
        <>
          <BuildingOfficeIcon className="w-4 h-4 text-slate-400" />
          <span>{person.building.name}</span>
          <span className="text-slate-400">·</span>
          <HomeIcon className="w-4 h-4 text-slate-400" />
          <span>{person.room?.roomNumber}</span>
          {person.bedNumber && (
            <span className="text-slate-400">({person.bedNumber}床)</span>
          )}
          {person.isRoomLeader && (
            <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800 border border-amber-200">
              舍长
            </span>
          )}
        </>
      ) : (
        <span className="text-slate-400">未分配</span>
      )}
    </div>
  );
});

// 入住日期列组件
const CheckInDateCell = React.memo(function CheckInDateCell({ person }: { person: Person }) {
  const dateVal = (person as any).checkInDate;
  return (
    <span className="text-sm text-slate-600">
      {dateVal ? formatDate(dateVal, 'date') : '-'}
    </span>
  );
});

// 操作列组件
interface ActionsCellProps {
  person: Person;
  onView: (person: Person) => void;
  onDelete: (person: Person) => void;
  onCheckout: (person: Person) => void;
}

const ActionsCell = React.memo(function ActionsCell({ person, onView, onDelete, onCheckout }: ActionsCellProps) {
  const handleView = (e: React.MouseEvent) => {
    e.stopPropagation();
    onView(person);
  };
  
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(person);
  };
  
  const handleCheckout = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCheckout(person);
  };

  return (
    <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
      {person.status === 'ACTIVE' && (
        <button
          type="button"
          onClick={handleCheckout}
          className="p-1.5 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
          title="一键退宿"
        >
          <ArrowRightOnRectangleIcon className="w-4 h-4" />
        </button>
      )}
      <button
        type="button"
        onClick={handleView}
        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        title="查看所有信息"
      >
        <EyeIcon className="w-4 h-4" />
      </button>
      <Link
        href={`/admin/persons/${person.id}/edit`}
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
      >
        <TrashIcon className="w-4 h-4" />
      </button>
    </div>
  );
});

// 表格列配置 hook
interface UsePersonColumnsProps {
  onView: (person: Person) => void;
  onEdit: (person: Person) => void;
  onDelete: (person: Person) => void;
  onCheckout: (person: Person) => void;
}

export function usePersonColumns({
  onView,
  onEdit,
  onDelete,
  onCheckout,
}: UsePersonColumnsProps): DataTableColumn<Person>[] {
  const { nameOf } = useFactories();
  return useMemo(() => [
    {
      key: 'name',
      title: '人员信息',
      width: '22%',
      render: (person: Person) => <PersonInfoCell person={person} factoryName={nameOf(person.factory)} />,
    },
    {
      key: 'department',
      title: '部门/职位',
      width: '15%',
      render: (person: Person) => <DepartmentCell person={person} />,
    },
    {
      key: 'phone',
      title: '联系方式',
      width: '18%',
      render: (person: Person) => <ContactCell person={person} />,
    },
    {
      key: 'status',
      title: '状态',
      width: '8%',
      render: (person: Person) => <StatusBadge status={person.status} />,
    },
    {
      key: 'room',
      title: '宿舍分配',
      width: '22%',
      render: (person: Person) => <RoomCell person={person} />,
    },
    {
      key: 'checkInDate',
      title: '入住日期',
      width: '10%',
      render: (person: Person) => <CheckInDateCell person={person} />,
    },
    {
      key: 'actions',
      title: '操作',
      width: '120px',
      align: 'center',
      render: (person: Person) => (
        <ActionsCell
          person={person}
          onView={onView}
          onDelete={onDelete}
          onCheckout={onCheckout}
        />
      ),
    },
  ], [onView, onDelete, onCheckout, nameOf]);
}
