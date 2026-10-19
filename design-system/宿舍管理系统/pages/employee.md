# Employee Portal Page Overrides

> **PROJECT:** 宿舍管理系统
> **Generated:** 2026-03-04
> **Page Type:** Employee Self-Service Portal
> **User Role:** Regular Employee (Non-Admin)

> ⚠️ **IMPORTANT:** Rules in this file **override** the Master file (`design-system/MASTER.md`).
> Only deviations from the Master are documented here. For all other rules, refer to the Master.

---

## Design Philosophy

Employee portal is a **self-service dashboard** for regular employees to manage:
- Personal profile & dorm information
- Bills & payments
- Maintenance requests
- Applications (transfer, visitors)
- Announcements

**Target Users:** Regular employees, not administrators. Should feel approachable, clear, and helpful.

---

## Page-Specific Rules

### Layout Overrides

| Element | Rule |
|---------|------|
| **Structure** | Top header + Horizontal nav + Content area |
| **Header Height** | 64px fixed |
| **Nav** | Horizontal tab-style navigation |
| **Content Max Width** | 1200px, centered |
| **Responsive** | Mobile-first, stacked on <768px |

### Spacing Overrides

| Token | Value | Usage |
|-------|-------|-------|
| `--space-md` | 16px / 1rem | Standard padding (KEEP) |
| `--space-lg` | 24px / 1.5rem | Card padding |
| `--space-xl` | 32px / 2rem | Section gaps |

### Color Overrides

**Strategy:** Warm & Approachable — Trust + Accessibility

| Role | Hex | Usage |
|------|-----|-------|
| Primary | `#1E40AF` | Headers, primary buttons |
| Secondary | `#3B82F6` | Links, secondary actions |
| CTA | `#F59E0B` | Call-to-action (pay bills, submit) |
| Success | `#10B981` | Confirmed status |
| Warning | `#F59E0B` | Pending status |
| Error | `#EF4444` | Overdue, issues |
| Background | `#F8FAFC` | Page background |
| Card BG | `#FFFFFF` | Card surfaces |
| Text Primary | `#1F2937` | Main text (softer than #1E3A8A) |
| Text Secondary | `#6B7280` | Descriptions |

### Typography Overrides

- **Use Master typography:** Fira Code (headings) + Fira Sans (body)
- **Friendly adjustments:**
  - H1: 24px/600 weight
  - H2: 20px/600 weight
  - H3: 16px/500 weight
  - Body: 14px/400 weight
  - Small: 12px/400 weight

### Component Overrides

#### Cards (Employee-Friendly Style)

```css
.card {
  background: #FFFFFF;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  border: 1px solid #E5E7EB;
}

.card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  transition: all 200ms ease;
}
```

#### Quick Actions Grid

- **Layout:** 2x2 or 4-column grid
- **Card style:** Icon + Label, subtle background
- **Hover:** Background color shift + slight lift

#### Data Display

- **Numbers:** Use `--color-cta` (#F59E0B) for amounts due
- **Status badges:** Pill-shaped with color coding
- **Lists:** Clean dividers, hover highlight

---

## Required Components

### Header

```jsx
// Structure
<header className="h-16 bg-white border-b flex items-center justify-between px-6">
  // Logo + Title (left)
  // User menu (right): Avatar + Name + Logout
</header>
```

### Navigation

```jsx
// Horizontal tabs
<nav className="bg-white border-b">
  <div className="flex gap-1">
    <NavTab href="/employee" label="首页" />
    <NavTab href="/employee/profile" label="个人信息" />
    <NavTab href="/employee/bills" label="我的账单" />
    <NavTab href="/employee/maintenance" label="报修" />
    <NavTab href="/employee/applications" label="申请" />
    <NavTab href="/employee/announcements" label="通知" />
  </div>
</nav>
```

### Quick Actions (Home Page)

| Icon (Heroicons) | Label | Action |
|-----------------|-------|--------|
| WrenchScrewdriverIcon | 在线报修 | /employee/maintenance/new |
| ArrowPathIcon | 调房申请 | /employee/applications/transfer |
| UserGroupIcon | 访客预约 | /employee/visitors/new |
| ChatBubbleLeftIcon | 意见反馈 | /employee/feedback |

### Status Badges

```jsx
// Variants
<Badge variant="success">已确认</Badge>
<Badge variant="warning">处理中</Badge>
<Badge variant="error">已逾期</Badge>
<Badge variant="info">新通知</Badge>
```

---

## Pre-Delivery Checklist

- [ ] No emoji as icons — use Heroicons SVG
- [ ] All clickable elements have `cursor-pointer`
- [ ] Hover states with smooth transitions (150-300ms)
- [ ] Text contrast ≥ 4.5:1
- [ ] Focus states visible for keyboard navigation
- [ ] `prefers-reduced-motion` respected
- [ ] Responsive: 375px, 768px, 1024px, 1440px
- [ ] Mobile: Navigation collapses to hamburger menu

---

## Anti-Patterns to Avoid

| ❌ Avoid | ✅ Instead |
|---------|-----------|
| Emoji icons | Heroicons SVG icons |
| Dense data tables (employee view) | Clean cards + summaries |
| Complex forms on first page | Wizard / multi-step forms |
| Heavy dark mode | Light mode with subtle accents |

---

## Recommended Page Structure

### Employee Home (/employee)

```
┌─────────────────────────────────────────────────────┐
│  Header: Logo + "员工端" + User Menu               │
├─────────────────────────────────────────────────────┤
│  Nav: 首页 | 个人信息 | 我的账单 | 报修 | 申请 | 通知 │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Welcome Banner (Personalized)                      │
│                                                     │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐               │
│  │ 我的宿舍 │ │ 本月账单 │ │ 待办事项 │               │
│  │ 3# 201  │ │ ¥256.00 │ │ 2项     │               │
│  └─────────┘ └─────────┘ └─────────┘               │
│                                                     │
│  ┌──────────────────┐ ┌──────────────────┐         │
│  │   快捷服务       │ │   最新通知       │         │
│  │ ┌──┐ ┌──┐       │ │ · 端午节放假    │         │
│  │ │报│ │调│       │ │ · 电梯维护      │         │
│  │ │修│ │房│       │ │                  │         │
│  │ └──┘ └──┘       │ │                  │         │
│  └──────────────────┘ └──────────────────┘         │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Key UX Principles

1. **At-a-glance info** — Show key numbers prominently
2. **Clear CTAs** — Primary action is obvious
3. **Friendly tone** — "欢迎回来" vs "Dashboard"
4. **Helpful shortcuts** — Quick actions for common tasks
5. **Recent activity** — Show latest announcements/tasks
