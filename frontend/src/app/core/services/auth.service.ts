import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  PublicClientApplication,
  Configuration,
  AccountInfo,
  InteractionRequiredAuthError,
  SilentRequest,
} from '@azure/msal-browser';
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

// ── MSAL instance (singleton) ───────────────────────────────────
const msalConfig: Configuration = {
  auth: {
    clientId:    environment.msal.clientId,
    authority:   `https://login.microsoftonline.com/${environment.msal.tenantId}`,
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'localStorage',
  },
};

const msalApp = new PublicClientApplication(msalConfig);
let msalInitialized = false;

async function getMsalApp(): Promise<PublicClientApplication> {
  if (!msalInitialized) {
    await msalApp.initialize();
    // Completar el redirect flow si aplica (no rompe nada en popup flow)
    await msalApp.handleRedirectPromise().catch(() => null);
    msalInitialized = true;
  }
  return msalApp;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly GOOGLE_KEY  = 'google_credential';
  private readonly PROFILE_KEY = 'user_profile';
  private readonly LOGIN_TYPE_KEY = 'login_type';

  /** 'google' | 'azure' | null */
  readonly loginType = signal<'google' | 'azure' | null>(
    (sessionStorage.getItem(this.LOGIN_TYPE_KEY) ?? localStorage.getItem(this.LOGIN_TYPE_KEY)) as 'google' | 'azure' | null
  );

  readonly user    = signal<GoogleUser | null>(this.loadStoredGoogleUser());
  readonly profile = signal<UserProfile | null>(this.loadStoredProfile());

  // ── Computed helpers para templates ────────────────────────────
  readonly isAdmin     = computed(() => this.profile()?.rol === 3);
  readonly isGestor    = computed(() => (this.profile()?.rol ?? 0) >= 2);
  readonly isPendiente = computed(() => this.profile()?.rol === 0);
  readonly canCreate   = computed(() => (this.profile()?.rol ?? 0) >= 1 && (this.profile()?.rol ?? 0) !== 4);

  // Para compatibilidad con shell que usa auth.user()?.picture/name/email
  readonly displayName = computed(() =>
    this.loginType() === 'azure'
      ? (this.profile()?.nombre ?? '')
      : (this.user()?.name ?? '')
  );
  readonly displayEmail = computed(() =>
    this.loginType() === 'azure'
      ? (this.profile()?.email ?? '')
      : (this.user()?.email ?? '')
  );
  readonly displayPicture = computed(() =>
    this.loginType() === 'azure' ? null : (this.user()?.picture ?? null)
  );

  constructor() {
    if (this.isAuthenticated()) {
      this.fetchProfile();
    }
    // Pre-inicializar MSAL en segundo plano
    getMsalApp().catch(() => null);
  }

  // ── Google login ────────────────────────────────────────────────
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
    // sessionStorage: el token se elimina al cerrar el tab (menor exposición a XSS persistente)
    sessionStorage.setItem(this.GOOGLE_KEY, JSON.stringify(user));
    sessionStorage.setItem(this.LOGIN_TYPE_KEY, 'google');
    this.loginType.set('google');
    this.user.set(user);
    this.fetchProfile();
  }

  // ── Azure AD login ──────────────────────────────────────────────
  async loginWithAzure(): Promise<void> {
    const app = await getMsalApp();
    const result = await app.loginPopup({
      scopes: environment.msal.scopes,
    });
    if (result?.account) {
      app.setActiveAccount(result.account);
      sessionStorage.setItem(this.LOGIN_TYPE_KEY, 'azure');
      this.loginType.set('azure');
      this.user.set(null);
      this.fetchProfile();
    }
  }

  // ── Token para el interceptor ───────────────────────────────────
  async getToken(): Promise<string | null> {
    const type = this.loginType();

    if (type === 'google') {
      return this.user()?.credential ?? null;
    }

    if (type === 'azure') {
      try {
        const app     = await getMsalApp();
        const account = this.getAzureAccount(app);
        if (!account) return null;

        const request: SilentRequest = {
          scopes: environment.msal.scopes,
          account,
        };

        try {
          const result = await app.acquireTokenSilent(request);
          return result.accessToken;
        } catch (e) {
          if (e instanceof InteractionRequiredAuthError) {
            const result = await app.acquireTokenPopup(request);
            return result.accessToken;
          }
          return null;
        }
      } catch {
        return null;
      }
    }

    return null;
  }

  // ── Perfil ──────────────────────────────────────────────────────
  fetchProfile(): void {
    this.http.get<UserProfile>(`${environment.apiUrl}/usuarios/me`).subscribe({
      next: profile => {
        sessionStorage.setItem(this.PROFILE_KEY, JSON.stringify(profile));
        this.profile.set(profile);
      },
      error: () => {},
    });
  }

  // ── Logout ──────────────────────────────────────────────────────
  logout(): void {
    const type = this.loginType();

    sessionStorage.removeItem(this.GOOGLE_KEY);
    sessionStorage.removeItem(this.PROFILE_KEY);
    sessionStorage.removeItem(this.LOGIN_TYPE_KEY);
    this.user.set(null);
    this.profile.set(null);
    this.loginType.set(null);

    if (type === 'google') {
      try { google.accounts.id.disableAutoSelect(); } catch { }
    } else if (type === 'azure') {
      getMsalApp().then(app => {
        const account = this.getAzureAccount(app);
        if (account) app.logoutPopup({ account }).catch(() => null);
      });
    }
  }

  // ── Auth check ──────────────────────────────────────────────────
  isAuthenticated(): boolean {
    const type = this.loginType();
    if (type === 'google') {
      const u = this.user();
      return u !== null && this.isGoogleTokenValid(u.credential);
    }
    if (type === 'azure') {
      // Si hay cuenta MSAL en localStorage se considera autenticado
      return this.hasAzureAccount();
    }
    return false;
  }

  /** @deprecated Usar getToken() async. Mantenido para compatibilidad. */
  getCredential(): string | null {
    return this.user()?.credential ?? null;
  }

  // ── Privados ────────────────────────────────────────────────────
  private getAzureAccount(app: PublicClientApplication): AccountInfo | null {
    const active = app.getActiveAccount();
    if (active) return active;
    const all = app.getAllAccounts();
    if (all.length > 0) {
      app.setActiveAccount(all[0]);
      return all[0];
    }
    return null;
  }

  private hasAzureAccount(): boolean {
    // Verificación ligera sin await — busca cuentas en localStorage
    try {
      return msalApp.getAllAccounts().length > 0;
    } catch {
      return false;
    }
  }

  private loadStoredGoogleUser(): GoogleUser | null {
    if (sessionStorage.getItem(this.LOGIN_TYPE_KEY) !== 'google') return null;
    try {
      const stored = sessionStorage.getItem(this.GOOGLE_KEY);
      if (!stored) return null;
      const user: GoogleUser = JSON.parse(stored);
      if (!this.isGoogleTokenValid(user.credential)) {
        sessionStorage.removeItem(this.GOOGLE_KEY);
        sessionStorage.removeItem(this.PROFILE_KEY);
        sessionStorage.removeItem(this.LOGIN_TYPE_KEY);
        return null;
      }
      return user;
    } catch {
      return null;
    }
  }

  private loadStoredProfile(): UserProfile | null {
    try {
      const stored = sessionStorage.getItem(this.PROFILE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  private isGoogleTokenValid(credential: string): boolean {
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
