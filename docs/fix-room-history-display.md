# 住宿与调整历史显示问题修复报告

## 问题描述
用户反馈：在人员档案的"查看所有信息"中，"住宿与调整历史"显示的所有记录都变成了"退宿记录"，与数据库中的实际记录不符。

## 问题原因

### 根本原因
在 `src/app/admin/persons/PersonDetailModal.tsx` 文件的 `TimelineView` 组件中，判断历史记录类型的逻辑存在缺陷：

**修复前的代码（第 31 行）：**
```typescript
const historyType = !toRoomId ? 'checkout' : (!fromRoomId ? 'checkin' : 'change');
```

这个简单的三元运算符逻辑存在以下问题：
1. **仅依赖 `fromRoomId` 和 `toRoomId` 的存在性判断**，没有考虑 `reason` 字段
2. **当数据结构异常时容易误判**（例如两个字段都为空或都有值但实际是退宿）
3. **没有优先使用明确的 `reason` 字段**进行判断

### 数据库设计
`RoomChangeHistory` 表包含以下关键字段：
- `fromRoomId`: 原房间 ID（可为空）
- `toRoomId`: 新房间 ID（可为空）
- `reason`: 换宿原因（如"退宿"、"入住/重新分配"、"信息修改导致换宿"等）

根据业务逻辑：
- **退宿**: `reason = '退宿'` 或 `toRoomId = null` 且 `fromRoomId ≠ null`
- **入住**: `reason = '入住/重新分配'` 或 `fromRoomId = null` 且 `toRoomId ≠ null`
- **换宿**: 其他情况（`fromRoomId` 和 `toRoomId` 都存在）

## 修复方案

### 修改文件
`src/app/admin/persons/PersonDetailModal.tsx`

### 修改内容
```typescript
// 根据 reason 字段判断类型
let historyType: 'checkin' | 'checkout' | 'change';
if (history.reason === '退宿' || (!toRoomId && fromRoomId)) {
  historyType = 'checkout';
} else if (history.reason === '入住/重新分配' || (!fromRoomId && toRoomId)) {
  historyType = 'checkin';
} else {
  historyType = 'change';
}
```

### 修复逻辑
1. **优先使用 `reason` 字段判断**：如果 `reason` 明确为"退宿"或"入住/重新分配"，直接使用该值
2. **降级到房间 ID 判断**：如果 `reason` 字段不可用，使用 `fromRoomId` 和 `toRoomId` 的组合判断
3. **默认处理**：其他情况统一视为"换宿"

## 验证步骤

### 1. 类型检查
```bash
npm run type-check
```
✅ 已通过

### 2. 手动测试
1. 访问 http://localhost:3003/admin/persons
2. 点击任意人员的"详情"按钮
3. 查看"住宿与调整历史"部分
4. 验证显示类型是否正确：
   - 入住记录应显示为绿色"入住"
   - 退宿记录应显示为灰色"退宿"
   - 换宿记录应显示为蓝色"换宿"

### 3. 数据库验证
查询数据库中的 `RoomChangeHistory` 表，确认 `reason` 字段的值：
```sql
SELECT id, personId, fromRoomId, toRoomId, reason, changeDate
FROM roomchangehistory
ORDER BY changeDate DESC;
```

## 预期结果

修复后，"住宿与调整历史"应该正确显示：
- ✅ **入住记录**：绿色标记，显示"入住 XXX 楼栋 XXX 房间"
- ✅ **退宿记录**：灰色标记，显示"退宿 XXX 楼栋 XXX 房间"
- ✅ **换宿记录**：蓝色标记，显示"由 XXX 调整至 XXX"

## 相关文件
- `src/app/admin/persons/PersonDetailModal.tsx` - 人员详情模态框组件
- `src/app/api/persons/[id]/route.ts` - 人员详情 API（包含 `roomchangehistory` 查询）
- `prisma/schema.prisma` - 数据库模型定义

## 修复时间
2026-03-23
