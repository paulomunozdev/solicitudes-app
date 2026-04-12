import { Injectable, signal } from '@angular/core';

export interface GoogleUser {
  name: string;
  email: string;
  picture: string;
  credential: string;
}

declare const google: any;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly STORAGE_KEY = 'google_credential';

  readonly user = signal<GoogleUser | null>(this.loadStoredUser());

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
      name: payload.name,
      email: payload.email,
      picture: payload.picture,
      credential,
    };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(user));
    this.user.set(user);
  }

  logout(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    this.user.set(null);
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
        return null;
      }
      return user;
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
