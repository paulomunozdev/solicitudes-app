import { Component, AfterViewInit, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { NgIf } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [NgIf],
  template: `
    <div class="login-page">
      <div class="login-card">
        <div class="logo">
          <div class="logo-icon">S</div>
          <h1 class="logo-text">SolicitudesApp</h1>
        </div>

        <p class="tagline">Gestión de solicitudes para tu equipo</p>

        <div class="divider"></div>

        <p class="sign-in-label">Inicia sesión para continuar</p>

        <!-- Botón Google -->
        <div #googleBtn class="google-btn-wrap"></div>

        <div class="separator">
          <span class="separator-line"></span>
          <span class="separator-text">o</span>
          <span class="separator-line"></span>
        </div>

        <!-- Botón Microsoft -->
        <button class="ms-btn" (click)="loginWithMicrosoft()" [disabled]="loading()">
          <svg class="ms-logo" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 23 23">
            <path fill="#f35325" d="M1 1h10v10H1z"/>
            <path fill="#81bc06" d="M12 1h10v10H12z"/>
            <path fill="#05a6f0" d="M1 12h10v10H1z"/>
            <path fill="#ffba08" d="M12 12h10v10H12z"/>
          </svg>
          <span>{{ loading() ? 'Conectando...' : 'Continuar con Microsoft' }}</span>
        </button>

        <p *ngIf="error()" class="error-msg">{{ error() }}</p>

        <p class="footer-note">
          Al iniciar sesión aceptas los términos de uso de la plataforma.
        </p>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: flex; align-items: center; justify-content: center;
      min-height: 100vh;
      background-color: #0c101a;
      background-image: radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px);
      background-size: 28px 28px;
      padding: 24px;
    }

    .login-page { display: contents; }

    .login-card {
      width: 100%; max-width: 380px;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.09);
      border-radius: 16px; padding: 36px 32px 28px;
      display: flex; flex-direction: column; gap: 0;
      box-shadow: 0 0 0 1px rgba(255,255,255,0.04),
                  0 24px 48px -12px rgba(0,0,0,0.55),
                  0 0 80px -20px oklch(0.55 0.190 259 / 0.12);
      backdrop-filter: blur(12px);
    }

    .logo { display: flex; align-items: center; gap: 12px; margin-bottom: 28px; }
    .logo-icon {
      width: 40px; height: 40px; border-radius: 10px;
      background: oklch(0.55 0.190 259);
      display: flex; align-items: center; justify-content: center;
      font-size: 18px; font-weight: 700; color: #fff;
      letter-spacing: -0.03em; flex-shrink: 0;
      box-shadow: 0 4px 12px oklch(0.55 0.190 259 / 0.35);
    }
    .logo-text { font-size: 17px; font-weight: 600; color: #fff; letter-spacing: -0.015em; margin: 0; }

    .tagline { font-size: 22px; font-weight: 600; color: #fff; letter-spacing: -0.02em; margin: 0 0 6px; }
    .divider { display: none; }
    .sign-in-label { font-size: 13.5px; color: rgba(255,255,255,0.4); line-height: 1.5; margin: 0 0 28px; }

    .google-btn-wrap {
      width: 100%; display: flex; justify-content: center; margin-bottom: 12px;
    }
    .google-btn-wrap > div,
    .google-btn-wrap > div > div,
    .google-btn-wrap iframe { width: 100% !important; max-width: 100% !important; }

    .separator {
      display: flex; align-items: center; gap: 12px; margin-bottom: 12px;
    }
    .separator-line { flex: 1; height: 1px; background: rgba(255,255,255,0.08); }
    .separator-text { font-size: 11.5px; color: rgba(255,255,255,0.3); white-space: nowrap; }

    .ms-btn {
      width: 100%; height: 40px;
      display: flex; align-items: center; justify-content: center; gap: 10px;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.10); border-radius: 8px;
      color: rgba(255,255,255,0.85); font-size: 13.5px; font-weight: 500;
      cursor: pointer; font-family: inherit; margin-bottom: 16px;
      transition: background 120ms ease, border-color 120ms ease;
    }
    .ms-btn:hover:not(:disabled) { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.16); }
    .ms-btn:active { transform: translateY(0.5px); }
    .ms-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .ms-logo { width: 18px; height: 18px; flex-shrink: 0; }

    .error-msg {
      display: flex; align-items: center; gap: 8px;
      padding: 10px 12px; margin-bottom: 16px;
      background: oklch(0.95 0.035 25); border: 1px solid oklch(0.88 0.060 25);
      border-radius: 7px; color: oklch(0.45 0.150 25);
      font-size: 12.5px; line-height: 1.45; text-align: left;
    }

    .footer-note {
      font-size: 11.5px; color: rgba(255,255,255,0.22);
      text-align: center; line-height: 1.5; margin: 0;
    }
  `],
})
export class LoginComponent implements AfterViewInit {
  @ViewChild('googleBtn') googleBtnRef!: ElementRef<HTMLDivElement>;

  private readonly auth   = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly error   = signal<string | null>(null);

  ngAfterViewInit(): void {
    if (this.auth.isAuthenticated()) {
      this.router.navigate(['/solicitudes']);
      return;
    }

    this.auth.initialize(environment.googleClientId, (credential) => {
      this.auth.setCredential(credential);
      this.router.navigate(['/solicitudes']);
    });

    this.auth.renderButton(this.googleBtnRef.nativeElement);
  }

  async loginWithMicrosoft(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      await this.auth.loginWithAzure();
      this.router.navigate(['/solicitudes']);
    } catch (e: any) {
      // Ignorar cancelaciones del popup
      if (e?.errorCode !== 'user_cancelled' && e?.message !== 'user_cancelled') {
        this.error.set('No se pudo iniciar sesión con Microsoft. Intenta nuevamente.');
      }
    } finally {
      this.loading.set(false);
    }
  }
}
