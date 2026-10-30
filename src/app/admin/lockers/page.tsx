'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  LockClosedIcon,
  PlusIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ListBulletIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline';
import { Button, Card, Badge } from '@/components/ui';
import { useFactories } from '@/hooks/useFactories';
import LockerDrawer from './LockerDrawer';
import AddLockerModal, { AddLockerInitial } from './AddLockerModal';
import { subRowLabel } from './subRow';

interface LockerCurrent {
  employeeId: string;
  employeeName: string;
  factory: string | null;
  department: string | null;
  assignedAt: string;
}
interface Locker {
  id: number;
  gender: string;
  area: string;
  rowName: string;
  subRow: number;
  lockerNo: string;
  status: string;
  note: string | null;
  current: LockerCurrent | null;
}
interface Statistics {
  MALE: { FREE: number; OCCUPIED: number; DISABLED: number };
  FEMALE: { FREE: number; OCCUPIED: number; DISABLED: number };
}

const STATUS_STYLE: Record<string, string> = {
  FREE: 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200',
  OCCUPIED: 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200',
  DISABLED: 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200',
};
/* 女柜「占用」与宿舍资源女宿舍分配时背景色一致（pink-200/300/800），男柜保持蓝色 */
const statusStyle = (status: string, gender: string): string =>
  status === 'OCCUPIED' && gender === 'FEMALE'
    ? 'bg-pink-200 text-pink-800 border-pink-300 hover:bg-pink-300'
    : STATUS_STYLE[status];
const STATUS_LABEL: Record<string, string> = { FREE: '空闲', OCCUPIED: '占用', DISABLED: '停用' };

