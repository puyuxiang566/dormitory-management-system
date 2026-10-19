# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个 **Next.js 14 全栈应用**（宿舍管理系统 / Dormitory Management System），一站式数字化宿舍管理平台，整合人员信息、出入安全、费用结算及日常运营功能。

**技术栈**: Next.js 14 (App Router) + TypeScript 5.4 + MySQL + Prisma ORM + NextAuth.js + Tailwind CSS 3.4

**Node.js 要求**: >= 24.12.0

## 常用命令

### 开发

```bash
# 启动开发服务器（推荐 PowerShell 方式，包含完整的健康检查和自动初始化）
.\start-dev.ps1

# 或直接使用 npm
npm run dev
```

PowerShell 启动脚本功能：
- 自动检查 Node.js 版本和依赖
- 自动同步数据库结构
- 自动解决端口冲突（3000）
- 自动打开浏览器

### 代码质量

```bash
npm run lint           # ESLint 检查
npm run type-check     # TypeScript 检查（tsc --noEmit）
```

### 数据库操作

```bash
npm run db:generate    # 生成 Prisma Client
npm run db:push        # 同步数据库结构（开发环境）
npm run db:migrate     # 执行数据库迁移（生产环境）
npm run db:studio      # 打开 Prisma Studio
npm run db:check       # 检查数据库状态（PowerShell）
```

**注意**: 开发环境使用 `db:push`（快速原型设计），生产环境使用 `db:migrate`（可控迁移）。

### 测试与构建

```bash
npm run test:api       # API 接口测试（PowerShell）
npm run test           # 运行所有检查（lint + type-check + test:api）
npm run build          # 构建生产版本
npm run build:prod     # 生产构建（PowerShell 脚本）
```

## 架构概述

### 认证系统 (NextAuth.js)

- **配置**: `src/lib/auth.ts`
- **中间件**: `src/middleware.ts` - 保护 `/admin/*` 和 `/api/admin/*` 路由
- **会话策略**: JWT，30 分钟过期
- **开发账号**: admin / admin123 (SUPER_ADMIN)
- **用户角色**: SUPER_ADMIN, ADMIN, EMPLOYEE
- **登录页**: 根路径 `/`（非 `/login`）

认证流程:
1. 中间件检查 JWT 会话
2. 未认证用户重定向到 `/`
3. 成功登录后，token 包含 role, personId, username
4. 页面通过 `useSession()` 或检查 `session.user.role` 获取用户信息

### 数据库架构 (Prisma)

- **配置**: `prisma/schema.prisma`
- **客户端单例**: `src/lib/prisma.ts` - 使用 globalThis 保证开发时单一实例
- **数据库**: MySQL (配置于 .env 的 DATABASE_URL)

**核心模型关系**:
```
Building (楼栋) → Room (房间) → Bed (床位)
Person (人员) → 关联 Building, Room
Person → FaceRecord (人脸记录) → PermissionGroup (权限组)
Person → Bill (账单) / Application (申请) / MaintenanceTicket (报修)
Person → Visitor (访客，作为 host)
Person → EmergencyContact (紧急联系人)
Person → InspectionRecord (检查记录)
Room → MeterReading (抄表记录) / Asset (资产)
Building → PermissionGroup (按楼栋划分通行权限)
User (系统用户) → Person (可选关联)
```

**完整的模型列表**:
- 人员相关: Person, EmergencyContact, User
- 宿舍资源: Building, Room, Asset
- 门禁管理: FaceRecord, PermissionGroup, AccessRecord, Visitor
- 费用管理: Bill, Payment, MeterReading
- 日常运营: Application, MaintenanceTicket, Announcement
- 检查管理: InspectionRecord, ViolationCategory
- 系统管理: SystemSetting, OperationLog

### 业务逻辑服务

**人脸同步服务** (`src/lib/services/faceSyncService.ts`):
- 创建人脸记录时自动分配权限组
- 人员楼栋变更时更新权限
- 退宿/黑名单时禁用人脸权限

**权限组服务** (`src/lib/services/permissionGroupService.ts`):
- 管理门禁权限组
- 按楼栋自动创建和维护权限组

**账单计算服务** (`src/lib/services/billCalculationService.ts`):
- 费用计算与分摊逻辑
- 账单生成与结算

### API 路由模式

所有 API 路由位于 `src/app/api/` 下，使用 Next.js App Router Route Handlers。

**标准 CRUD 模式**:
```
GET    /api/resource        # 列表（支持分页、搜索、筛选）
POST   /api/resource        # 创建
GET    /api/resource/[id]   # 详情
PUT    /api/resource/[id]   # 更新
DELETE /api/resource/[id]   # 删除
```

**列表端点标准响应格式**:
```typescript
{
  data: T[],
  pagination: {
    page: number,
    pageSize: number,
    total: number,
    totalPages: number
  }
}
```

**关键 API 模块**:
- `/api/persons` - 人员档案（含人脸同步、紧急联系人、换宿历史）
- `/api/buildings`, `/api/rooms` - 宿舍资源
- `/api/bills`, `/api/bill-calculation` - 费用账单
- `/api/face-records`, `/api/permission-groups` - 人脸与权限
- `/api/visitors`, `/api/access-records` - 访客与门禁
- `/api/maintenance` - 报修工单
- `/api/applications` - 入住/调房申请
- `/api/meter-readings`, `/api/emergency-contacts`, `/api/assets` - 辅助管理
- `/api/7s-inspections`, `/api/7s-categories` - 检查管理
- `/api/statistics`, `/api/reports` - 数据统计与报表
- `/api/settings`, `/api/users` - 系统管理
- `/api/warmup` - 预热端点（解决冷启动问题）

