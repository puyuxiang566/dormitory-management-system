# 宿舍管理系统

一站式数字化宿舍管理平台，整合人员信息、出入安全、费用结算、报修维护及日常运营，提供管理端与员工端双端入口。

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Next.js 14 (App Router) |
| 语言 | TypeScript |
| 数据库 | MySQL |
| ORM | Prisma |
| 认证 | NextAuth.js |
| 样式 | Tailwind CSS |
| 工具库 | Zod, XLSX, pptxgenjs, Recharts, bcryptjs, Heroicons |

## 项目结构

```
宿舍管理应用/
├── prisma/
│   ├── schema.prisma          # 数据库模型定义
│   ├── seed.ts                # 初始化数据脚本
│   ├── data-migration.ts      # 数据迁移脚本
│   └── migrations/            # 数据库迁移记录
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── api/               # RESTful API 路由
│   │   │   ├── auth/          # NextAuth 认证、修改密码
│   │   │   ├── persons/       # 人员档案（含导入/导出）
│   │   │   ├── buildings/     # 楼栋管理
│   │   │   ├── rooms/         # 房间管理
│   │   │   ├── assets/        # 资产管理
│   │   │   ├── bills/         # 费用账单（含分摊导出）
│   │   │   ├── bill-calculation/ # 费用试算
│   │   │   ├── meter-readings/   # 抄表记录
│   │   │   ├── face-records/  # 人脸记录
│   │   │   ├── access/        # 门禁权限
│   │   │   ├── access-records/# 通行记录
│   │   │   ├── permission-groups/ # 门禁权限组
│   │   │   ├── visitors/      # 访客管理
│   │   │   ├── applications/  # 入住/退宿申请
│   │   │   ├── maintenance/   # 报修维护（含报表导出）
│   │   │   ├── 7s-inspections/ # 7S 检查（含导入/导出/模板）
│   │   │   ├── emergency-contacts/ # 紧急联系人
│   │   │   ├── users/         # 系统用户
│   │   │   ├── reports/       # 报表统计
│   │   │   ├── statistics/    # 数据统计
│   │   │   ├── settings/      # 系统设置
│   │   │   └── warmup/        # 预热接口
│   │   ├── admin/             # 管理后台页面
│   │   │   ├── persons/       # 人员档案
│   │   │   ├── dorms/         # 宿舍资源
│   │   │   ├── access/        # 门禁管理
│   │   │   ├── fees/          # 费用管理
│   │   │   ├── maintenance/   # 报修维护
│   │   │   ├── applications/  # 申请管理
│   │   │   ├── visitors/      # 访客管理
│   │   │   ├── 7s-inspections/ # 7S 检查
│   │   │   ├── reports/       # 报表分析
│   │   │   └── settings/      # 系统设置
│   │   ├── employee/          # 员工自助端页面
│   │   │   ├── announcements/ # 通知公告
│   │   │   ├── applications/  # 我的申请
│   │   │   ├── bills/         # 我的账单
│   │   │   ├── maintenance/   # 我要报修
│   │   │   └── profile/       # 个人信息
│   │   ├── layout.tsx         # 根布局
│   │   ├── page.tsx           # 首页
│   │   └── globals.css        # 全局样式
│   ├── components/
│   │   └── ui/                # UI 组件库（Button/Card/Input/Badge/Loading/
│   │                          # Empty/DataTable/Modal/Toast/UserManagement）
│   ├── hooks/                 # React Hooks
│   │   ├── useApi.ts          # API 请求封装
│   │   └── useDebounce.ts     # 防抖 Hook
│   └── lib/                   # 工具库
│       ├── api.ts             # API 端点封装
│       ├── auth.ts            # 认证工具
│       ├── utils.ts           # 工具函数
│       ├── prisma.ts          # Prisma 客户端
│       ├── crypto.ts          # 加密工具（敏感字段加密存储）
│       ├── services/          # 业务服务（费用结算、人脸同步、权限组）
│       └── export-*.ts        # PPT 报表导出（财务分析/入住率/人员流动）
├── scripts/                   # 辅助脚本（Excel 导入测试等）
├── docker-compose.yml         # Docker 编排
├── Dockerfile                 # 容器镜像
├── create_admin.js            # 创建管理员账号脚本
├── start-dev.ps1              # PowerShell 启动脚本
└── package.json
```

