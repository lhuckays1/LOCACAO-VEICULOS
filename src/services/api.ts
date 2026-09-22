/**
 * Central API Client for FROTA CRM
 */

const BASE_URL = '/api';

export class ApiError extends Error {
  statusCode: number;
  data: any;

  constructor(message: string, statusCode: number = 500, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.data = data;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('frota_access_token');
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Handle Token Refresh on 401 Unauthorized
  if (response.status === 401 && endpoint !== '/auth/login' && endpoint !== '/auth/refresh') {
    const refreshToken = localStorage.getItem('frota_refresh_token');
    if (refreshToken) {
      try {
        const refreshResponse = await fetch(`${BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          localStorage.setItem('frota_access_token', refreshData.accessToken);
          localStorage.setItem('frota_refresh_token', refreshData.refreshToken);

          // Retry original request with new token
          headers.set('Authorization', `Bearer ${refreshData.accessToken}`);
          response = await fetch(`${BASE_URL}${endpoint}`, {
            ...options,
            headers,
          });
        } else {
          // Token expired or invalid
          localStorage.removeItem('frota_access_token');
          localStorage.removeItem('frota_refresh_token');
          localStorage.removeItem('frota_user');
          window.location.href = '/login';
        }
      } catch {
        localStorage.removeItem('frota_access_token');
        localStorage.removeItem('frota_refresh_token');
        localStorage.removeItem('frota_user');
      }
    }
  }

  const contentType = response.headers.get('content-type');
  let result: any = null;
  if (contentType && contentType.includes('application/json')) {
    result = await response.json();
  } else {
    result = await response.text();
  }

  if (!response.ok) {
    const errorMessage =
      (result && result.message) ||
      (result && result.error) ||
      `Erro na requisição (${response.status})`;
    throw new ApiError(errorMessage, response.status, result);
  }

  return result as T;
}

export const api = {
  // Auth
  auth: {
    login: (credentials: { email: string; password: string }) =>
      request<any>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      }),
    register: (data: any) =>
      request<any>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    me: () => request<any>('/auth/me'),
    refresh: (refreshToken: string) =>
      request<any>('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      }),

    changePassword: (data: {
      currentPassword: string;
      newPassword: string;
    }) =>
      request<{ message: string }>('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
      
    logout: () =>
      request<any>('/auth/logout', {
        method: 'POST',
      }),
  },

  // Dashboard
  dashboard: {
    getMetrics: () => request<any>('/dashboard'),
  },

  // Clients
  clients: {
    list: (params?: { search?: string; type?: string; active?: boolean | string }) => {
      const query = new URLSearchParams();
      if (params?.search) query.set('search', params.search);
      if (params?.type && params.type !== 'ALL') query.set('type', params.type);
      if (params?.active !== undefined && params.active !== '') query.set('active', String(params.active));
      return request<{ total: number; data: any[] }>(`/clients?${query.toString()}`);
    },
    getById: (id: string) => request<{ data: any }>(`/clients/${id}`),
    create: (data: any) =>
      request<{ message: string; data: any }>('/clients', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: any) =>
      request<{ message: string; data: any }>(`/clients/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ message: string; data: any }>(`/clients/${id}`, {
        method: 'DELETE',
      }),
  },

  // Vehicles
  vehicles: {
    list: (params?: { search?: string; status?: string; category?: string }) => {
      const query = new URLSearchParams();
      if (params?.search) query.set('search', params.search);
      if (params?.status && params.status !== 'ALL') query.set('status', params.status);
      if (params?.category && params.category !== 'ALL') query.set('category', params.category);
      return request<{ total: number; data: any[] }>(`/vehicles?${query.toString()}`);
    },
    getById: (id: string) => request<{ data: any }>(`/vehicles/${id}`),
    create: (data: any) =>
      request<{ message: string; data: any }>('/vehicles', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: any) =>
      request<{ message: string; data: any }>(`/vehicles/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ message: string; data: any }>(`/vehicles/${id}`, {
        method: 'DELETE',
      }),
  },

  // Rentals
  rentals: {
    list: (params?: {
      search?: string;
      status?: string;
      clientId?: string;
      vehicleId?: string;
      startDate?: string;
      endDate?: string;
    }) => {
      const query = new URLSearchParams();
      if (params?.search) query.set('search', params.search);
      if (params?.status && params.status !== 'ALL' && params.status !== 'TODAS') {
        query.set('status', params.status);
      }
      if (params?.clientId && params.clientId !== 'ALL') query.set('clientId', params.clientId);
      if (params?.vehicleId && params.vehicleId !== 'ALL') query.set('vehicleId', params.vehicleId);
      if (params?.startDate) query.set('startDate', params.startDate);
      if (params?.endDate) query.set('endDate', params.endDate);
      return request<{ total: number; data: any[] }>(`/rentals?${query.toString()}`);
    },
    getById: (id: string) => request<{ data: any }>(`/rentals/${id}`),
    create: (data: any) =>
      request<{ message: string; data: any; cnhAlert?: string | null }>('/rentals', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    cancel: (id: string, motivo?: string) =>
      request<{ message: string; data: any }>(`/rentals/${id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ motivo }),
      }),
    updateStatus: (
      id: string,
      data: {
        status: string;
        finalMileage?: number;
        finalFuelLevel?: string;
        notes?: string;
        checkListRetorno?: any[];
        avariasRetorno?: string[];
      }
    ) =>
      request<{ message: string; data: any }>(`/rentals/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    payPayment: (
      rentalId: string,
      paymentId: string,
      data: {
        formaPagamento: string;
        dataPagamento?: string;
        observacoes?: string;
        valorPago?: number;
        kmAtual?: number;
      }
    ) =>
      request<{ message: string; data: any }>(`/rentals/${rentalId}/payments/${paymentId}/pay`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ message: string; data: any }>(`/rentals/${id}`, {
        method: 'DELETE',
      }),
    updateCaucao: (
      rentalId: string,
      data: { statusCaucao: string; caucaoRecebida: number; observacoes?: string }
    ) =>
      request<{ message: string; data: any }>(`/rentals/${rentalId}/caucao`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
  },

  // Maintenance Module
  maintenance: {
    list: (params?: {
      status?: string;
      type?: string;
      vehicleId?: string;
      workshopId?: string;
      supplierId?: string;
      search?: string;
      startDate?: string;
      endDate?: string;
    }) => {
      const query = new URLSearchParams();

      if (params?.status && params.status !== 'ALL') query.set('status', params.status);
      if (params?.type && params.type !== 'ALL') query.set('type', params.type);
      if (params?.vehicleId) query.set('vehicleId', params.vehicleId);
      if (params?.workshopId) query.set('workshopId', params.workshopId);
      if (params?.supplierId) query.set('supplierId', params.supplierId);
      if (params?.search) query.set('search', params.search);
      if (params?.startDate) query.set('startDate', params.startDate);
      if (params?.endDate) query.set('endDate', params.endDate);

      const qs = query.toString();
      return request<{ total: number; data: any[] }>(
        `/maintenance${qs ? `?${qs}` : ''}`
      );
    },

    dashboard: () =>
      request<{
        kpis: {
          totalCount: number;
          scheduledCount: number;
          inProgressCount: number;
          waitingPartsCount: number;
          completedCount: number;
          cancelledCount: number;
          totalCost: number;
          monthCost: number;
          yearCost: number;
          activeAlertsTotal: number;
          overdueAlertsCount: number;
          upcomingAlertsCount: number;
          attentionAlertsCount: number;
        };
        costByType: Record<string, number>;
        topVehicles: any[];
      }>('/maintenance/dashboard'),

    create: (data: any) =>
      request<{ message: string; data: any }>('/maintenance', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    getById: (id: string) =>
      request<{ data: any }>(`/maintenance/${id}`),

    start: (id: string) =>
      request<{ message: string; data: any }>(`/maintenance/${id}/start`, {
        method: 'POST',
      }),

    complete: (id: string, data: any) =>
      request<{ message: string; data: any }>(`/maintenance/${id}/complete`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    cancel: (id: string, motivo?: string) =>
      request<{ message: string; data: any }>(`/maintenance/${id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ motivo }),
      }),

