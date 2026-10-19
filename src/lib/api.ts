// API 请求封装

// API 响应类型
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// 分页响应类型
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// 统计概览类型
export interface StatisticsOverview {
  bedStats: {
    totalBeds: number;
    occupiedBeds: number;
    vacantBeds: number;
    occupancyRate: string;
    vacancyRate: string;
  };
  roomStats: {
    totalRooms: number;
    usedRooms: number;
    availableRooms: number;
    roomUtilizationRate: number;
  };
  genderStats: {
    male: number;
    female: number;
    unknown: number;
  };
  floorStats: Record<string, { total: number; occupied: number; male: number; female: number }>;
  roomStatusStats: {
    total: number;
    occupied: number;
    vacant: number;
    maintenance: number;
  };
  personStatusStats: {
    active: number;
    movedOut: number;
    blacklisted: number;
  };
  turnoverRate: string;
  totalPersons: number;
  totalRooms: number;
  totalBuildings: number;
}

// 楼栋类型
export interface Building {
  id: number;
  name: string;
  description?: string;
  address?: string;
  floors: number;
  room?: Room[];
}
// 房间实体
export interface Room {
  id: number;
  roomNumber: string;
  buildingId: number;
  floorNumber: number;
  bedCount: number;
  status: 'VACANT' | 'OCCUPIED' | 'MAINTENANCE' | 'CLOSED';
  person?: any[];
  assets?: any[];
}

// 人员类型
export interface Person {
  id: number;
  employeeId: string;
  name: string;
  department: string | null;
  position: string | null;
  phone: string | null;
  idCard: string | null;
  status: 'ACTIVE' | 'MOVED_OUT' | 'BLACKLISTED';
  buildingId?: number;
  roomId?: number;
  bedNumber?: string;
  checkInDate?: string;
  checkOutDate?: string;
  gender?: 'MALE' | 'FEMALE';
  factory?: 'imcn' | 'imaw' | 'imft' | '职能部门';
  building?: { name: string } | null;
  room?: { roomNumber: string } | null;
  emergencyContacts?: any[];
  roomChangeHistories?: any[];
  bills?: any[];
  applications?: any[];
  accessRecords?: any[];
  isRoomLeader?: boolean;
}

// 请求配置
interface RequestConfig extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

// 获取基础 URL（兼容服务端和客户端）
function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    // 客户端环境
    return window.location.origin;
  }
  // 服务端环境 - 使用环境变量或默认值
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
}

// 构建 URL
function buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
  const baseUrl = getBaseUrl();
  const url = new URL(path, baseUrl);
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.append(key, String(value));
      }
    });
  }
  
  return url.toString();
}

// 处理响应
async function handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: '请求失败' }));
    throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
  }
  
  return response.json();
}

// GET 请求
export async function get<T>(path: string, config: RequestConfig = {}): Promise<ApiResponse<T>> {
  const url = buildUrl(path, config.params);
  
  const response = await fetch(url, {
    ...config,
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...config.headers,
    },
  });
  
  return handleResponse<T>(response);
}

// POST 请求
export async function post<T>(path: string, data: any, config: RequestConfig = {}): Promise<ApiResponse<T>> {
  const url = buildUrl(path, config.params);
  
  const response = await fetch(url, {
    ...config,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...config.headers,
    },
    body: JSON.stringify(data),
  });
  
  return handleResponse<T>(response);
}

// PUT 请求
export async function put<T>(path: string, data: any, config: RequestConfig = {}): Promise<ApiResponse<T>> {
  const url = buildUrl(path, config.params);
  
  const response = await fetch(url, {
    ...config,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...config.headers,
    },
    body: JSON.stringify(data),
  });
  
  return handleResponse<T>(response);
}

// PATCH 请求
export async function patch<T>(path: string, data: any, config: RequestConfig = {}): Promise<ApiResponse<T>> {
  const url = buildUrl(path, config.params);
  
  const response = await fetch(url, {
    ...config,
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...config.headers,
    },
    body: JSON.stringify(data),
  });
  
  return handleResponse<T>(response);
}

// DELETE 请求
export async function del<T>(path: string, config: RequestConfig = {}): Promise<ApiResponse<T>> {
  const url = buildUrl(path, config.params);
  
  const response = await fetch(url, {
    ...config,
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...config.headers,
    },
  });
  
  return handleResponse<T>(response);
}

// 上传文件
export async function upload<T>(
  path: string,
  formData: FormData,
  config: RequestConfig = {}
): Promise<ApiResponse<T>> {
  const url = buildUrl(path, config.params);
  
  const response = await fetch(url, {
    ...config,
    method: 'POST',
    body: formData,
  });
  
  return handleResponse<T>(response);
}

// 导出为文件
export async function download(
  path: string,
  filename: string,
  config: RequestConfig = {}
): Promise<void> {
  const url = buildUrl(path, config.params);
  
  const response = await fetch(url, {
    ...config,
    method: 'GET',
  });
  
  const contentType = response.headers.get('content-type');
  
  if (!response.ok) {
    if (contentType?.includes('application/json')) {
      const error = await response.json();
      throw new Error(error.error || '下载失败');
    }
    throw new Error(`下载失败: ${response.status}`);
  }
  
  if (contentType?.includes('application/json')) {
    const error = await response.json();
    throw new Error(error.error || '下载失败');
  }
  
  const blob = await response.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(downloadUrl);
}