## 功能模块

### ✅ 模块 A: 人员与宿舍资源

| 功能 | 状态 | 说明 |
|------|------|------|
| 人员档案管理 | ✅ 完成 | 员工信息、入住状态、紧急联系人、Excel 导入导出 |
| 宿舍资源管理 | ✅ 完成 | 楼栋、房间、床位、资产绑定、宿舍地图 |
| 更衣柜管理 | ✅ 完成 | 男女分区、排/层/柜号台账、工号带出人员信息、占用分配与释放、Excel 导入/批量导入 |
| 资产管理 | ✅ 完成 | 房间资产登记与状态管理 |
| 统计分析 | ✅ 完成 | 空置率、周转率、性别/部门分布 |

### ✅ 模块 B: 门禁与安全管理

| 功能 | 状态 | 说明 |
|------|------|------|
| 人脸记录管理 | ✅ 完成 | 人脸数据 CRUD、状态管理 |
| 权限组管理 | ✅ 完成 | 按楼栋自动划分通行权限组 |
| 访客管理 | ✅ 完成 | 访客预约、审批、临时通行 |
| 门禁记录 | ✅ 完成 | 通行记录查询与统计 |

### ✅ 模块 C: 费用管理

| 功能 | 状态 | 说明 |
|------|------|------|
| 抄表记录 | ✅ 完成 | 水电表读数录入、历史查询 |
| 费用账单 | ✅ 完成 | 账单生成、状态管理、支付记录、导出账单 |
| 智能结算 | ✅ 完成 | 按房间均摊、按居住天数、人均日均等多种分摊算法，支持导出 |

### ✅ 模块 D: 日常运营

| 功能 | 状态 | 说明 |
|------|------|------|
| 入住/调房申请 | ✅ 完成 | 在线申请、审批流程、状态追踪 |
| 报修维护 | ✅ 完成 | 工单提交、派发、进度追踪、评价、按日期范围导出 Excel 报表（含工单号/报修房间/问题描述/报修人/状态/报修时间） |
| 7S 检查 | ✅ 完成 | 检查记录管理、Excel 导入导出、模板下载 |
| 通知公告 | ✅ 完成 | 员工端通知查看 |

### ✅ 模块 E: 数据与系统

| 功能 | 状态 | 说明 |
|------|------|------|
| 多维度报表 | ✅ 完成 | 人员/费用/安全/运营报表，支持 PPT 报表导出 |
| 权限管理 | ✅ 完成 | 基于角色的数据权限（管理员/员工分端） |
| 系统设置 | ✅ 完成 | 费用配置、规则参数、用户管理 |

## 快速开始

### 启动开发服务器

```powershell
# Windows PowerShell (推荐)
.\start-dev.ps1

# 或直接运行
npm run dev
```

访问 http://localhost:3000

**默认登录账号**: admin / admin123

### Docker 部署（可选）

```bash
docker-compose up -d
```

### 数据库操作

```bash
# 生成 Prisma Client
npm run db:generate

# 同步数据库结构
npm run db:push

# 数据库迁移
npm run db:migrate

# 打开 Prisma Studio
npm run db:studio

# 检查数据库状态
npm run db:check

# 初始化示例数据
npx tsx prisma/seed.ts

# 创建管理员账号
node create_admin.js
```

## API 接口

