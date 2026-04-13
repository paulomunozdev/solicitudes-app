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
    .login-page {
      min-height: 100vh;
      background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .login-card {
      background: #fff;
      border-radius: 20px;
      padding: 48px 40px;
      width: 360px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0;
      box-shadow: 0 24px 60px rgba(0,0,0,.35);
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 8px;
    }
    .logo-icon {
      width: 44px; height: 44px;
      background: #3b82f6;
      border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      color: #fff; font-weight: 700; font-size: 22px;
    }
    .logo-text {
      font-size: 20px;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
    }

    .tagline {
      font-size: 13px;
      color: #64748b;
      margin: 0 0 24px;
      text-align: center;
    }

    .divider {
      width: 100%;
      height: 1px;
      background: #e2e8f0;
      margin-bottom: 24px;
    }

    .sign-in-label {
      font-size: 14px;
      font-weight: 500;
      color: #374151;
      margin: 0 0 16px;
    }

    .google-btn-wrap {
      display: flex;
      justify-content: center;
      margin-bottom: 16px;
    }

    .separator {
      display: flex;
      align-items: center;
      width: 100%;
      gap: 10px;
      margin-bottom: 16px;
    }
    .separator-line {
      flex: 1;
      height: 1px;
      background: #e2e8f0;
    }
    .separator-text {
      font-size: 12px;
      color: #94a3b8;
    }

    .ms-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      width: 280px;
      height: 40px;
      border: 1px solid #dadce0;
      border-radius: 4px;
      background: #fff;
      font-size: 14px;
      font-weight: 500;
      color: #3c4043;
      cursor: pointer;
      transition: background .15s, box-shadow .15s;
      margin-bottom: 20px;
    }
    .ms-btn:hover:not(:disabled) {
      background: #f8faff;
      box-shadow: 0 1px 3px rgba(0,0,0,.12);
    }
    .ms-btn:disabled {
      opacity: .6;
      cursor: not-allowed;
    }
    .ms-logo {
      width: 18px;
      height: 18px;
      flex-shrink: 0;
    }

    .error-msg {
      font-size: 12px;
      color: #ef4444;
      text-align: center;
      margin: -8px 0 16px;
    }

    .footer-note {
      font-size: 11px;
      color: #94a3b8;
      text-align: center;
      margin: 0;
      line-height: 1.5;
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
