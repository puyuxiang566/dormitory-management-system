'use client';

import { useMemo } from 'react';
import { Modal, Button } from '@/components/ui';
import { Person } from '@/lib/api';
import { formatDate, getStatusColor, getStatusLabel } from '@/lib/utils';
import { StatusBadge } from './columns';
import { useFactories } from '@/hooks/useFactories';

interface PersonDetailModalProps {
  person: Person;
  isOpen: boolean;
  onClose: () => void;
}

// 时间线数据类型
interface TimelineItem {
  type: 'checkin' | 'checkout' | 'change';
  date: Date;
  data: any;
}

// 时间线组件
function TimelineView({ histories }: { histories: any[] }) {
  const timeline = useMemo(() => {
    const items: TimelineItem[] = [];
    
    if (histories) {
      histories.forEach((history: any) => {
        const toRoomId = history.room_roomchangehistory_toRoomIdToroom?.id || history.toRoomId;
        const fromRoomId = history.room_roomchangehistory_fromRoomIdToroom?.id || history.fromRoomId;
        
        // 根据 reason 字段判断类型
        let historyType: 'checkin' | 'checkout' | 'change';
        if (history.reason === '退宿' || (!toRoomId && fromRoomId)) {
          historyType = 'checkout';
        } else if (history.reason === '入住/重新分配' || (!fromRoomId && toRoomId)) {
          historyType = 'checkin';
        } else {
          historyType = 'change';
        }
        
        items.push({ type: historyType, date: new Date(history.changeDate), data: history });
      });
    }
    
    items.sort((a, b) => b.date.getTime() - a.date.getTime());
    return items;
  }, [histories]);

  if (timeline.length === 0) {
    return <p className="text-slate-400 text-center py-2 text-xs">暂无住宿相关记录</p>;
  }

  return (
    <>
      {timeline.map((item, index) => (
        <div key={index} className="flex gap-3 text-sm relative">
          <div className="flex flex-col items-center">
            <div className={`w-2 h-2 rounded-full mt-1.5 ${
              item.type === 'checkin' ? 'bg-emerald-500' : 
              item.type === 'checkout' ? 'bg-slate-500' : 'bg-blue-500'
            }`}></div>
            {index < timeline.length - 1 && <div className="w-0.5 h-full bg-slate-200 mt-1 flex-1"></div>}
          </div>
          <div className="flex-1 pb-3">
            <p className={`font-medium ${
              item.type === 'checkin' ? 'text-emerald-700' : 
              item.type === 'checkout' ? 'text-slate-700' : 'text-blue-700'
            }`}>
              {item.type === 'checkin' ? '入住' : item.type === 'checkout' ? '退宿' : '换宿'}
            </p>
            <p className="text-slate-600">时间: {formatDate(item.date)}</p>
            {item.type === 'checkin' && item.data && (
              <p className="text-slate-500 text-xs mt-0.5">
                入住 {item.data.room_roomchangehistory_toRoomIdToroom?.building?.name} {item.data.room_roomchangehistory_toRoomIdToroom?.roomNumber}
              </p>
            )}
            {item.type === 'change' && item.data && (
              <p className="text-slate-500 text-xs mt-0.5">
                {item.data.room_roomchangehistory_fromRoomIdToroom?.building?.name && item.data.room_roomchangehistory_fromRoomIdToroom?.roomNumber 
                  ? `由 ${item.data.room_roomchangehistory_fromRoomIdToroom.building.name} ${item.data.room_roomchangehistory_fromRoomIdToroom.roomNumber}` 
                  : (item.data.room_roomchangehistory_toRoomIdToroom?.building?.name ? '由' : '')}
                {item.data.room_roomchangehistory_toRoomIdToroom?.building?.name && item.data.room_roomchangehistory_toRoomIdToroom?.roomNumber 
                  ? `调整至 ${item.data.room_roomchangehistory_toRoomIdToroom.building.name} ${item.data.room_roomchangehistory_toRoomIdToroom.roomNumber}` 
                  : (item.data.room_roomchangehistory_toRoomIdToroom?.building?.name ? '调整至' : '')}
              </p>
            )}
            {item.type === 'checkout' && (
              <p className="text-slate-500 text-xs mt-0.5">
                {item.data?.room_roomchangehistory_fromRoomIdToroom ? `退宿 ${item.data.room_roomchangehistory_fromRoomIdToroom.building?.name} ${item.data.room_roomchangehistory_fromRoomIdToroom.roomNumber} ` : '退宿'}
              </p>
            )}
          </div>
        </div>
      ))}
    </>
  );
}

export function PersonDetailModal({ person, isOpen, onClose }: PersonDetailModalProps) {
  const { nameOf } = useFactories();
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="人员详细信息"
      size="lg"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex"><span className="text-slate-500 w-16 mb-0 shrink-0">姓名:</span> <span className="font-medium">{person.name}</span></div>
          <div className="flex"><span className="text-slate-500 w-16 mb-0 shrink-0">工号:</span> <span className="font-medium">{person.employeeId}</span></div>
          <div className="flex"><span className="text-slate-500 w-16 mb-0 shrink-0">性别:</span> <span className="font-medium">{person.gender === 'MALE' ? '男' : person.gender === 'FEMALE' ? '女' : '-'}</span></div>
          <div className="flex"><span className="text-slate-500 w-16 mb-0 shrink-0">工厂:</span> <span className="font-medium">{nameOf(person.factory)}</span></div>
          <div className="flex"><span className="text-slate-500 w-16 mb-0 shrink-0">部门:</span> <span className="font-medium">{person.department || '-'}</span></div>
          <div className="flex"><span className="text-slate-500 w-16 mb-0 shrink-0">职位:</span> <span className="font-medium">{person.position || '-'}</span></div>
          <div className="flex"><span className="text-slate-500 w-16 mb-0 shrink-0">手机:</span> <span className="font-medium">{person.phone || '-'}</span></div>
          <div className="flex"><span className="text-slate-500 w-16 mb-0 shrink-0">身份证:</span> <span className="font-medium">{person.idCard || '-'}</span></div>
          <div className="col-span-2">
            <span className="text-slate-500 mr-2">当前状态:</span> <StatusBadge status={person.status} />
          </div>
          <div className="col-span-2 border-t pt-2 mt-2">
            <span className="text-slate-500 font-medium block mb-2">住宿与调整历史</span>
            <div className="space-y-3 bg-slate-50 p-3 rounded-lg border border-slate-100 max-h-60 overflow-y-auto">
              <TimelineView histories={(person as any).roomchangehistory || []} />
            </div>
          </div>

          <div className="col-span-2 border-t pt-2 mt-2">
            <span className="text-slate-500 font-medium">当前分配</span>
            <p className="mt-1 flex items-center">
              {person.building ? `${person.building.name} - ${person.room?.roomNumber} (${person.bedNumber}床)` : '未分配或已退宿'}
              {person.isRoomLeader && (
                <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800 border border-amber-200">
                  舍长
                </span>
              )}
            </p>
          </div>
          {(person as any).emergencycontact && (person as any).emergencycontact.length > 0 && (
            <div className="col-span-2 border-t pt-2 mt-2">
              <span className="text-slate-500 font-medium">紧急联系人</span>
              <p className="mt-1">
                {((person as any).emergencycontact[0] as any).name} ({((person as any).emergencycontact[0] as any).relationship}): {((person as any).emergencycontact[0] as any).phone}
              </p>
            </div>
          )}
        </div>
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <Button variant="primary" onClick={onClose}>
          关闭
        </Button>
      </div>
    </Modal>
  );
}
