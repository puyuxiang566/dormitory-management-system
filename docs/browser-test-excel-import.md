# 浏览器自动化调试报告：Excel 导入住宿历史记录

## 调试时间
2026-03-23

## 问题描述
用户使用 `人员档案 1.xlsx` 导入人员后，发现"住宿与调整历史"显示的信息与 Excel 实际内容不符，所有记录都显示为"退宿"。

## 根本原因

在 [`src/app/api/persons/import/route.ts`](src/app/api/persons/import/route.ts#L262-L283) 文件中，处理住宿变动历史的逻辑存在严重缺陷：

### 问题代码（已修复前）
```typescript
if (record.recordType === '退宿') {
  fromRoomId = toRoomId; // ❌ 错误：toRoomId 通常为空
  toRoomId = null;
}
```

### 问题分析
1. **退宿时 `toRoomId` 为空**：因为退宿没有"到房间"
2. **错误赋值**：`fromRoomId = toRoomId` 导致 `fromRoomId` 也变成 `null`
3. **数据库记录异常**：`fromRoomId = null` 且 `toRoomId = null`
4. **前端显示误判**：在 `PersonDetailModal.tsx` 中，判断逻辑将双 null 记录识别为"退宿"

## 修复方案

### 核心修复
引入 `lastRoomId` 变量跟踪房间变化过程：

```typescript
let lastRoomId: number | null = roomId; // 跟踪房间变化

for (const record of historyRecords) {
  let fromRoomId: number | null = null;
  let toRoomId: number | null = null;

  // 解析到房间
  if (record.toRoomStr) {
    // ... 解析逻辑 ...
  }

  if (record.recordType === '入住') {
    fromRoomId = null;
    if (!toRoomId) toRoomId = roomId;
    lastRoomId = toRoomId; // ✅ 更新房间
  } else if (record.recordType === '退宿') {
    fromRoomId = lastRoomId; // ✅ 从最后房间退宿
    toRoomId = null;
  } else if (record.recordType === '换宿') {
    fromRoomId = lastRoomId; // ✅ 从最后房间换出
    if (toRoomId) lastRoomId = toRoomId;
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

### 修复效果
| 记录类型 | fromRoomId | toRoomId | 前端显示 |
|---------|-----------|---------|---------|
| 入住    | NULL      | 房间 ID  | 🟢 入住 XXX 房间 |
| 退宿    | 房间 ID   | NULL    | ⚫ 退宿 XXX 房间 |
| 换宿    | 原房间 ID | 新房间 ID | 🔵 由 XXX 调整至 XXX |

## 浏览器自动化测试

### 测试环境
- 开发服务器：http://localhost:3001
- 浏览器：Chromium (agent-browser)
- 测试文件：`人员档案 1.xlsx`

### 测试步骤

#### 1. 启动开发服务器
```bash
npm run dev
# 服务器运行在 http://localhost:3001
```

#### 2. 登录系统
```bash
agent-browser open http://localhost:3001/admin/persons
agent-browser find placeholder "请输入用户名" click
agent-browser keyboard type "admin"
agent-browser find placeholder "请输入密码" click
agent-browser keyboard type "admin123"
agent-browser find text "登录" click
agent-browser wait 2000
```

#### 3. 导入 Excel 文件
在有头模式下手动操作：
1. 点击"导入人员"按钮
2. 选择文件 `人员档案 1.xlsx`
3. 等待导入完成

#### 4. 验证导入结果
```bash
# 查看导入结果
agent-browser snapshot | Select-String -Pattern "成功 | 失败"

# 查看人员列表
agent-browser snapshot -i
```

#### 5. 查看住宿历史
1. 点击任意导入人员的"详情"按钮
2. 查看"住宿与调整历史"部分
3. 验证记录类型和显示内容

### 测试截图
（待补充手动测试截图）

## 手动测试步骤

由于无头浏览器无法直接上传文件，请按以下步骤手动测试：

### 1. 启动服务器
```bash
npm run dev
```

### 2. 访问人员档案页面
打开浏览器访问：http://localhost:3001/admin/persons

### 3. 登录
- 用户名：admin
- 密码：admin123

### 4. 导入 Excel 文件
1. 点击"导入人员"按钮
2. 选择文件 `人员档案 1.xlsx`
3. 等待导入完成

### 5. 验证结果
1. 查看导入结果提示
2. 点击人员详情
3. 检查"住宿与调整历史"
4. 确认记录类型正确（入住/退宿/换宿）

## Excel 文件格式

### 住宿变动记录格式
```
记录类型 | 变动日期 | 到房间 | 变动原因
入住    | 2025-01-01 | A 栋 101 | 新入职
换宿    | 2025-06-01 | A 栋 201 | 调整房间
退宿    | 2025-12-31 |  | 离职
```

### 多列格式（兼容）
| 记录类型 1 | 变动日期 1 | 到房间 1 | 变动原因 1 |
|-----------|-----------|---------|-----------|
| 入住      | 2025-01-01 | A 栋 101 | 新入职    |

## 数据库验证

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
WHERE p.employeeId IN (SELECT employeeId FROM Person WHERE createdAt > '2026-03-23')
ORDER BY h.changeDate DESC;
```

**预期结果：**
- 入住记录：`fromRoomId = NULL`, `toRoomId ≠ NULL`
- 退宿记录：`fromRoomId ≠ NULL`, `toRoomId = NULL`
- 换宿记录：`fromRoomId ≠ NULL`, `toRoomId ≠ NULL`

## 验证检查清单

- [x] 类型检查通过 (`npm run type-check`)
- [ ] 开发服务器正常运行
- [ ] Excel 文件导入成功
- [ ] 住宿历史记录正确显示
- [ ] 数据库记录符合预期
- [ ] 前端显示与 Excel 内容一致

## 相关文件
- [`src/app/api/persons/import/route.ts`](src/app/api/persons/import/route.ts) - 人员导入 API（已修复）
- [`src/app/admin/persons/PersonDetailModal.tsx`](src/app/admin/persons/PersonDetailModal.tsx) - 人员详情模态框
- [`docs/fix-room-history-display.md`](docs/fix-room-history-display.md) - 住宿历史显示修复报告

## 修复时间
2026-03-23

## 注意事项
1. **重新导入前清理数据**：如果之前已导入过测试数据，建议先删除相关人员记录
2. **Excel 格式要求**：确保"住宿变动记录"列的格式正确
3. **房间匹配**：确保 Excel 中的楼栋名和房间号在数据库中已存在
4. **浏览器缓存**：测试前清除浏览器缓存或强制刷新（Ctrl+F5）

## 后续改进建议
1. 添加导入预览功能，在确认前显示将要创建的记录
2. 支持 Excel 模板下载，减少格式错误
3. 添加导入数据验证，提前发现潜在问题
4. 提供导入回滚功能，方便纠正错误