export default function LockersPage() {
  const { activeFactories, nameOf } = useFactories();

  const [lockers, setLockers] = useState<Locker[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [rowMaxSub, setRowMaxSub] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [genderFilter, setGenderFilter] = useState<'MALE' | 'FEMALE'>('MALE');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'FREE' | 'OCCUPIED' | 'DISABLED'>('ALL');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [page, setPage] = useState(1);
  const [expandedRow, setExpandedRow] = useState<string | null>(null); // 卡片默认收起
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addInitial, setAddInitial] = useState<AddLockerInitial | null>(null);

  const load = useCallback(async (kw: string, status: string) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (kw) qs.set('keyword', kw);
      if (status && status !== 'ALL') qs.set('status', status);
      const res = await fetch(`/api/lockers${qs.toString() ? `?${qs}` : ''}`);
      const json = await res.json();
      setLockers(json.data || []);
      setStatistics(json.statistics);
      setRowMaxSub(json.rowMaxSub || {});
      setPage(1);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load('', 'ALL'); }, [load]);

  const doSearch = () => load(keyword, statusFilter);

  /* 分组：当前选中性别 -> 排 -> 层（保持导入物理顺序） */
  const genderSections = useMemo(() => {
    const genders: Array<'MALE' | 'FEMALE'> = [genderFilter];
    return genders.map((gender) => {
      const rowMap = new Map<string, Map<number, Locker[]>>();
      for (const l of lockers) {
        if (l.gender !== gender) continue;
        if (!rowMap.has(l.rowName)) rowMap.set(l.rowName, new Map());
        const subMap = rowMap.get(l.rowName)!;
        if (!subMap.has(l.subRow)) subMap.set(l.subRow, []);
        subMap.get(l.subRow)!.push(l);
      }
      const rows = Array.from(rowMap.entries()).map(([rowName, subMap]) => {
        const subs = Array.from(subMap.entries())
          .sort((a, b) => a[0] - b[0])
          .map(([sub, list]) => ({
            sub,
            lockers: list.sort((a, b) => {
              const na = parseInt(a.lockerNo, 10), nb = parseInt(b.lockerNo, 10);
              return Number.isNaN(na) || Number.isNaN(nb) ? a.lockerNo.localeCompare(b.lockerNo) : na - nb;
            }),
          }));
        const all = subs.flatMap((s) => s.lockers);
        return {
          rowName, subs, total: all.length,
          free: all.filter((l) => l.status === 'FREE').length,
          occupied: all.filter((l) => l.status === 'OCCUPIED').length,
          disabled: all.filter((l) => l.status === 'DISABLED').length,
        };
      });
      return { gender, rows };
    });
  }, [lockers, genderFilter]);

  const openAdd = (gender?: string, rowName?: string, maxSub?: number) => {
    setAddInitial({ gender: gender || 'MALE', rowName: rowName || '', subRow: maxSub || 1 });
    setAddOpen(true);
  };

  const stats = (g: 'MALE' | 'FEMALE') => statistics?.[g];
  const pageSize = 100;
  const genderList = useMemo(() => lockers.filter((l) => l.gender === genderFilter), [lockers, genderFilter]);
  /* 列表用：按 API 全量 rowMaxSub 计算该柜的层标签 */
  const subLabelOf = (l: { gender: string; rowName: string; subRow: number }) =>
    subRowLabel(l.subRow, rowMaxSub[`${l.gender}|${l.rowName}`] ?? l.subRow);
  const totalPages = Math.max(1, Math.ceil(genderList.length / pageSize));
  const pagedList = genderList.slice((page - 1) * pageSize, page * pageSize);
  const hasContent = genderSections.some((s) => s.rows.length > 0);

  return (
    <div className="space-y-6">
      {/* 标题与操作 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <LockClosedIcon className="w-6 h-6 text-blue-600" /> 更衣柜管理
          </h1>
          <p className="text-sm text-slate-500 mt-1">全公司员工更衣柜分配与变更记录（与住宿关系相互独立）</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && doSearch()}
              placeholder="柜号 / 工号 / 姓名 / 部门 / 工厂"
              className="pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg w-60 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <Button variant="outline" size="sm" onClick={doSearch}>查询</Button>
          <Button size="sm" onClick={() => openAdd(genderFilter)}>
            <PlusIcon className="w-4 h-4 mr-1" /> 新增柜子
          </Button>
          <a href="/api/lockers?export=true" className="flex items-center gap-1 px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">
            <ArrowDownTrayIcon className="w-4 h-4" /> 导出
          </a>
        </div>
      </div>

      {/* 男/女更衣柜选项卡（点击切换，默认男更衣柜）+ 筛选 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(['MALE', 'FEMALE'] as const).map((g) => (
          <div
            key={g}
            onClick={() => setGenderFilter(g)}
            className={`bg-white rounded-xl shadow-sm border p-4 cursor-pointer transition-all select-none ${genderFilter === g
              ? (g === 'MALE' ? 'ring-2 ring-blue-500 border-blue-300' : 'ring-2 ring-pink-500 border-pink-300')
              : 'border-slate-200 hover:shadow-md'}`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className={`text-sm font-semibold ${g === 'MALE' ? 'text-blue-900' : 'text-pink-900'}`}>
                {g === 'MALE' ? '男更衣柜' : '女更衣柜'}
              </div>
              {genderFilter === g && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${g === 'MALE' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>当前</span>
              )}
            </div>
            <div className="flex gap-4 text-sm">
              <span className="text-emerald-600">空闲 {stats(g)?.FREE ?? 0}</span>
              <span className={g === 'FEMALE' ? 'text-pink-600' : 'text-blue-600'}>占用 {stats(g)?.OCCUPIED ?? 0}</span>
              <span className="text-slate-400">停用 {stats(g)?.DISABLED ?? 0}</span>
            </div>
          </div>
        ))}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col justify-center">
          <div className="text-sm text-slate-500 mb-1">{genderFilter === 'MALE' ? '男更衣柜' : '女更衣柜'} · 当前筛选</div>
          <div className="text-2xl font-bold text-slate-900">{genderList.length} 个柜</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col justify-center gap-2">
          <div className="text-xs text-slate-400">状态筛选</div>
          <div className="flex gap-1.5 flex-wrap">
            {(['ALL', 'FREE', 'OCCUPIED', 'DISABLED'] as const).map((s) => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); load(keyword, s); }}
                className={`px-2.5 py-1 text-xs rounded-full border ${statusFilter === s ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}
              >
                {s === 'ALL' ? '全部状态' : STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 视图切换 + 图例 */}
      <div className="flex items-center justify-between">
        <div className="flex rounded-lg border border-slate-300 overflow-hidden">
          <button
            onClick={() => setView('grid')}
            className={`flex items-center gap-1 px-3 py-1.5 text-sm ${view === 'grid' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
          >
            <Squares2X2Icon className="w-4 h-4" /> 柜位图
          </button>
          <button
            onClick={() => setView('list')}
            className={`flex items-center gap-1 px-3 py-1.5 text-sm ${view === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
          >
            <ListBulletIcon className="w-4 h-4" /> 列表
          </button>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-200 border border-emerald-400" />空闲</span>
          <span className="flex items-center gap-1"><span className={`w-3 h-3 rounded border ${genderFilter === 'FEMALE' ? 'bg-pink-200 border-pink-400' : 'bg-blue-200 border-blue-400'}`} />占用</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-slate-200 border border-slate-400" />停用</span>
        </div>
      </div>

      {loading ? (
        <div className="text-slate-500 text-sm py-10 text-center">加载中...</div>
      ) : view === 'grid' ? (
        /* ============ 柜位图（当前性别卡片折叠，默认收起） ============ */
        <div className="space-y-8">
          {genderSections.map(({ gender, rows }) => (
            <div key={gender}>
              <div className="flex items-center gap-2 mb-3">
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${gender === 'MALE' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>
                  {gender === 'MALE' ? '男更衣柜' : '女更衣柜'}
                </span>
                <span className="text-sm text-slate-500">共 {rows.length} 排 · {rows.reduce((s, r) => s + r.total, 0)} 柜</span>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {rows.map((row) => {
                  const key = `${gender}|${row.rowName}`;
                  const isExpanded = expandedRow === key;
                  const maxSub = Math.max(...row.subs.map((s) => s.sub));
                  return (
                    <Card
                      key={key}
                      className={`transition-all duration-200 ${isExpanded ? (gender === 'FEMALE' ? 'ring-2 ring-pink-500' : 'ring-2 ring-blue-500') : 'hover:shadow-md'}`}
                    >
                      <div
                        className="p-4 cursor-pointer select-none flex items-center justify-between"
                        onClick={() => setExpandedRow(isExpanded ? null : key)}
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          {isExpanded
                            ? <ChevronDownIcon className="w-4 h-4 text-slate-400" />
                            : <ChevronRightIcon className="w-4 h-4 text-slate-400" />}
                          <span className="font-semibold text-slate-800">{row.rowName}</span>
                          <span className="text-xs text-slate-400">共 {row.total} 柜 · {maxSub > 1 ? `${maxSub} 排叠放` : '单排'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs">
                          {row.free > 0 && <Badge variant="success">空 {row.free}</Badge>}
                          {row.occupied > 0 && <Badge variant="info" className={gender === 'FEMALE' ? 'bg-pink-200 text-pink-800' : ''}>占 {row.occupied}</Badge>}
                          {row.disabled > 0 && <Badge variant="default">停 {row.disabled}</Badge>}
                          <button
                            onClick={(e) => { e.stopPropagation(); openAdd(gender, row.rowName, maxSub); }}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="在此排新增柜子"
                          >
                            <PlusIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-2 border-t border-slate-100 space-y-3">
                          {row.subs.map(({ sub, lockers: cells }) => (
                            <div key={sub}>
                              {subRowLabel(sub, maxSub) && (
                                <div className="text-xs font-medium text-slate-500 mb-1">{subRowLabel(sub, maxSub)}</div>
                              )}
                              <div className="flex flex-wrap gap-1.5">
                                {cells.map((l) => (
                                  <button
                                    key={l.id}
                                    onClick={() => setSelectedId(l.id)}
                                    title={l.current
                                      ? `${l.current.employeeName} · ${l.current.department || ''} · ${l.current.factory ? nameOf(l.current.factory) : ''} · ${l.current.employeeId}`
                                      : STATUS_LABEL[l.status]}
                                    className={`w-14 h-10 rounded-md border text-xs font-mono flex flex-col items-center justify-center transition-colors ${statusStyle(l.status, l.gender)}`}
                                  >
                                    <span>{l.lockerNo}</span>
                                    {l.current && <span className="text-[10px] leading-none opacity-80 max-w-[52px] truncate">{l.current.employeeName}</span>}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
          {!hasContent && (
            <div className="text-center text-slate-400 py-10 bg-white rounded-xl border border-slate-200">无匹配的更衣柜</div>
          )}
        </div>
      ) : (
        /* ============ 列表视图 ============ */
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr className="text-left">
                <th className="py-3 px-4 font-medium">柜号</th>
                <th className="py-3 px-4 font-medium">位置</th>
                <th className="py-3 px-4 font-medium">状态</th>
                <th className="py-3 px-4 font-medium">使用人</th>
                <th className="py-3 px-4 font-medium">工厂</th>
                <th className="py-3 px-4 font-medium">部门</th>
              </tr>
            </thead>
            <tbody>
              {pagedList.length === 0 ? (
                <tr><td colSpan={6} className="py-10 text-center text-slate-400">无匹配的更衣柜</td></tr>
              ) : pagedList.map((l) => (
                <tr key={l.id} className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer" onClick={() => setSelectedId(l.id)}>
                  <td className="py-2.5 px-4 font-mono text-slate-900">{l.lockerNo}</td>
                  <td className="py-2.5 px-4 text-slate-600">{l.rowName}{subLabelOf(l) ? ` · ${subLabelOf(l)}` : ''}</td>
                  <td className="py-2.5 px-4">
                    <Badge
                      variant={l.status === 'FREE' ? 'success' : l.status === 'OCCUPIED' ? 'info' : 'default'}
                      className={l.status === 'OCCUPIED' && l.gender === 'FEMALE' ? 'bg-pink-200 text-pink-800' : ''}
                    >{STATUS_LABEL[l.status]}</Badge>
                  </td>
                  <td className="py-2.5 px-4">{l.current ? `${l.current.employeeName}（${l.current.employeeId}）` : '-'}</td>
                  <td className="py-2.5 px-4">{l.current?.factory ? nameOf(l.current.factory) : '-'}</td>
                  <td className="py-2.5 px-4">{l.current?.department || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-sm text-slate-600">
              <span>共 {genderList.length} 条 · 第 {page}/{totalPages} 页</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>下一页</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 详情抽屉 / 新增弹窗 */}
      {selectedId != null && (
        <LockerDrawer
          lockerId={selectedId}
          factories={activeFactories}
          nameOf={nameOf}
          onClose={() => setSelectedId(null)}
          onChanged={() => load(keyword, statusFilter)}
        />
      )}
      <AddLockerModal
        isOpen={addOpen}
        initial={addInitial}
        onClose={() => setAddOpen(false)}
        onCreated={() => load(keyword, statusFilter)}
      />
    </div>
  );
}