// API 端点
export const api = {
  // 认证 API
  auth: {
    changePassword: (data: any) => post('/api/auth/change-password', data),
  },
  
  // 人员管理
  persons: {
    list: (params?: any) => get<Person[]>('/api/persons', { params }),
    get: (id: number) => get(`/api/persons/${id}`),
    create: (data: any) => post('/api/persons', data),
    update: (id: number, data: any) => put(`/api/persons/${id}`, data),
    delete: (id: number) => del(`/api/persons/${id}`),
    batchDelete: (ids: (string | number)[]) => post('/api/persons/batch-delete', { ids }),
    batchCheckout: (personIds: number[]) => post('/api/persons/checkout', { personIds }),
    import: (formData: FormData) => upload('/api/persons/import', formData),
    export: (params?: any) => download('/api/persons/export', '人员档案.xlsx', { params }),
  },

  // 宿舍资源
  // 楼栋API
  buildings: {
    list: () => get<Building[]>('/api/buildings'),
    get: (id: number) => get<Building>(`/api/buildings/${id}`),
    create: (data: Partial<Building>) => post<Building>('/api/buildings', data),
    update: (id: number, data: Partial<Building>) => put<Building>(`/api/buildings/${id}`, data),
    delete: (id: number) => del<void>(`/api/buildings/${id}`),
    export: (params?: any) => download('/api/buildings?export=true', '楼栋房间信息.xlsx', { params }),
    import: (formData: FormData) => upload('/api/buildings?import=true', formData),
  },
  
  // 房间API
  rooms: {
    list: (params?: any) => get<Room[]>('/api/rooms', { params }),
    get: (id: number) => get<Room>(`/api/rooms/${id}`),
    create: (data: Partial<Room>) => post<Room>('/api/rooms', data),
    update: (id: number, data: Partial<Room>) => put<Room>(`/api/rooms/${id}`, data),
    delete: (id: number) => del<void>(`/api/rooms/${id}`),
  },

  assets: {
    list: (params?: any) => get('/api/assets', { params }),
    get: (id: number) => get(`/api/assets/${id}`),
    create: (data: any) => post('/api/assets', data),
    update: (id: number, data: any) => put(`/api/assets/${id}`, data),
    delete: (id: number) => del(`/api/assets/${id}`),
  },

  // 报修维护
  maintenance: {
    list: (params?: any) => get('/api/maintenance', { params }),
    get: (id: number) => get(`/api/maintenance/${id}`),
    create: (data: any) => post('/api/maintenance', data),
    update: (id: number, data: any) => patch(`/api/maintenance/${id}`, data),
    delete: (id: number) => del(`/api/maintenance/${id}`),
  },

  // 费用管理
  bills: {
    list: (params?: any) => get('/api/bills', { params }),
    get: (id: number) => get(`/api/bills/${id}`),
    create: (data: any) => post('/api/bills', data),
    update: (id: number, data: any) => patch(`/api/bills/${id}`, data),
    generate: (data: any) => post('/api/bill-calculation', data),
  },

  // 门禁管理
  access: {
    clear: () => del('/api/access/clear'),
  },

  // 门禁管理 - 通行记录
  accessRecords: {
    list: (params?: any) => get('/api/access-records', { params }),
  },

  // 门禁管理 - 人脸
  faceRecords: {
    list: (params?: any) => get('/api/face-records', { params }),
    create: (data: any) => post('/api/face-records', data),
    update: (id: number, data: any) => patch(`/api/face-records/${id}`, data),
    delete: (id: number) => del(`/api/face-records/${id}`),
  },

  // 访客管理
  visitors: {
    list: (params?: any) => get('/api/visitors', { params }),
    get: (id: number) => get(`/api/visitors/${id}`),
    create: (data: any) => post('/api/visitors', data),
    update: (id: number, data: any) => patch(`/api/visitors/${id}`, data),
    delete: (id: number) => del(`/api/visitors/${id}`),
  },

  // 申请管理
  applications: {
    list: (params?: any) => get('/api/applications', { params }),
    get: (id: number) => get(`/api/applications/${id}`),
    create: (data: any) => post('/api/applications', data),
    update: (id: number, data: any) => patch(`/api/applications/${id}`, data),
    approve: (id: number, data: any) => post(`/api/applications/${id}/approve`, data),
  },

  // 报表统计
  statistics: {
    overview: () => get<StatisticsOverview>('/api/statistics'),
    distribution: () => get('/api/statistics/distribution'),
    reports: (type: string, period?: string) => get('/api/reports', { params: { type, period } }),
    occupancyTrend: (days: number) => get('/api/statistics/occupancy-trend', { params: { days } }),
    dashboard: () => get('/api/statistics/dashboard'),
  },

  // 系统设置
  settings: {
    get: (category?: string) => get('/api/settings', { params: { category } }),
    update: (category: string, settings: any) => post('/api/settings', { category, settings }),
    reset: (category?: string) => del('/api/settings', { params: { category } }),
  },

  // 侧边栏菜单
  menu: {
    get: () => get('/api/settings', { params: { category: 'menu' } }),
    update: (menuSettings: any) => post('/api/settings', { category: 'menu', settings: menuSettings }),
  },

  // 用户管理
  users: {
    list: () => get<any[]>('/api/users'),
    get: (id: number) => get(`/api/users/${id}`),
    create: (data: any) => post('/api/users', data),
    update: (id: number, data: any) => put(`/api/users/${id}`, data),
    delete: (id: number) => del(`/api/users/${id}`),
  },
};