| 模块 | 端点 | 方法 | 说明 |
|------|------|------|------|
| 认证 | `/api/auth/[...nextauth]` | - | NextAuth 登录 |
| | `/api/auth/change-password` | POST | 修改密码 |
| 人员 | `/api/persons` | GET,POST | 列表/创建 |
| | `/api/persons/[id]` | GET,PATCH,DELETE | 详情/更新/删除 |
| | `/api/persons/export` | GET | 人员信息 Excel 导出 |
| | `/api/persons/import` | POST | 人员信息 Excel 导入 |
| 楼栋 | `/api/buildings` | GET | 列表 (含房间) |
| 房间 | `/api/rooms` | GET,POST | 列表/创建 |
| 更衣柜 | `/api/lockers` | GET,POST | 列表（含统计）/新建；`?export=true` 导出 Excel |
| | `/api/lockers/[id]` | GET,PATCH,DELETE | 详情+变更历史；assign/release/disable/enable/编辑；删除 |
| | `/api/lockers/lookup` | GET | 工号带出人员信息及占用柜检查 |
| 资产 | `/api/assets` | GET,POST | 列表/创建 |
| 抄表 | `/api/meter-readings` | GET,POST | 列表/创建 |
| 账单 | `/api/bills` | GET,POST | 列表/创建 |
| | `/api/bills/export-split` | GET | 分摊账单导出 |
| | `/api/bills/export-per-capita` | GET | 人均账单导出 |
| 人脸 | `/api/face-records` | GET,POST | 列表/创建 |
| 门禁 | `/api/access`, `/api/access-records` | GET,POST | 权限/通行记录 |
| 权限组 | `/api/permission-groups` | GET,POST | 权限组管理 |
| 访客 | `/api/visitors` | GET,POST | 列表/创建 |
| 申请 | `/api/applications` | GET,POST | 列表/创建 |
| 报修 | `/api/maintenance` | GET,POST | 列表/创建（支持日期范围筛选） |
| | `/api/maintenance/export` | GET | 报修工单 Excel 报表导出（按年月日时间范围） |
| 7S 检查 | `/api/7s-inspections` | GET,POST | 列表/创建 |
| | `/api/7s-inspections/export` | GET | 检查记录导出 |
| | `/api/7s-inspections/template` | GET | 导入模板下载 |
| 报表 | `/api/reports` | GET | 多维度统计 |
| 统计 | `/api/statistics` | GET | 数据概览 |
| 设置 | `/api/settings` | GET,POST | 配置管理 |
| 用户 | `/api/users` | GET,POST | 系统用户管理 |

## UI 组件

项目提供了一套基于 Tailwind CSS 的 UI 组件：

```tsx
import {
  Button, Card, Input, Badge, Loading, Empty,
  DataTable, Modal, ConfirmModal, FormModal,
  ToastProvider, useToastHelpers,
} from '@/components/ui';

// 使用 Toast
const toast = useToastHelpers();
toast.success('操作成功', '数据已保存');
toast.error('错误', '请重试');
```

## 常用命令

```bash
# 开发
npm run dev                # 启动开发服务器
npm run start:win          # 通过 PowerShell 脚本启动
npm run build              # 构建生产版本
npm run start              # 启动生产服务器
npm run build:prod         # 生产构建脚本

# 代码质量
npm run lint               # ESLint 检查
npm run type-check         # TypeScript 检查
npm run test               # lint + type-check + API 测试
```

## 页面路由

### 管理端

| 路径 | 页面 |
|------|------|
| `/` | 首页 |
| `/admin` | 仪表盘 |
| `/admin/persons` | 人员档案 |
| `/admin/dorms` | 宿舍资源 |
| `/admin/lockers` | 更衣柜管理 |
| `/admin/access` | 门禁管理 |
| `/admin/fees` | 费用管理 |
| `/admin/maintenance` | 报修维护 |
| `/admin/applications` | 申请管理 |
| `/admin/visitors` | 访客管理 |
| `/admin/7s-inspections` | 7S 检查 |
| `/admin/reports` | 报表分析 |
| `/admin/settings` | 系统设置 |

### 员工端

| 路径 | 页面 |
|------|------|
| `/employee` | 员工首页 |
| `/employee/announcements` | 通知公告 |
| `/employee/applications` | 我的申请 |
| `/employee/bills` | 我的账单 |
| `/employee/maintenance` | 我要报修 |
| `/employee/profile` | 个人信息 |

## 开发规范

- **组件**: 使用默认导出
- **样式**: Tailwind CSS
- **图标**: Heroicons
- **类型**: TypeScript strict mode
- **API**: RESTful 规范
- **状态**: React hooks

---

© 2026 宿舍管理系统