    delete: (id: string) =>
      request<{ message: string; data: any }>(`/maintenance/${id}`, {
        method: 'DELETE',
      }),
  },

  // Financial Module
  financial: {
    getDashboard: () => request<any>('/financial/dashboard'),
    getTransactions: (params?: {
      type?: string;
      status?: string;
      origin?: string;
      categoryId?: string;
      costCenterId?: string;
      clientId?: string;
      vehicleId?: string;
      rentalId?: string;
      startDate?: string;
      endDate?: string;
      search?: string;
    }) => {
      const query = new URLSearchParams();
      if (params?.type && params.type !== 'ALL') query.set('type', params.type);
      if (params?.status && params.status !== 'ALL') query.set('status', params.status);
      if (params?.origin && params.origin !== 'ALL') query.set('origin', params.origin);
      if (params?.categoryId && params.categoryId !== 'ALL') query.set('categoryId', params.categoryId);
      if (params?.costCenterId && params.costCenterId !== 'ALL') query.set('costCenterId', params.costCenterId);
      if (params?.clientId) query.set('clientId', params.clientId);
      if (params?.vehicleId) query.set('vehicleId', params.vehicleId);
      if (params?.rentalId) query.set('rentalId', params.rentalId);
      if (params?.startDate) query.set('startDate', params.startDate);
      if (params?.endDate) query.set('endDate', params.endDate);
      if (params?.search) query.set('search', params.search);
      return request<{ total: number; data: any[] }>(`/financial/transactions?${query.toString()}`);
    },
    getTransactionById: (id: string) => request<{ data: any }>(`/financial/transactions/${id}`),
    getReceivables: (params?: {
      status?: string;
      clientId?: string;
      vehicleId?: string;
      startDate?: string;
      endDate?: string;
      search?: string;
    }) => {
      const query = new URLSearchParams();
      if (params?.status && params.status !== 'ALL') query.set('status', params.status);
      if (params?.clientId) query.set('clientId', params.clientId);
      if (params?.vehicleId) query.set('vehicleId', params.vehicleId);
      if (params?.startDate) query.set('startDate', params.startDate);
      if (params?.endDate) query.set('endDate', params.endDate);
      if (params?.search) query.set('search', params.search);
      return request<{ metrics: any; data: any[] }>(`/financial/receivables?${query.toString()}`);
    },
    getPayables: (params?: {
      status?: string;
      categoryId?: string;
      costCenterId?: string;
      vehicleId?: string;
      startDate?: string;
      endDate?: string;
      search?: string;
    }) => {
      const query = new URLSearchParams();
      if (params?.status && params.status !== 'ALL') query.set('status', params.status);
      if (params?.categoryId && params.categoryId !== 'ALL') query.set('categoryId', params.categoryId);
      if (params?.costCenterId && params.costCenterId !== 'ALL') query.set('costCenterId', params.costCenterId);
      if (params?.vehicleId) query.set('vehicleId', params.vehicleId);
      if (params?.startDate) query.set('startDate', params.startDate);
      if (params?.endDate) query.set('endDate', params.endDate);
      if (params?.search) query.set('search', params.search);
      return request<{ metrics: any; data: any[] }>(`/financial/payables?${query.toString()}`);
    },
    getCashFlow: (params?: { startDate?: string; endDate?: string; viewMode?: string }) => {
      const query = new URLSearchParams();
      if (params?.startDate) query.set('startDate', params.startDate);
      if (params?.endDate) query.set('endDate', params.endDate);
      if (params?.viewMode) query.set('viewMode', params.viewMode);
      return request<any>(`/financial/cashflow?${query.toString()}`);
    },
    getOverdue: () => request<{ totalOverdueSum: number; totalDebtors: number; debtors: any[] }>('/financial/overdue'),
    getVehicleStatement: (vehicleId: string) => request<any>(`/financial/vehicle/${vehicleId}`),
    createTransaction: (data: any) =>
      request<{ message: string; data: any }>('/financial/transactions', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    settleTransaction: (
      id: string,
      data: {
        amount: number;
        paymentDate: string;
        paymentMethod: string;
        interest?: number;
        fine?: number;
        discount?: number;
        receiptUrl?: string;
        notes?: string;
      }
    ) =>
      request<{ message: string; data: any }>(`/financial/transactions/${id}/settle`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    cancelTransaction: (id: string, reason?: string) =>
      request<{ message: string; data: any }>(`/financial/transactions/${id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
    getCategories: (type?: string) => {
      const q = type && type !== 'ALL' ? `?type=${type}` : '';
      return request<{ total: number; data: any[] }>(`/financial/categories${q}`);
    },
    createCategory: (data: any) =>
      request<{ message: string; data: any }>('/financial/categories', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    deleteCategory: (id: string) =>
      request<{ message: string }>(`/financial/categories/${id}`, {
        method: 'DELETE',
      }),
    getCostCenters: () => request<{ total: number; data: any[] }>('/financial/cost-centers'),
    createCostCenter: (data: any) =>
      request<{ message: string; data: any }>('/financial/cost-centers', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    deleteCostCenter: (id: string) =>
      request<{ message: string }>(`/financial/cost-centers/${id}`, {
        method: 'DELETE',
      }),
  },

  // Inspections Module — adicionar dentro do objeto `api` de src/services/api.ts
  inspections: {
    list: (params?: {
      vehicleId?: string;
      rentalId?: string;
      type?: string;
      search?: string;
      startDate?: string;
      endDate?: string;
    }) => {
      const query = new URLSearchParams();
      if (params?.vehicleId && params.vehicleId !== 'ALL') query.set('vehicleId', params.vehicleId);
      if (params?.rentalId && params.rentalId !== 'ALL') query.set('rentalId', params.rentalId);
      if (params?.type && params.type !== 'ALL') query.set('type', params.type);
      if (params?.search) query.set('search', params.search);
      if (params?.startDate) query.set('startDate', params.startDate);
      if (params?.endDate) query.set('endDate', params.endDate);
      const qs = query.toString();
      return request<{ total: number; data: any[] }>(`/inspections${qs ? `?${qs}` : ''}`);
    },
    getById: (id: string) => request<{ data: any }>(`/inspections/${id}`),
    create: (data: any) => request<{ message: string; data: any }>('/inspections', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    delete: (id: string) => request<{ message: string; data: any }>(`/inspections/${id}`, {
      method: 'DELETE',
    }),
  },


  // Super Admin
superAdmin: {
  getAdministrators: () =>
    request<{ data: any[] }>('/admin/administrators'),

  createAdministrator: (data: {
    name: string;
    email: string;
    password: string;
    role: string;
    companyId?: string | null;
  }) =>
    request<any>('/admin/administrators', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateAdministrator: (id: string, data: any) =>
    request<{ message: string; data: any }>(
      `/admin/administrators/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    ),

  toggleAdministratorStatus: (id: string) =>
    request<{ message: string; data: any }>(
      `/admin/administrators/${id}/toggle-status`,
      {
        method: 'PATCH',
      }
    ),

  resetAdministratorPassword: (
    id: string,
    password: string
  ) =>
    request<{ message: string }>(
      `/admin/administrators/${id}/reset-password`,
      {
        method: 'PATCH',
        body: JSON.stringify({ password }),
      }
    ),

  deleteAdministrator: (id: string) =>
    request<{ message: string; data: { id: string } }>(
      `/admin/administrators/${id}`,
      {
        method: 'DELETE',
      }
    ),

      getPlatformSettings: () =>
    request<{ data: any }>('/admin/platform-settings'),

  updatePlatformSettings: (data: {
    platformName?: string;
    platformShortName?: string;
    logo?: string | null;
    supportEmail?: string | null;

    country?: string;
    currency?: string;
    timezone?: string;
    dateFormat?: string;

    minimumPasswordLength?: number;
    requireStrongPassword?: boolean;
    sessionDurationMinutes?: number;

    maintenanceMode?: boolean;
    allowRegistration?: boolean;
    notificationsEnabled?: boolean;
  }) =>
    request<{ message: string; data: any }>(
      '/admin/platform-settings',
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    ),
},

  companies: {
    list: () =>
      request<any>('/companies'),

    getSummary: () =>
      request<any>('/companies/summary'),

    getById: (id: string) =>
      request<any>(`/companies/${id}`),

    create: (data: any) =>
      request<any>('/companies', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    update: (id: string, data: any) =>
      request<any>(`/companies/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    toggleStatus: (id: string) =>
      request<any>(`/companies/${id}/toggle-status`, {
        method: 'PATCH',
      }),
  },
};