### 前端结构

**页面路由** (`src/app/`):
- `/` - 登录页面（根路径）
- `/admin/*` - 管理后台（需要认证）
  - `/admin/persons` - 人员档案
  - `/admin/dorms` - 宿舍资源
  - `/admin/access` - 门禁管理
  - `/admin/fees` - 费用管理
  - `/admin/maintenance` - 报修维护
  - `/admin/applications` - 申请管理
  - `/admin/visitors` - 访客管理
  - `/admin/7s-inspections` - 检查管理
  - `/admin/reports` - 报表分析
  - `/admin/settings` - 系统设置

**UI 组件** (`src/components/ui/`):
- Button, Card, Input, Badge - 基础组件
- DataTable - 数据表格（含分页、排序、筛选）
- Modal, Toast - 交互组件
- Loading, Empty - 状态组件

**自定义 Hooks** (`src/hooks/`):
- `useApi.ts` - API 请求封装
- `useToast.ts` - Toast 通知

### 工具函数

- `src/lib/prisma.ts` - Prisma 客户端实例
- `src/lib/auth.ts` - NextAuth 配置
- `src/lib/utils.ts` - 通用工具函数
- `src/lib/api.ts` - API 端点封装（客户端调用）
- `src/lib/crypto.ts` - 加密工具
- `src/lib/shims/` - Webpack shims（处理 Node.js 内置模块在浏览器端的兼容）

### 类型定义

- `src/types/next-auth.d.ts` - NextAuth 类型扩展（自定义 User 类型）
- 各组件内联 Props 类型定义

## 开发规范

### 代码风格

- **语言**: TypeScript，启用严格模式（strict: true）
- **路径别名**: `@/*` 映射到 `./src/*`
- **图标**: Heroicons React
- **样式**: Tailwind CSS
- **验证**: Zod（用于表单和 API 输入验证）

### 组件规范

- 使用默认导出
- Props 接口定义在组件文件内
- 使用 Tailwind 工具类进行样式设计

### API 开发规范

- 所有端点必须返回 JSON
- 使用 `NextResponse.json()` 返回响应
- 错误处理：返回 `{ error: string }` 格式，包含适当 HTTP 状态码
- 数据库操作使用 `try/catch` 包裹
- 使用 Prisma 的 `include` 进行关联查询
- 敏感字段（如 idCard）在响应中做安全处理

### 数据库查询最佳实践

- 使用 `prisma.$transaction()` 处理多表操作
- 列表查询支持分页：`skip: (page-1)*pageSize, take: pageSize`
- 搜索使用 `OR` 条件匹配多个字段
- 软删除优先于物理删除

### 新增功能的典型流程

1. **数据库**: 如需新表/字段，修改 `prisma/schema.prisma`，运行 `npm run db:push`（开发）或 `npm run db:migrate`（生产）
2. **API**: 在 `src/app/api/` 下创建路由处理器
3. **页面**: 在 `src/app/admin/` 下创建对应页面组件
4. **组件**: 如需复用组件，添加到 `src/components/ui/`
5. **类型**: 如需全局类型，添加到 `src/types/`

## 特殊配置

### Next.js 配置

- **输出模式**: `standalone`（适用于容器化部署）
- **TypeScript 构建检查**: 已禁用（`ignoreBuildErrors: true`），因 pptxgenjs 类型定义不完整
- **Webpack 配置**:
  - 开发模式禁用缓存
  - 浏览器端 shim Node.js 内置模块（node:fs, node:https），用于 pptxgenjs 兼容
- **API 缓存**: 所有 API 端点禁用缓存（`no-store`）

### 数据库同步

- 开发环境使用 `prisma db push`（快速原型设计，直接同步 schema 到数据库）
- 生产环境应使用 `prisma migrate deploy`（可控的迁移脚本）

## 注意事项

- 开发环境使用 `globalThis` 缓存 Prisma 客户端避免热重载问题
- 人员状态变更（入住/退宿/换宿）会自动记录到 RoomChangeHistory
- 人脸记录与权限组联动，楼栋变更会自动更新权限
- 退宿或加入黑名单会自动禁用人脸权限
- 房间占用状态根据入住人数自动更新（VACANT/OCCUPIED）
- Excel 导入导出使用 `xlsx` 库
- 图表使用 `recharts`
- PPT 报告生成使用 `pptxgenjs`（需要特殊的 webpack 配置）

## 环境变量

位于 `.env`：
```
DATABASE_URL=mysql://user:password@host:3306/dormitory_db
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key
```

**开发账号**: admin / admin123 (SUPER_ADMIN)

## API 错误处理模式

标准错误响应格式：
```typescript
// 成功
return NextResponse.json({ data: result, pagination: {...} });

// 错误
return NextResponse.json(
  { error: '错误描述' },
  { status: 400 | 404 | 500 }
);
```

## 初始化数据

数据库种子脚本位于 `prisma/seed.ts`，创建：
- 管理员账号: admin / admin123
- 示例楼栋: 1号楼、2号楼
- 示例房间: 每层10间，共6层

运行种子脚本：`npx prisma db seed`（或直接执行 `tsx prisma/seed.ts`）
