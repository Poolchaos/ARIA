import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retrying, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        localStorage.setItem('accessToken', data.data.accessToken);

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, logout user
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  inviteCode?: string;
  phoneticName?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  data: {
    user: {
      id: string;
      email: string;
      name: string;
      phoneticName?: string;
      role: 'admin' | 'member';
      householdId: string;
    };
    accessToken: string;
    refreshToken: string;
  };
}

export const authApi = {
  register: (data: RegisterRequest) =>
    api.post<AuthResponse>('/auth/register', data),

  login: (data: LoginRequest) =>
    api.post<AuthResponse>('/auth/login', data),

  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),

  logout: (refreshToken: string) =>
    api.post('/auth/logout', { refreshToken }),
};

// User API
export interface UpdatePreferencesRequest {
  voiceName?: string;
  voicePitch?: number;
  voiceRate?: number;
  voiceVolume?: number;
  selectedAvatar?: string;
  selectedAvatarColor?: string;
  selectedPersonality?: string;
  onboardingCompleted?: boolean;
  phoneticName?: string;
}

export interface UserResponse {
  success: boolean;
  data: {
    user: {
      id: string;
      email: string;
      name: string;
      phoneticName?: string;
      role: 'admin' | 'member';
      householdId: string;
      voiceName?: string;
      voicePitch?: number;
      voiceRate?: number;
      voiceVolume?: number;
      selectedAvatar?: string;
      selectedAvatarColor?: string;
      selectedPersonality?: string;
      onboardingCompleted?: boolean;
    };
  };
}

export const userApi = {
  updatePreferences: (data: UpdatePreferencesRequest) =>
    api.patch<UserResponse>('/user/preferences', data),

  getCurrentUser: () =>
    api.get<UserResponse>('/user/me'),
};
