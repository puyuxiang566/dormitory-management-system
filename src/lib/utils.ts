// 工具函数库

/**
 * 日期格式化
 */
export function formatDate(
  date: Date | string | number,
  format: 'date' | 'datetime' | 'time' | 'relative' = 'date'
): string {
  if (!date) return '-';

  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';

  const now = new Date();
  const diff = now.getTime() - d.getTime();

  switch (format) {
    case 'relative':
      // 相对时间
      const seconds = Math.floor(diff / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (seconds < 60) return '刚刚';
      if (minutes < 60) return `${minutes}分钟前`;
      if (hours < 24) return `${hours}小时前`;
      if (days < 30) return `${days}天前`;
      if (days < 365) return `${Math.floor(days / 30)}个月前`;
      return `${Math.floor(days / 365)}年前`;

    case 'datetime':
      return d.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });

    case 'time':
      return d.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
      });

    case 'date':
    default:
      return d.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
  }
}

/**
 * 货币格式化
 */
export function formatCurrency(
  amount: number | string,
  options: { prefix?: string; decimals?: number } = {}
): string {
  const { prefix = '¥', decimals = 2 } = options;
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (isNaN(num)) return `${prefix}0.00`;

  return `${prefix}${num.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

/**
 * 数字格式化
 */
export function formatNumber(
  num: number | string,
  options: { decimals?: number; compact?: boolean } = {}
): string {
  const { decimals = 0, compact = false } = options;
  const number = typeof num === 'string' ? parseFloat(num) : num;

  if (isNaN(number)) return '0';

  if (compact) {
    if (number >= 100000000) return `${(number / 100000000).toFixed(decimals)}亿`;
    if (number >= 10000) return `${(number / 10000).toFixed(decimals)}万`;
  }

  return number.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * 百分比格式化
 */
export function formatPercent(
  value: number | string,
  decimals: number = 1
): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0%';
  return `${num.toFixed(decimals)}%`;
}

/**
 * 手机号脱敏
 */
export function maskPhone(phone: string): string {
  if (!phone || phone.length !== 11) return phone;
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
}

/**
 * 身份证号脱敏
 */
export function maskIdCard(idCard: string): string {
  if (!idCard || idCard.length !== 18) return idCard;
  return idCard.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2');
}

/**
 * 文本截断
 */
export function truncate(text: string, length: number, suffix: string = '...'): string {
  if (!text || text.length <= length) return text;
  return text.substring(0, length) + suffix;
}

/**
 * 生成随机 ID
 */
export function generateId(length: number = 8): string {
  return Math.random().toString(36).substring(2, 2 + length);
}

/**
 * 深拷贝
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T;
  if (Array.isArray(obj)) return obj.map(item => deepClone(item)) as unknown as T;
  if (typeof obj === 'object') {
    const cloned = {} as T;
    Object.keys(obj).forEach(key => {
      (cloned as any)[key] = deepClone((obj as any)[key]);
    });
    return cloned;
  }
  return obj;
}

/**
 * 防抖函数
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number = 300
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * 节流函数
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limit: number = 300
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * 文件大小格式化
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * 获取文件扩展名
 */
export function getFileExtension(filename: string): string {
  return filename.slice(((filename.lastIndexOf('.') - 1) >>> 0) + 2);
}

/**
 * 睡眠函数
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 检查是否为移动设备
 */
export function isMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

/**
 * 本地存储封装
 */
export const storage = {
  get: <T>(key: string, defaultValue?: T): T | undefined => {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  },
  set: <T>(key: string, value: T): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Storage set error:', error);
    }
  },
  remove: (key: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(key);
  },
  clear: (): void => {
    if (typeof window === 'undefined') return;
    localStorage.clear();
  },
};

/**
 * 状态颜色映射
 */
export const statusColors: Record<string, string> = {
  // 人员状态
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  MOVED_OUT: 'bg-slate-100 text-slate-700',
  BLACKLISTED: 'bg-red-100 text-red-700',
  // 房间状态
  OCCUPIED: 'bg-emerald-100 text-emerald-700',
  VACANT: 'bg-blue-100 text-blue-700',
  MAINTENANCE: 'bg-amber-100 text-amber-700',
  // 账单状态
  BILL_PENDING: 'bg-amber-100 text-amber-700',
  BILL_PAID: 'bg-emerald-100 text-emerald-700',
  BILL_OVERDUE: 'bg-red-100 text-red-700',
  // 申请状态
  APPLICATION_PENDING: 'bg-amber-100 text-amber-700',
  APPLICATION_APPROVED: 'bg-emerald-100 text-emerald-700',
  APPLICATION_REJECTED: 'bg-red-100 text-red-700',
  // 工单状态
  OPEN: 'bg-amber-100 text-amber-700',
  ASSIGNED: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-purple-100 text-purple-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-slate-100 text-slate-700',
  // 访客状态
  VISITOR_PENDING: 'bg-amber-100 text-amber-700',
  VISITOR_APPROVED: 'bg-emerald-100 text-emerald-700',
  VISITOR_REJECTED: 'bg-red-100 text-red-700',
  VISITED: 'bg-slate-100 text-slate-700',
  // 通用
  PENDING: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-red-100 text-red-700',
};

/**
 * 获取状态样式
 */
export function getStatusColor(status: string): string {
  return statusColors[status] || 'bg-slate-100 text-slate-700';
}

/**
 * 状态文本映射
 */
export const statusLabels: Record<string, string> = {
  // 人员状态
  ACTIVE: '在住',
  MOVED_OUT: '已退宿',
  BLACKLISTED: '黑名单',
  // 房间状态
  OCCUPIED: '已入住',
  VACANT: '空置',
  MAINTENANCE: '维修中',
  // 账单状态
  BILL_PENDING: '待支付',
  BILL_PAID: '已支付',
  BILL_OVERDUE: '已逾期',
  // 申请状态
  APPLICATION_PENDING: '待审批',
  APPLICATION_APPROVED: '已通过',
  APPLICATION_REJECTED: '已拒绝',
  // 工单状态
  OPEN: '待维修',
  ASSIGNED: '已分配',
  IN_PROGRESS: '处理中',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
  // 访客状态
  VISITOR_PENDING: '待审批',
  VISITOR_APPROVED: '已通过',
  VISITOR_REJECTED: '已拒绝',
  VISITED: '已到访',
  // 通用
  PENDING: '待处理',
  APPROVED: '已通过',
  REJECTED: '已拒绝',
};

/**
 * 获取状态文本
 */
export function getStatusLabel(status: string): string {
  return statusLabels[status] || status;
}
