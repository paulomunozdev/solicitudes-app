import { Component, inject } from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatIconModule],
  template: `
    <div class="shell">
      <!-- Sidebar -->
      <aside class="sidebar">
        <div class="sidebar__logo">
          <div class="sidebar__logo-icon">S</div>
          <span class="sidebar__logo-text">SolicitudesApp</span>
        </div>

        <nav class="sidebar__nav">
          <a class="sidebar__item" routerLink="/solicitudes" routerLinkActive="sidebar__item--active"
             [routerLinkActiveOptions]="{exact: false}">
            <mat-icon>inbox</mat-icon>
            <span>Solicitudes</span>
          </a>
          <a class="sidebar__item sidebar__item--disabled">
            <mat-icon>bar_chart</mat-icon>
            <span>Reportes</span>
          </a>
          <a class="sidebar__item sidebar__item--disabled">
            <mat-icon>group</mat-icon>
            <span>Usuarios</span>
          </a>
          <a class="sidebar__item sidebar__item--disabled">
            <mat-icon>settings</mat-icon>
            <span>Configuración</span>
          </a>
        </nav>

        <div class="sidebar__user">
          @if (auth.user()?.picture) {
            <img class="sidebar__avatar sidebar__avatar--img" [src]="auth.user()!.picture" [alt]="auth.user()!.name" />
          } @else {
            <div class="sidebar__avatar">{{ auth.user()?.name?.[0] ?? '?' }}</div>
          }
          <div class="sidebar__user-info">
            <p class="sidebar__user-name">{{ auth.user()?.name ?? 'Usuario' }}</p>
            <p class="sidebar__user-email">{{ auth.user()?.email ?? '' }}</p>
          </div>
          <button class="sidebar__logout" (click)="logout()" title="Cerrar sesión">
            <mat-icon>logout</mat-icon>
          </button>
        </div>
      </aside>

      <!-- Main content -->
      <main class="main">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .shell {
      display: flex;
      height: 100vh;
      overflow: hidden;
      background: #f4f5f7;
    }

    /* ── Sidebar ── */
    .sidebar {
      width: 220px;
      min-width: 220px;
      background: #0f172a;
      display: flex;
      flex-direction: column;
      padding: 0;
      box-shadow: 2px 0 8px rgba(0,0,0,.25);
    }

    .sidebar__logo {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 20px 16px 24px;
      border-bottom: 1px solid rgba(255,255,255,.06);
    }
    .sidebar__logo-icon {
      width: 32px; height: 32px;
      background: #3b82f6;
      border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      color: #fff; font-weight: 700; font-size: 16px;
    }
    .sidebar__logo-text {
      color: #fff;
      font-weight: 600;
      font-size: 14px;
      letter-spacing: .3px;
    }

    .sidebar__nav {
      flex: 1;
      padding: 12px 8px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .sidebar__item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 9px 12px;
      border-radius: 8px;
      color: #94a3b8;
      text-decoration: none;
      font-size: 14px;
      font-weight: 500;
      transition: background .15s, color .15s;
      cursor: pointer;
    }
    .sidebar__item mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .sidebar__item:hover { background: rgba(255,255,255,.06); color: #e2e8f0; }
    .sidebar__item--active { background: rgba(59,130,246,.18); color: #60a5fa; }
    .sidebar__item--active mat-icon { color: #60a5fa; }
    .sidebar__item--disabled { opacity: .4; pointer-events: none; }

    .sidebar__user {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 14px 16px;
      border-top: 1px solid rgba(255,255,255,.06);
    }
    .sidebar__avatar {
      width: 32px; height: 32px;
      background: #334155;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      color: #94a3b8; font-weight: 600; font-size: 13px;
    }
    .sidebar__user-name { color: #e2e8f0; font-size: 13px; font-weight: 500; margin: 0; }
    .sidebar__user-email { color: #64748b; font-size: 11px; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 110px; }
    .sidebar__avatar--img { object-fit: cover; border-radius: 50%; }
    .sidebar__logout {
      margin-left: auto; background: none; border: none; cursor: pointer;
      color: #475569; padding: 4px; border-radius: 6px; display: flex;
      align-items: center; transition: color .15s;
    }
    .sidebar__logout:hover { color: #f87171; }
    .sidebar__logout mat-icon { font-size: 16px; width: 16px; height: 16px; }

    /* ── Main ── */
    .main {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
    }
  `],
})
export class ShellComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
