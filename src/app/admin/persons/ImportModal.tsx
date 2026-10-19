'use client';

import { useState, useRef } from 'react';
import { Modal, Button, Loading } from '@/components/ui';
import { useToastHelpers } from '@/components/ui';
import { api } from '@/lib/api';

interface DuplicateInfo {
  rowIndex: number;
  importData: {
    employeeId: string;
    name: string;
    gender?: string;
    factory?: string;
    department?: string;
    position?: string;
    phone?: string;
    idCard?: string;
    isRoomLeader?: boolean;
    status?: string;
    buildingName?: string;
    roomNumber?: string;
    bedNumber?: string;
    checkInDate?: string;
    checkOutDate?: string;
    emergencyName?: string;
    emergencyRelationship?: string;
    emergencyPhone?: string;
    // 内部字段
    buildingId?: number | null;
    roomId?: number | null;
    _gender?: string;
    _status?: string;
  };
  existingPerson: {
    id: number;
    employeeId: string;
    name: string;
    gender?: string | null;
    factory?: string | null;
    department?: string | null;
    position?: string | null;
    phone?: string | null;
    idCard?: string | null;
    isRoomLeader?: boolean | null;
    status?: string | null;
    buildingName?: string | null;
    roomNumber?: string | null;
    bedNumber?: string | null;
    checkInDate?: string | null;
    checkOutDate?: string | null;
    emergencyName?: string | null;
    emergencyRelationship?: string | null;
    emergencyPhone?: string | null;
  };
}

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ImportModal({ isOpen, onClose, onSuccess }: ImportModalProps) {
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<{
    success: number;
    failed: number;
    errors: string[];
    duplicates: DuplicateInfo[];
    hasDuplicates: boolean;
  } | null>(null);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [selectedDuplicates, setSelectedDuplicates] = useState<Set<number>>(new Set());
  const [overwriting, setOverwriting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToastHelpers();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        toast.error('文件格式错误', '请上传 Excel 文件 (.xlsx 或 .xls)');
        return;
      }
      setImportFile(file);
      setImportResult(null);
      setShowDuplicates(false);
      setSelectedDuplicates(new Set());
    }
  };

  const handleImportSubmit = async () => {
    if (!importFile) {
      toast.warning('请选择文件', '请先选择一个 Excel 文件');
      return;
    }

    setImporting(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', importFile);

      const result = await api.persons.import(formData);

      if (result.error) {
        toast.error('导入失败', result.error);
      } else {
        const data = result as any;
        setImportResult(data);
        if (data.hasDuplicates && data.duplicates && data.duplicates.length > 0) {
          setShowDuplicates(true);
          setSelectedDuplicates(new Set(data.duplicates.map((_: any, idx: number) => idx)));
        } else {
          toast.success('导入完成', `成功: ${data.success}, 失败: ${data.failed}`);
          onSuccess();
        }
      }
    } catch (err: any) {
      toast.error('导入失败', err.message);
    } finally {
      setImporting(false);
    }
  };

  const handleOverwrite = async () => {
    if (selectedDuplicates.size === 0) {
      toast.warning('请选择要覆盖的记录', '至少选择一条记录进行覆盖');
      return;
    }

    setOverwriting(true);

    try {
      const overwriteList = Array.from(selectedDuplicates).map(idx => ({
        existingId: importResult!.duplicates[idx].existingPerson.id,
        importData: importResult!.duplicates[idx].importData,
      }));

      const result = await fetch('/api/persons/import/overwrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ overwriteList }),
      });

      const data = await result.json();

      if (data.error) {
        toast.error('覆盖失败', data.error);
      } else {
        toast.success('覆盖完成', `成功覆盖: ${data.success}, 失败: ${data.failed}`);
        setShowDuplicates(false);
        setImportResult(null);
        setImportFile(null);
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      toast.error('覆盖失败', err.message);
    } finally {
      setOverwriting(false);
    }
  };

  const handleClose = () => {
    setImportFile(null);
    setImportResult(null);
    setShowDuplicates(false);
    setSelectedDuplicates(new Set());
    onClose();
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN');
  };

  const compareValue = (importVal: any, existingVal: any) => {
    // 处理 null/undefined/空字符串为相同
    const normalize = (val: any) => {
      if (val === null || val === undefined || val === '') return null;
      return val;
    };
    const normImport = normalize(importVal);
    const normExisting = normalize(existingVal);

    if (normImport === normExisting) return '';
    if (!normImport && normExisting) return `无 → ${normExisting}`;
    if (normImport && !normExisting) return `${normImport} → 无`;
    return `${normExisting} → ${normImport}`;
  };

  if (showDuplicates && importResult?.duplicates) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="发现重复记录"
        description={`检测到 ${importResult.duplicates.length} 条重复工号，请选择要覆盖的记录`}
        size="lg"
      >
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {importResult.duplicates.map((dup, idx) => (
            <div
              key={idx}
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                selectedDuplicates.has(idx)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
              onClick={() => {
                const newSet = new Set(selectedDuplicates);
                if (newSet.has(idx)) {
                  newSet.delete(idx);
                } else {
                  newSet.add(idx);
                }
                setSelectedDuplicates(newSet);
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  checked={selectedDuplicates.has(idx)}
                  onChange={() => {}}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="font-medium text-slate-900">
                  工号: {dup.importData.employeeId}
                </span>
                <span className="text-slate-500">({dup.rowIndex}行)</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="font-medium text-slate-700 border-b border-slate-100 pb-1 col-span-2">
                  {dup.importData.name} ↔ {dup.existingPerson.name}
                </div>
                {[
                  { label: '性别', importVal: dup.importData.gender, existingVal: dup.existingPerson.gender },
                  { label: '工厂', importVal: dup.importData.factory, existingVal: dup.existingPerson.factory },
                  { label: '部门', importVal: dup.importData.department, existingVal: dup.existingPerson.department },
                  { label: '职位', importVal: dup.importData.position, existingVal: dup.existingPerson.position },
                  { label: '电话', importVal: dup.importData.phone, existingVal: dup.existingPerson.phone },
                  { label: '身份证号', importVal: dup.importData.idCard, existingVal: dup.existingPerson.idCard },
                  { label: '是否舍长', importVal: dup.importData.isRoomLeader ? '是' : '否', existingVal: dup.existingPerson.isRoomLeader ? '是' : '否' },
                  { label: '状态', importVal: dup.importData.status, existingVal: dup.existingPerson.status },
                  { label: '楼栋', importVal: dup.importData.buildingName, existingVal: dup.existingPerson.buildingName },
                  { label: '房间', importVal: dup.importData.roomNumber, existingVal: dup.existingPerson.roomNumber },
                  { label: '床位号', importVal: dup.importData.bedNumber, existingVal: dup.existingPerson.bedNumber },
                  { label: '入住日期', importVal: formatDate(dup.importData.checkInDate), existingVal: formatDate(dup.existingPerson.checkInDate as string) },
                  { label: '退宿日期', importVal: formatDate(dup.importData.checkOutDate), existingVal: formatDate(dup.existingPerson.checkOutDate as string) },
                  { label: '紧急联系人', importVal: dup.importData.emergencyName, existingVal: dup.existingPerson.emergencyName },
                  { label: '紧急联系人关系', importVal: dup.importData.emergencyRelationship, existingVal: dup.existingPerson.emergencyRelationship },
                  { label: '紧急联系人电话', importVal: dup.importData.emergencyPhone, existingVal: dup.existingPerson.emergencyPhone },
                ].map((field, fieldIdx) => {
                  const diff = compareValue(field.importVal, field.existingVal);
                  return (
                    <div key={fieldIdx} className={diff ? 'bg-yellow-50 px-2 py-1 rounded' : ''}>
                      <span className="text-slate-500">{field.label}:</span>
                      <span className={diff ? 'text-orange-600 font-medium' : 'text-slate-700'}>
                        {field.importVal || '-'}
                      </span>
                      {diff && (
                        <>
                          <span className="text-slate-400 mx-1">→</span>
                          <span className="text-slate-700">{field.existingVal || '-'}</span>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-200">
          <div className="text-sm text-slate-500">
            已选择 {selectedDuplicates.size} / {importResult.duplicates.length} 条
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setSelectedDuplicates(new Set(importResult.duplicates.map((_: any, i: number) => i)))}
            >
              全选
            </Button>
            <Button variant="ghost" onClick={handleClose}>
              取消
            </Button>
            <Button
              variant="primary"
              onClick={handleOverwrite}
              loading={overwriting}
              disabled={selectedDuplicates.size === 0}
            >
              确认覆盖 ({selectedDuplicates.size})
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="导入人员档案"
      description="上传 Excel 文件批量导入人员信息"
      size="md"
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            选择 Excel 文件
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="flex items-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              选择文件
            </button>
            {importFile && (
              <span className="text-sm text-slate-600">
                {importFile.name}
              </span>
            )}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            支持 .xlsx 和 .xls 格式，必填列：工号、姓名
          </p>
        </div>

        {importResult && (
          <div className="p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-4 text-sm">
              <span className="text-green-600">成功: {importResult.success}</span>
              <span className="text-red-600">失败: {importResult.failed}</span>
              {importResult.duplicates && importResult.duplicates.length > 0 && (
                <span className="text-orange-600">重复: {importResult.duplicates.length}</span>
              )}
            </div>
            {importResult.errors.length > 0 && (
              <div className="mt-2 max-h-32 overflow-y-auto">
                <p className="text-xs text-slate-500 mb-1">错误详情:</p>
                {importResult.errors.slice(0, 5).map((err, idx) => (
                  <p key={idx} className="text-xs text-red-500">{err}</p>
                ))}
                {importResult.errors.length > 5 && (
                  <p className="text-xs text-slate-500">...还有 {importResult.errors.length - 5} 条错误</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <Button variant="ghost" onClick={handleClose}>
          关闭
        </Button>
        <Button
          variant="primary"
          onClick={handleImportSubmit}
          loading={importing}
          disabled={!importFile}
        >
          开始导入
        </Button>
      </div>
    </Modal>
  );
}
