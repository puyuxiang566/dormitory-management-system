'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { XMarkIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Button, Badge } from '@/components/ui';
import { subRowLabel } from './subRow';

interface FactoryOption { id: number; code: string; name: string; color: string }
interface Assignment {
  id: number;
  employeeId: string;
  employeeName: string;
  factory: string | null;
  department: string | null;
  reason: string | null;
  status: string;
  assignedAt: string;
  releasedAt: string | null;
}
interface LockerDetail {
  id: number;
  gender: string;
  area: string;
  rowName: string;
  subRow: number;
  maxSub: number; // 所在排全量最大层号（API 返回）
  lockerNo: string;
  status: string;
  note: string | null;
  assignments: Assignment[];
}

const STATUS_LABEL: Record<string, string> = { FREE: '空闲', OCCUPIED: '占用', DISABLED: '停用' };

export default function LockerDrawer({
  lockerId, factories, nameOf, onClose, onChanged,
}: {
  lockerId: number;
  factories: FactoryOption[];
  nameOf: (code: string) => string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [detail, setDetail] = useState<LockerDetail | null>(null);
  const [action, setAction] = useState<'assign' | 'release' | 'edit' | null>(null);
  const [form, setForm] = useState({ employeeId: '', employeeName: '', factory: '', department: '', reason: '' });
  const [lookupHint, setLookupHint] = useState('');
  const [editForm, setEditForm] = useState({ lockerNo: '', subRow: 1, note: '' });
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [msg, setMsg] = useState('');
  /* 变更历史：行内编辑 / 删除确认 */
  const [assignmentEditId, setAssignmentEditId] = useState<number | null>(null);
  const [assignmentForm, setAssignmentForm] = useState({ employeeId: '', employeeName: '', factory: '', department: '', reason: '' });
  const [assignmentDeleteId, setAssignmentDeleteId] = useState<number | null>(null);

  const fetchDetail = useCallback(async () => {
    const res = await fetch(`/api/lockers/${lockerId}`);
    const json = await res.json();
    setDetail(json.data || null);
    setEditForm({ lockerNo: json.data?.lockerNo ?? '', subRow: json.data?.subRow ?? 1, note: json.data?.note ?? '' });
  }, [lockerId]);

  useEffect(() => {
    fetchDetail();
    setAction(null); setMsg(''); setLookupHint(''); setDeleteConfirm(false);
    setAssignmentEditId(null); setAssignmentDeleteId(null);
  }, [fetchDetail]);

  if (!detail) return null;
  const active = detail.assignments.find((a) => a.status === 'ACTIVE');

  const patch = async (body: Record<string, unknown>) => {
    const res = await fetch(`/api/lockers/${lockerId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { setMsg(json.error || '操作失败'); return false; }
    await fetchDetail();
    onChanged();
    return true;
  };

  const submit = async () => {
    if (action === 'assign' || action === 'release') {
      const ok = await patch({ action, ...form });
      if (ok) setAction(null);
    } else if (action === 'edit') {
      const ok = await patch({ action, ...editForm });
      if (ok) setAction(null);
    }
  };

  const submitDelete = async () => {
    const res = await fetch(`/api/lockers/${lockerId}`, { method: 'DELETE' });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { setMsg(json.error || '删除失败'); setDeleteConfirm(false); return; }
    onChanged();
    onClose();
  };

  // 工号带出人员档案
  const lookupEmployee = async () => {
    setLookupHint('');
    const id = form.employeeId.trim();
    if (!id) return;
    const res = await fetch(`/api/lockers/lookup?employeeId=${encodeURIComponent(id)}`);
    const json = await res.json();
    if (json.currentLocker) {
      const c = json.currentLocker;
      setLookupHint(`该员工已占用柜号 ${c.lockerNo}（${c.rowName}），一人一柜不可重复分配`);
      return;
    }
    if (json.persons?.length) {
      const p = json.persons[0];
      setForm((f) => ({
        ...f,
        employeeName: f.employeeName || p.name || '',
        factory: f.factory || p.factory || '',
        department: f.department || p.department || '',
      }));
      setLookupHint('已从人员档案带出姓名/工厂/部门');
    } else {
      setLookupHint('未找到该工号的人员档案，请手工填写姓名');
    }
  };

  // 变更历史：开始行内编辑
  const startEditAssignment = (a: Assignment) => {
    setMsg('');
    setAssignmentDeleteId(null);
    setAssignmentEditId(a.id);
    setAssignmentForm({
      employeeId: a.employeeId,
      employeeName: a.employeeName,
      factory: a.factory || '',
      department: a.department || '',
      reason: a.reason || '',
    });
  };

  // 变更历史：保存编辑（patch 内部已刷新详情并通知外层）
  const saveAssignment = async () => {
    if (!assignmentForm.employeeId.trim() || !assignmentForm.employeeName.trim()) {
      setMsg('工号和姓名必填');
      return;
    }
    if (await patch({ action: 'editAssignment', assignmentId: assignmentEditId, ...assignmentForm })) {
      setAssignmentEditId(null);
      setMsg('');
    }
  };

  // 变更历史：删除（使用中的记录由后端拒绝并提示）
  const removeAssignment = async (id: number) => {
    if (await patch({ action: 'deleteAssignment', assignmentId: id })) {
      setAssignmentDeleteId(null);
      setMsg('');
    }
  };

  const subLabel = subRowLabel(detail.subRow, detail.maxSub ?? 1);
  const path = `${detail.gender === 'MALE' ? '男柜' : '女柜'} · ${detail.rowName}${subLabel ? ` · ${subLabel}` : ''} · ${detail.lockerNo}`;
  const input = 'w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div className="w-full max-w-md bg-white h-full shadow-xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{path}</h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={detail.status === 'FREE' ? 'success' : detail.status === 'OCCUPIED' ? 'info' : 'default'}>
                {STATUS_LABEL[detail.status]}
              </Badge>
              {detail.note && <span className="text-xs text-slate-400">备注：{detail.note}</span>}
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100"><XMarkIcon className="w-5 h-5 text-slate-500" /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* 当前使用人 */}
          <div className="bg-slate-50 rounded-lg p-3 text-sm">
            {active ? (
              <div className="space-y-1">
                <p className="font-medium text-slate-900">{active.employeeName}（{active.employeeId}）</p>
                <p className="text-slate-600">{active.factory ? nameOf(active.factory) : '-'} · {active.department || '-'}</p>
                <p className="text-slate-400 text-xs">分配于 {new Date(active.assignedAt).toLocaleDateString()}{active.reason ? ` · ${active.reason}` : ''}</p>
              </div>
            ) : (
              <p className="text-slate-400">暂无使用人</p>
            )}
          </div>

          {/* 操作按钮 */}
          {!action && !deleteConfirm && (
            <div className="flex gap-2 flex-wrap">
              {detail.status === 'FREE' && <Button size="sm" onClick={() => { setAction('assign'); setMsg(''); setLookupHint(''); }}>分配</Button>}
              {detail.status === 'OCCUPIED' && (
                <Button size="sm" className="bg-amber-500 hover:bg-amber-600 border-amber-500" onClick={() => { setAction('release'); setMsg(''); setForm({ ...form, reason: '' }); }}>回收</Button>
              )}
              <Button size="sm" variant="outline" onClick={() => { setAction('edit'); setMsg(''); }}>
                <PencilIcon className="w-4 h-4 mr-1" /> 编辑
              </Button>
              {detail.status === 'FREE' && (
                <Button size="sm" variant="outline" onClick={() => patch({ action: 'disable' })}>停用</Button>
              )}
              {detail.status === 'DISABLED' && (
                <Button size="sm" variant="outline" onClick={() => patch({ action: 'enable' })}>恢复使用</Button>
              )}
              {detail.status !== 'OCCUPIED' && (
                <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => setDeleteConfirm(true)}>
                  <TrashIcon className="w-4 h-4 mr-1" /> 删除
                </Button>
              )}
            </div>
          )}

          {/* 删除确认 */}
          {deleteConfirm && (
            <div className="border border-red-200 bg-red-50 rounded-lg p-3 space-y-2">
              <p className="text-sm text-red-700">确认删除柜子 {detail.lockerNo}？其变更历史将一并删除，不可恢复。</p>
              <div className="flex gap-2">
                <Button size="sm" className="bg-red-500 hover:bg-red-600 border-red-500" onClick={submitDelete}>确认删除</Button>
                <Button size="sm" variant="ghost" onClick={() => setDeleteConfirm(false)}>取消</Button>
              </div>
            </div>
          )}

          {/* 分配表单：工号带出 + 工厂下拉 */}
          {action === 'assign' && (
            <div className="border border-blue-200 bg-blue-50/50 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-800">分配更衣柜</span>
                <button onClick={() => setAction(null)} className="text-slate-400 hover:text-slate-600"><XMarkIcon className="w-4 h-4" /></button>
              </div>
              <div className="flex gap-2">
                <input
                  value={form.employeeId}
                  onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                  onBlur={lookupEmployee}
                  onKeyDown={(e) => e.key === 'Enter' && lookupEmployee()}
                  placeholder="工号（回车带出档案）"
                  className={input}
                />
              </div>
              {lookupHint && (
                <p className={`text-xs ${lookupHint.includes('不可') ? 'text-red-600' : lookupHint.includes('未找到') ? 'text-amber-600' : 'text-emerald-600'}`}>{lookupHint}</p>
              )}
              <input value={form.employeeName} onChange={(e) => setForm({ ...form, employeeName: e.target.value })} placeholder="姓名（可自动带出）" className={input} />
              <select
                value={form.factory}
                onChange={(e) => setForm({ ...form, factory: e.target.value })}
                className={input + ' bg-white'}
              >
                <option value="">工厂（可自动带出）</option>
                {factories.map((f) => (
                  <option key={f.id} value={f.code}>
                    {f.name}
                  </option>
                ))}
              </select>
              <input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="部门（可自动带出）" className={input} />
              <input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="备注/原因（选填）" className={input} />
              {msg && <p className="text-xs text-red-600">{msg}</p>}
              <button onClick={submit} className="w-full py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">确认分配</button>
            </div>
          )}

          {/* 回收表单 */}
          {action === 'release' && (
            <div className="border border-blue-200 bg-blue-50/50 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-800">回收更衣柜</span>
                <button onClick={() => setAction(null)} className="text-slate-400 hover:text-slate-600"><XMarkIcon className="w-4 h-4" /></button>
              </div>
              <input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="回收原因（选填，如 离职/调岗）" className={input} />
              {msg && <p className="text-xs text-red-600">{msg}</p>}
              <button onClick={submit} className="w-full py-2 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600">确认回收</button>
            </div>
          )}

          {/* 编辑表单：改柜号/层号/备注 */}
          {action === 'edit' && (
            <div className="border border-blue-200 bg-blue-50/50 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-800">编辑柜子</span>
                <button onClick={() => setAction(null)} className="text-slate-400 hover:text-slate-600"><XMarkIcon className="w-4 h-4" /></button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input value={editForm.lockerNo} onChange={(e) => setEditForm({ ...editForm, lockerNo: e.target.value })} placeholder="柜号" className={input} />
                <select
                  value={String(editForm.subRow)}
                  onChange={(e) => setEditForm({ ...editForm, subRow: parseInt(e.target.value, 10) || 1 })}
                  className={input + ' bg-white'}
                >
                  <option value="1">第1层</option>
                  <option value="2">第2层</option>
                  <option value="3">第3层</option>
                </select>
              </div>
              <input value={editForm.note} onChange={(e) => setEditForm({ ...editForm, note: e.target.value })} placeholder="备注" className={input} />
              {msg && <p className="text-xs text-red-600">{msg}</p>}
              <button onClick={submit} className="w-full py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">保存修改</button>
            </div>
          )}

          {/* 变更历史（支持编辑 / 删除） */}
          <div>
            <h3 className="text-sm font-semibold text-slate-800 mb-2">变更历史</h3>
            {detail.assignments.length === 0 ? (
              <p className="text-xs text-slate-400">暂无记录</p>
            ) : (
              <ol className="relative border-l border-slate-200 space-y-3 pl-4">
                {detail.assignments.map((a) => (
                  <li key={a.id} className="text-sm">
                    <span className={`absolute -left-[5px] w-2.5 h-2.5 rounded-full ${a.status === 'ACTIVE' ? 'bg-blue-500' : 'bg-slate-300'}`} />
                    {assignmentEditId === a.id ? (
                      <div className="space-y-2 bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-slate-600">编辑记录</span>
                          <button onClick={() => setAssignmentEditId(null)} className="text-slate-400 hover:text-slate-600"><XMarkIcon className="w-4 h-4" /></button>
                        </div>
                        <input value={assignmentForm.employeeId} onChange={(e) => setAssignmentForm({ ...assignmentForm, employeeId: e.target.value })} placeholder="工号" className={input} />
                        <input value={assignmentForm.employeeName} onChange={(e) => setAssignmentForm({ ...assignmentForm, employeeName: e.target.value })} placeholder="姓名" className={input} />
                        <select
                          value={assignmentForm.factory}
                          onChange={(e) => setAssignmentForm({ ...assignmentForm, factory: e.target.value })}
                          className={input + ' bg-white'}
                        >
                          <option value="">工厂（可选）</option>
                          {factories.map((f) => <option key={f.id} value={f.code}>{f.name}</option>)}
                        </select>
                        <input value={assignmentForm.department} onChange={(e) => setAssignmentForm({ ...assignmentForm, department: e.target.value })} placeholder="部门（可选）" className={input} />
                        <input value={assignmentForm.reason} onChange={(e) => setAssignmentForm({ ...assignmentForm, reason: e.target.value })} placeholder="原因（可选）" className={input} />
                        {msg && <p className="text-xs text-red-600">{msg}</p>}
                        <div className="flex gap-2">
                          <button onClick={saveAssignment} className="flex-1 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700">保存</button>
                          <button onClick={() => setAssignmentEditId(null)} className="flex-1 py-1.5 text-xs bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300">取消</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-slate-800">
                          {a.employeeName}（{a.employeeId}）
                          <span className="text-xs text-slate-400 ml-1">{a.factory ? nameOf(a.factory) : ''} {a.department || ''}</span>
                          <span className="inline-flex gap-1 ml-2 align-middle">
                            <button
                              onClick={() => startEditAssignment(a)}
                              title="编辑此记录"
                              className="text-slate-400 hover:text-blue-600"
                            >
                              <PencilIcon className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => { setAssignmentEditId(null); setAssignmentDeleteId(assignmentDeleteId === a.id ? null : a.id); }}
                              disabled={a.status === 'ACTIVE'}
                              title={a.status === 'ACTIVE' ? '使用中的记录不可删除，请先回收' : '删除此记录'}
                              className={a.status === 'ACTIVE' ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-red-600'}
                            >
                              <TrashIcon className="w-3.5 h-3.5" />
                            </button>
                          </span>
                        </p>
                        <p className="text-xs text-slate-400">
                          {new Date(a.assignedAt).toLocaleString()} 分配
                          {a.releasedAt && <> · {new Date(a.releasedAt).toLocaleString()} 回收</>}
                        </p>
                        {a.reason && <p className="text-xs text-slate-500">原因：{a.reason}</p>}
                        {assignmentDeleteId === a.id && (
                          <div className="mt-1 flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-2.5 py-2 flex-wrap">
                            <span className="text-xs text-red-600">确认删除此条记录？不可恢复</span>
                            <button onClick={() => removeAssignment(a.id)} className="px-2 py-0.5 text-xs bg-red-600 text-white rounded hover:bg-red-700">确认</button>
                            <button onClick={() => setAssignmentDeleteId(null)} className="px-2 py-0.5 text-xs bg-white text-slate-600 border border-slate-300 rounded hover:bg-slate-50">取消</button>
                            {msg && <p className="text-xs text-red-700 w-full">{msg}</p>}
                          </div>
                        )}
                      </>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
