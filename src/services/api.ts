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

let refreshInFlight: Promise<{ accessToken: string; refreshToken: string }> | null = null;
async function refreshSession() {
  if (!refreshInFlight) {
    const previous = localStorage.getItem('frota_refresh_token');
    refreshInFlight = (async () => {
      if (!previous) throw new ApiError('Sessão expirada.', 401);
      const response = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken: previous }),
      });
      if (!response.ok) throw new ApiError('Não foi possível renovar a sessão.', response.status);
      const data = await response.json();
      if (localStorage.getItem('frota_refresh_token') !== previous) throw new ApiError('Sessão encerrada.', 401);
      localStorage.setItem('frota_access_token', data.accessToken);
      localStorage.setItem('frota_refresh_token', data.refreshToken);
      return data;
    })().finally(() => { refreshInFlight = null; });
  }
  return refreshInFlight;
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

  if (response.status === 401 && !['/auth/login', '/auth/refresh', '/auth/logout', '/auth/register'].includes(endpoint)) {
    try {
      const data = await refreshSession();
      headers.set('Authorization', `Bearer ${data.accessToken}`);
      response = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });
    } catch (err) {
      if (err instanceof ApiError && [401, 403].includes(err.statusCode)) {
        localStorage.removeItem('frota_access_token');
        localStorage.removeItem('frota_refresh_token');
        window.dispatchEvent(new Event('frota-session-ended'));
      }
      throw err;
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
      request<{ message: string; accessToken: string; refreshToken: string }>('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify(data),
      }).then(result => {
        localStorage.setItem('frota_access_token', result.accessToken);
        localStorage.setItem('frota_refresh_token', result.refreshToken);
        return result;
      }),
      
    logout: () =>
      request<any>('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: localStorage.getItem('frota_refresh_token') }),
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

    alerts: () => request<{ total: number; data: any[] }>('/maintenance/alerts'),

    listPlans: (vehicleId?: string) => {
      const query = vehicleId ? `?vehicleId=${encodeURIComponent(vehicleId)}` : '';
      return request<{ total: number; data: any[] }>(`/maintenance/plans/list${query}`);
    },

    createPlan: (data: any) => request<{ message: string; data: any }>('/maintenance/plans', {
      method: 'POST', body: JSON.stringify(data),
    }),

    updatePlan: (id: string, data: any) => request<{ message: string; data: any }>(`/maintenance/plans/${id}`, {
      method: 'PUT', body: JSON.stringify(data),
    }),

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
    getInsurances: (params?: { vehicleId?: string; status?: string }) => {
      const query = new URLSearchParams();
      if (params?.vehicleId) query.set('vehicleId', params.vehicleId);
      if (params?.status) query.set('status', params.status);
      return request<{ total: number; data: any[] }>(`/financial/insurances${query.size ? `?${query}` : ''}`);
    },
    createInsurance: (data: any) => request<{ message: string; data: any }>('/financial/insurances', { method: 'POST', body: JSON.stringify(data) }),
    updateInsuranceStatus: (id: string, status: 'ACTIVE' | 'CANCELLED') => request<{ message: string; data: any }>(`/financial/insurances/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
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
    update: (id: string, data: any) => request<{ message: string; data: any }>(`/inspections/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<{ message: string; data: any }>(`/inspections/${id}`, {
      method: 'DELETE',
    }),
  },

  fleetRecords: {
    list: (kind: 'fines' | 'incidents', params?: { search?: string; status?: string; vehicleId?: string; startDate?: string; endDate?: string }) => {
      const query = new URLSearchParams();
      Object.entries(params || {}).forEach(([key, value]) => { if (value && !(key === 'status' && value === 'ALL')) query.set(key, value); });
      const suffix = query.toString();
      return request<{ total: number; data: any[] }>(`/records/${kind}${suffix ? `?${suffix}` : ''}`);
    },
    create: (kind: 'fines' | 'incidents', data: any) => request<{ message: string; data: any }>(`/records/${kind}`, { method: 'POST', body: JSON.stringify(data) }),
    update: (kind: 'fines' | 'incidents', id: string, data: any) => request<{ message: string; data: any }>(`/records/${kind}/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (kind: 'fines' | 'incidents', id: string) => request<{ message: string }>(`/records/${kind}/${id}`, { method: 'DELETE' }),
  },

  reports: {
    get: (startDate?: string, endDate?: string, vehicleId?: string) => {
      const query = new URLSearchParams();
      if (startDate) query.set('startDate', startDate);
      if (endDate) query.set('endDate', endDate);
      if (vehicleId) query.set('vehicleId', vehicleId);
      return request<any>(`/reports?${query.toString()}`);
    },
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


