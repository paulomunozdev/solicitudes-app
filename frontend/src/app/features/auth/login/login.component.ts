import { Component, AfterViewInit, ElementRef, ViewChild, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
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
        <div #googleBtn class="google-btn-wrap"></div>

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
      margin-bottom: 24px;
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

  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

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
}
