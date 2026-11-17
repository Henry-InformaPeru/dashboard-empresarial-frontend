import { httpClient } from '@/shared/lib/httpClient';

export interface LoginRequestDto {
  username: string;
  password: string;
}

export interface LoginResponseDto {
  accessToken: string; // CamelCase tal cual responde tu Postman
  tokenType: string;
  usuario: {
    id: number;
    username: string;
    nombreCompleto: string;
    rolId: number;
    empresaId: number | null;
    empresaNombre?: string | null;
    empresaEsquema?: string | null;
    empresaLogo?: string | null;
  };
}

export const authService = {
  async login(credentials: LoginRequestDto): Promise<LoginResponseDto> {
    const { data } = await httpClient.post<LoginResponseDto>('/auth/login', credentials);
    return data;
  },

  async getMe(): Promise<LoginResponseDto['usuario']> {
    const { data } = await httpClient.get<LoginResponseDto['usuario']>('/auth/me');
    return data;
  },
};