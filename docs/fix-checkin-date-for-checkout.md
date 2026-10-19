# 退宿人员入住日期显示问题修复报告

## 问题描述
用户反馈：人员修改为退宿状态后，在人员列表中"入住日期"字段仍然显示第一次的入住日期，而不是显示为空。

**预期行为**：退宿人员的入住日期应该为空（null）。

## 问题原因

### 根本原因
在 `src/app/api/persons/[id]/route.ts` 文件中，处理 `checkInDate` 更新的逻辑存在缺陷。

**修复前的代码（第 128-147 行）：**
```typescript
// 只有当提供了 checkInDate 时才更新，避免删除已有值
if (checkInDate !== undefined) {
  updateData.checkInDate = checkInDate ? new Date(checkInDate) : null;
}

// 如果状态变更为退宿，清空住宿信息并设置退宿时间
if (status === 'MOVED_OUT' && originalPerson.status !== 'MOVED_OUT') {
  updateData.building = { disconnect: true };
  updateData.room = { disconnect: true };
  updateData.bedNumber = null;
  updateData.isRoomLeader = false;
  updateData.checkInDate = null; // 清空入住日期
  updateData.checkOutDate = checkOutDate ? new Date(checkOutDate) : new Date();
} else if (checkOutDate !== undefined) {
  updateData.checkOutDate = checkOutDate ? new Date(checkOutDate) : null;
}

// 如果状态从退宿变为其他状态（如在职），若分配了新宿舍则视为新入住
if (originalPerson.status === 'MOVED_OUT' && status === 'ACTIVE') {
  if (buildingId && roomId && bedNumber) {
    updateData.checkInDate = new Date();
    updateData.checkOutDate = null;
  }
}
```

### 问题分析

1. **条件判断不完整**：
   - 只在 `status === 'MOVED_OUT' && originalPerson.status !== 'MOVED_OUT'` 时清空 `checkInDate`
   - 即：**仅在状态从其他变为退宿时**清空入住日期

2. **已退宿人员编辑问题**：
   - 当人员已经是 `MOVED_OUT` 状态时，再次编辑并提交
   - 前端会传递 `checkInDate: null`（因为表单中该字段为空）
   - 但代码进入 `else if (checkOutDate !== undefined)` 分支
   - **没有处理 `checkInDate`**，导致数据库中的旧值保留

3. **前端数据流**：
   - 编辑页面加载时，从 API 获取人员信息
   - 如果人员已退宿，API 返回 `checkInDate: null`
   - 但表单可能仍保留之前的显示值（取决于组件实现）
   - 提交时，无论前端传什么，后端都应该确保退宿人员的 `checkInDate` 为空

## 修复方案

### 修改文件
`src/app/api/persons/[id]/route.ts`

### 修复内容
重构 `checkInDate` 和 `checkOutDate` 的处理逻辑，按状态分类处理：

```typescript
// 处理 checkInDate 和 checkOutDate
if (status === 'MOVED_OUT' && originalPerson.status !== 'MOVED_OUT') {
  // 状态变更为退宿：清空住宿信息并设置退宿时间
  updateData.building = { disconnect: true };
  updateData.room = { disconnect: true };
  updateData.bedNumber = null;
  updateData.isRoomLeader = false;
  updateData.checkInDate = null; // 清空入住日期
  updateData.checkOutDate = checkOutDate ? new Date(checkOutDate) : new Date();
} else if (status === 'MOVED_OUT' && originalPerson.status === 'MOVED_OUT') {
  // 已经是退宿状态：保持 checkInDate 为空
  updateData.checkInDate = null;
  if (checkOutDate !== undefined) {
    updateData.checkOutDate = checkOutDate ? new Date(checkOutDate) : null;
  }
} else if (originalPerson.status === 'MOVED_OUT' && status === 'ACTIVE' && roomId) {
  // 从退宿变为入住状态：设置新的入住日期
  updateData.checkInDate = new Date();
  updateData.checkOutDate = null;
} else {
  // 其他情况：只有当提供了 checkInDate 时才更新
  if (checkInDate !== undefined) {
    updateData.checkInDate = checkInDate ? new Date(checkInDate) : null;
  }
  if (checkOutDate !== undefined) {
    updateData.checkOutDate = checkOutDate ? new Date(checkOutDate) : null;
  }
}
```

### 修复逻辑

1. **首次退宿**（`status === 'MOVED_OUT' && originalPerson.status !== 'MOVED_OUT'`）：
   - 清空住宿信息
   - 清空 `checkInDate`
   - 设置 `checkOutDate`

2. **已退宿人员编辑**（`status === 'MOVED_OUT' && originalPerson.status === 'MOVED_OUT'`）：
   - **强制保持 `checkInDate = null`**（修复关键）
   - 可选更新 `checkOutDate`

3. **退宿重新入住**（`originalPerson.status === 'MOVED_OUT' && status === 'ACTIVE'`）：
   - 设置新的 `checkInDate`（当前日期）
   - 清空 `checkOutDate`

4. **其他情况**（正常状态下的编辑）：
   - 按需提供的日期更新

## 验证步骤

### 1. 类型检查
```bash
npm run type-check
```
✅ 已通过

### 2. 手动测试步骤

#### 测试场景 1：人员退宿
1. 访问 http://localhost:3001/admin/persons
2. 选择一个在住人员
3. 点击"编辑"
4. 将"住宿状态"改为"已退宿"
5. 保存
6. **验证**：列表中该人员的"入住日期"列应为空

#### 测试场景 2：编辑已退宿人员
1. 选择一个已退宿人员
2. 点击"编辑"
3. 修改其他信息（如部门、职位）
4. 保存
5. **验证**：列表中该人员的"入住日期"列仍为空

#### 测试场景 3：退宿人员重新入住
1. 选择一个已退宿人员
2. 点击"编辑"
3. 将"住宿状态"改为"在住"
4. 分配楼栋、房间、床位
5. 保存
6. **验证**：列表中该人员的"入住日期"列应显示为今天

### 3. 数据库验证

查询退宿人员的入住日期：
```sql
SELECT 
  id,
  employeeId,
  name,
  status,
  checkInDate,
  checkOutDate
FROM Person
WHERE status = 'MOVED_OUT'
ORDER BY checkOutDate DESC
LIMIT 10;
```

**预期结果**：所有退宿人员的 `checkInDate` 应为 `NULL`

## 相关文件
- `src/app/api/persons/[id]/route.ts` - 人员更新 API
- `src/app/api/persons/checkout/route.ts` - 批量退宿 API
- `src/app/admin/persons/[id]/edit/page.tsx` - 人员编辑页面
- `src/app/admin/persons/columns.tsx` - 人员列表列定义

## 修复时间
2026-03-23

## 注意事项
1. **数据一致性**：修复后，所有退宿人员的 `checkInDate` 都将被清空
2. **历史记录**：`RoomChangeHistory` 表中的历史记录不受影响
3. **前端显示**：确保列表组件正确处理 `null` 值，显示为"-"或空

## 相关修复
本次修复与之前的修复相关联：
- 住宿与调整历史显示修复
- Excel 导入住宿历史记录修复

所有修复共同确保了住宿数据的一致性和准确性。
