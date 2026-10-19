# Excel 导入住宿历史记录错误修复报告

## 问题描述
用户反馈：使用 `人员档案 1.xlsx` 导入人员后，"住宿与调整历史"显示的信息与 Excel 中的实际内容不符，所有记录都显示为"退宿"。

## 问题原因

### 根本原因
在 `src/app/api/persons/import/route.ts` 文件中，处理住宿变动历史记录的逻辑存在严重缺陷（第 262-272 行）。

**修复前的错误代码：**
```typescript
if (record.recordType === '入住') {
  fromRoomId = null;
} else if (record.recordType === '退宿') {
  fromRoomId = toRoomId; // ❌ 错误：toRoomId 可能为 null
  toRoomId = null;
} else if (record.recordType === '换宿') {
  // fromRoomId 保持不变
}
```

### 问题分析

1. **退宿逻辑错误**（第 267 行）：
   ```typescript
   fromRoomId = toRoomId; // 使用解析出来的房间作为原房间
   ```
   - 问题：退宿时 `toRoomId` 通常为空（因为退宿没有"到房间"）
   - 结果：导致 `fromRoomId` 也变成了 `null`
   - 最终：数据库中的记录变成 `fromRoomId = null` 且 `toRoomId = null`

2. **缺少房间跟踪**：
   - 没有跟踪人员在换宿过程中的房间变化
   - 导致退宿时无法确定该人员当时所在的房间

3. **显示逻辑误判**：
   - 在 `PersonDetailModal.tsx` 中，判断记录类型的逻辑依赖 `fromRoomId` 和 `toRoomId`
   - 当两个字段都为 `null` 时，会被误判为"退宿"

## 修复方案

### 修改文件
`src/app/api/persons/import/route.ts`

### 修复内容

引入 `lastRoomId` 变量跟踪房间变化：

```typescript
let lastRoomId: number | null = roomId; // 用于跟踪换宿过程中的房间变化

for (const record of historyRecords) {
  let fromRoomId: number | null = null;
  let toRoomId: number | null = null;

  // 解析到房间（新房间）
  if (record.toRoomStr) {
    // ... 解析逻辑 ...
  }

  // 根据记录类型设置 fromRoomId 和 toRoomId
  if (record.recordType === '入住') {
    fromRoomId = null;
    if (!toRoomId) {
      toRoomId = roomId;
    }
    lastRoomId = toRoomId; // ✅ 更新最后房间
  } else if (record.recordType === '退宿') {
    fromRoomId = lastRoomId; // ✅ 从最后所在的房间退宿
    toRoomId = null;
  } else if (record.recordType === '换宿') {
    fromRoomId = lastRoomId; // ✅ 从最后所在的房间换出
    if (toRoomId) {
      lastRoomId = toRoomId; // ✅ 更新最后房间
    }
  }

  // 创建历史记录
  await prisma.roomChangeHistory.create({
    data: {
      personId: person.id,
      fromRoomId,
      toRoomId,
      changeDate: new Date(record.changeDate),
      reason: record.reason || null,
    },
  });
}
```

### 修复逻辑

1. **引入 `lastRoomId`**：跟踪人员在住宿变动过程中的房间变化
2. **入住**：更新 `lastRoomId` 为入住房间
3. **退宿**：使用 `lastRoomId` 作为退宿房间（`fromRoomId`）
4. **换宿**：从 `lastRoomId` 换到 `toRoomId`，然后更新 `lastRoomId`

## 验证步骤

### 1. 类型检查
```bash
npm run type-check
```
✅ 已通过

### 2. 启动开发服务器
```bash
npm run dev
```
✅ 服务器运行在 http://localhost:3001

### 3. 浏览器自动化测试导入

#### 3.1 登录并导航
```bash
agent-browser open http://localhost:3001/admin/persons
agent-browser wait 2000
```

#### 3.2 点击导入按钮
```bash
agent-browser find text "导入人员" click
agent-browser wait 500
```

#### 3.3 选择 Excel 文件
```bash
# 在有头模式下手动选择文件
# 人员档案 1.xlsx
```

#### 3.4 验证导入结果
1. 查看导入结果提示（成功/失败条数）
2. 点击任意导入的人员详情
3. 查看"住宿与调整历史"部分
4. 验证记录类型是否正确：
   - 入住：绿色标记
   - 退宿：灰色标记
   - 换宿：蓝色标记

### 4. 数据库验证

查询导入的记录：
```sql
SELECT 
  h.id,
  h.personId,
  p.name,
  p.employeeId,
  h.fromRoomId,
  h.toRoomId,
  h.reason,
  h.changeDate,
  fr.roomNumber as fromRoom,
  tr.roomNumber as toRoom
FROM RoomChangeHistory h
JOIN Person p ON h.personId = p.id
LEFT JOIN Room fr ON h.fromRoomId = fr.id
LEFT JOIN Room tr ON h.toRoomId = tr.id
ORDER BY h.changeDate DESC
LIMIT 20;
```

**预期结果：**
- 入住记录：`fromRoomId = NULL`, `toRoomId = 房间 ID`
- 退宿记录：`fromRoomId = 房间 ID`, `toRoomId = NULL`
- 换宿记录：`fromRoomId = 原房间 ID`, `toRoomId = 新房间 ID`

## Excel 文件格式示例

### 住宿变动记录格式（合并单元格）
```
记录类型 | 变动日期 | 到房间 | 变动原因
入住    | 2025-01-01 | A 栋 101 | 新入职
换宿    | 2025-06-01 | A 栋 201 | 调整房间
退宿    | 2025-12-31 |  | 离职
```

### 多列格式（兼容格式）
| 记录类型 1 | 变动日期 1 | 到房间 1 | 变动原因 1 |
|-----------|-----------|---------|-----------|
| 入住      | 2025-01-01 | A 栋 101 | 新入职    |

## 预期修复效果

修复后，导入的住宿历史记录应该正确显示：

| 记录类型 | fromRoomId | toRoomId | 前端显示 |
|---------|-----------|---------|---------|
| 入住    | NULL      | 房间 ID  | 绿色"入住 XXX 房间" |
| 退宿    | 房间 ID   | NULL    | 灰色"退宿 XXX 房间" |
| 换宿    | 原房间 ID | 新房间 ID | 蓝色"由 XXX 调整至 XXX" |

## 相关文件
- `src/app/api/persons/import/route.ts` - 人员导入 API
- `src/app/admin/persons/PersonDetailModal.tsx` - 人员详情模态框
- `prisma/schema.prisma` - RoomChangeHistory 数据模型

## 修复时间
2026-03-23

## 注意事项
1. **重新导入前清理数据**：如果之前已导入过测试数据，建议先删除相关人员记录
2. **Excel 格式要求**：确保"住宿变动记录"列的格式正确，使用 `|` 分隔字段
3. **房间匹配**：确保 Excel 中的楼栋名和房间号在数据库中已存在
