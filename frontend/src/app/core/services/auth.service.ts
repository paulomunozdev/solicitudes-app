import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface GoogleUser {
  name: string;
  email: string;
  picture: string;
  credential: string;
}

export interface UserProfile {
  id: string;
  nombre: string;
  email: string;
  foto: string | null;
  rol: number;         // 0=Pendiente 1=Solicitante 2=Gestor 3=Admin 4=Observador
  rolNombre: string;
  unidadNegocioNombre: string | null;
  activo: boolean;
  ultimoAcceso: string;
}

declare const google: any;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly STORAGE_KEY    = 'google_credential';
  private readonly PROFILE_KEY    = 'user_profile';

  readonly user    = signal<GoogleUser | null>(this.loadStoredUser());
  readonly profile = signal<UserProfile | null>(this.loadStoredProfile());

  constructor() {
    // Si hay sesión válida guardada, refrescar perfil de la API en segundo plano
    if (this.isAuthenticated()) {
      this.fetchProfile();
    }
  }

  // Computed helpers para uso en templates
  readonly isAdmin    = computed(() => this.profile()?.rol === 3);
  readonly isGestor   = computed(() => (this.profile()?.rol ?? 0) >= 2);  // Gestor o Admin
  readonly isPendiente = computed(() => this.profile()?.rol === 0);
  readonly canCreate  = computed(() => (this.profile()?.rol ?? 0) >= 1 && (this.profile()?.rol ?? 0) !== 4);

  initialize(clientId: string, callback: (credential: string) => void): void {
    google.accounts.id.initialize({
      client_id: clientId,
      callback: (response: { credential: string }) => callback(response.credential),
      auto_select: true,
    });
  }

  renderButton(element: HTMLElement): void {
    google.accounts.id.renderButton(element, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'signin_with',
      locale: 'es',
      width: 280,
    });
  }

  setCredential(credential: string): void {
    const payload = this.parseJwt(credential);
    const user: GoogleUser = {
      name:    payload.name,
      email:   payload.email,
      picture: payload.picture,
      credential,
    };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(user));
    this.user.set(user);

    // Cargar perfil de la API (rol, BU, etc.)
    this.fetchProfile();
  }

  /** Llama a /api/usuarios/me y guarda el perfil. */
  fetchProfile(): void {
    this.http.get<UserProfile>(`${environment.apiUrl}/usuarios/me`).subscribe({
      next: profile => {
        localStorage.setItem(this.PROFILE_KEY, JSON.stringify(profile));
        this.profile.set(profile);
      },
      error: () => {},
    });
  }

  logout(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.PROFILE_KEY);
    this.user.set(null);
    this.profile.set(null);
    google.accounts.id.disableAutoSelect();
  }

  getCredential(): string | null {
    return this.user()?.credential ?? null;
  }

  isAuthenticated(): boolean {
    const u = this.user();
    return u !== null && this.isTokenValid(u.credential);
  }

  private loadStoredUser(): GoogleUser | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return null;
      const user: GoogleUser = JSON.parse(stored);
      if (!this.isTokenValid(user.credential)) {
        localStorage.removeItem(this.STORAGE_KEY);
        localStorage.removeItem(this.PROFILE_KEY);
        return null;
      }
      return user;
    } catch {
      return null;
    }
  }

  private loadStoredProfile(): UserProfile | null {
    try {
      const stored = localStorage.getItem(this.PROFILE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  private isTokenValid(credential: string): boolean {
    try {
      const payload = this.parseJwt(credential);
      return payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }

  private parseJwt(token: string): any {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  }
}
