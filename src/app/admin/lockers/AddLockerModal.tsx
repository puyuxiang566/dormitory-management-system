'use client';

import { useState, useEffect } from 'react';
import { Button, Modal, Input } from '@/components/ui';

export interface AddLockerInitial {
  gender: string;
  rowName: string;
  subRow: number;
}

export default function AddLockerModal({
  isOpen, initial, onClose, onCreated,
}: {
  isOpen: boolean;
  initial: AddLockerInitial | null;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({ gender: 'MALE', rowName: '', subRow: 1, lockerNo: '', count: 1, note: '' });
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (isOpen && initial) {
      setForm({ gender: initial.gender, rowName: initial.rowName, subRow: initial.subRow, lockerNo: '', count: 1, note: '' });
      setMsg('');
    }
  }, [isOpen, initial]);

  const submit = async () => {
    setMsg('');
    const res = await fetch('/api/lockers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { setMsg(json.error || '新增失败'); return; }
    onCreated();
    onClose();
  };

  const input = 'w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="新增柜子"
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>取消</Button>
          <Button onClick={submit}>保存</Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">性别 *</label>
            <select
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value })}
              className={input + ' bg-white'}
            >
              <option value="MALE">男柜</option>
              <option value="FEMALE">女柜</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">层号（上下叠放排）*</label>
            <select
              value={String(form.subRow)}
              onChange={(e) => setForm({ ...form, subRow: parseInt(e.target.value, 10) || 1 })}
              className={input + ' bg-white'}
            >
              <option value="1">第1层</option>
              <option value="2">第2层</option>
              <option value="3">第3层</option>
            </select>
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">排名称 *（东/西/南/中开头，如 东七排）</label>
          <Input value={form.rowName} onChange={(e) => setForm({ ...form, rowName: e.target.value })} placeholder="东七排" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">{form.count > 1 ? '起始柜号 *' : '柜号 *'}</label>
            <Input value={form.lockerNo} onChange={(e) => setForm({ ...form, lockerNo: e.target.value })} placeholder="如 8101" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">数量（&gt;1 按柜号连续新增）</label>
            <Input
              type="number" min={1} max={200}
              value={String(form.count)}
              onChange={(e) => setForm({ ...form, count: parseInt(e.target.value, 10) || 1 })}
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">备注</label>
          <Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        </div>
        {msg && <p className="text-xs text-red-600">{msg}</p>}
      </div>
    </Modal>
  );
}
