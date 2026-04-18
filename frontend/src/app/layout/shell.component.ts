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
          @if (auth.isGestor()) {
            <a class="sidebar__item" routerLink="/dashboard" routerLinkActive="sidebar__item--active">
              <mat-icon>bar_chart</mat-icon>
              <span>Dashboard</span>
            </a>
          }
          @if (auth.isAdmin()) {
            <div class="sidebar__section">Admin</div>
            <a class="sidebar__item" routerLink="/admin/usuarios" routerLinkActive="sidebar__item--active">
              <mat-icon>group</mat-icon>
              <span>Usuarios</span>
            </a>
            <a class="sidebar__item" routerLink="/admin/categorias" routerLinkActive="sidebar__item--active">
              <mat-icon>label</mat-icon>
              <span>Categorías</span>
            </a>
            <a class="sidebar__item" routerLink="/admin/unidades-negocio" routerLinkActive="sidebar__item--active">
              <mat-icon>corporate_fare</mat-icon>
              <span>Unidades</span>
            </a>
            <a class="sidebar__item" routerLink="/admin/sla" routerLinkActive="sidebar__item--active">
              <mat-icon>timer</mat-icon>
              <span>SLA</span>
            </a>
          }
        </nav>

        <div class="sidebar__user">
          @if (auth.displayPicture()) {
            <img class="sidebar__avatar sidebar__avatar--img" [src]="auth.displayPicture()!" [alt]="auth.displayName()" />
          } @else {
            <div class="sidebar__avatar">{{ auth.displayName()[0] || '?' }}</div>
          }
          <div class="sidebar__user-info">
            <p class="sidebar__user-name">{{ auth.displayName() || 'Usuario' }}</p>
            <p class="sidebar__user-email">{{ auth.displayEmail() }}</p>
          </div>
          <button class="sidebar__logout" (click)="logout()" title="Cerrar sesión">
            <mat-icon>logout</mat-icon>
          </button>
        </div>
      </aside>

      <!-- Main content -->
      <main class="main">
        @if (auth.isPendiente()) {
          <div class="pending-screen">
            <mat-icon class="pending-icon">hourglass_empty</mat-icon>
            <h2>Cuenta pendiente de aprobación</h2>
            <p>Tu cuenta fue registrada correctamente. Un administrador debe aprobarla antes de que puedas acceder.</p>
            <p class="pending-email">{{ auth.user()?.email }}</p>
            <button class="btn-logout" (click)="logout()">
              <mat-icon>logout</mat-icon> Cerrar sesión
            </button>
          </div>
        } @else {
          <router-outlet></router-outlet>
        }
      </main>
    </div>
  `,
  styles: [`
    :host { display: flex; height: 100vh; overflow: hidden; }

    /* ── Sidebar ── */
    .sidebar {
      width: 240px; min-width: 240px; height: 100vh;
      display: flex; flex-direction: column;
      background: var(--sb-bg, #0c101a);
      border-right: 1px solid var(--sb-border, rgba(255,255,255,0.06));
      overflow: hidden; position: relative; z-index: 10;
    }

    .sidebar__logo {
      display: flex; align-items: center; gap: 10px;
      padding: 0 16px; height: 56px; flex-shrink: 0;
      border-bottom: 1px solid var(--sb-border, rgba(255,255,255,0.06));
    }
    .sidebar__logo-icon {
      width: 28px; height: 28px; border-radius: 7px;
      background: var(--sb-accent, oklch(0.78 0.130 259));
      display: flex; align-items: center; justify-content: center;
      font-size: 14px; font-weight: 700; color: #fff; flex-shrink: 0;
    }
    .sidebar__logo-text {
      font-size: 14px; font-weight: 600;
      color: var(--sb-text-active, #ffffff);
      letter-spacing: -0.01em; white-space: nowrap;
    }

    .sidebar__nav {
      flex: 1; overflow-y: auto; overflow-x: hidden;
      padding: 12px 8px; display: flex; flex-direction: column; gap: 2px;
      scrollbar-width: none;
    }
    .sidebar__nav::-webkit-scrollbar { display: none; }

    .sidebar__section {
      font-size: 10.5px; font-weight: 600; letter-spacing: 0.07em;
      text-transform: uppercase; color: var(--sb-text-muted, #7a8397);
      padding: 12px 10px 4px; user-select: none;
    }

    .sidebar__item {
      display: flex; align-items: center; gap: 10px;
      height: 34px; padding: 0 10px; border-radius: 7px;
      color: var(--sb-text-muted, #7a8397);
      font-size: 13px; font-weight: 500; cursor: pointer;
      text-decoration: none; position: relative;
      transition: background 120ms ease, color 120ms ease;
    }
    .sidebar__item mat-icon { font-size: 18px; width: 18px; height: 18px; color: inherit; opacity: 0.85; flex-shrink: 0; }
    .sidebar__item:hover { background: var(--sb-item-hover, rgba(255,255,255,0.04)); color: var(--sb-text, #cdd3e0); }
    .sidebar__item--active { background: var(--sb-item-active, rgba(255,255,255,0.06)); color: var(--sb-text-active, #ffffff); }
    .sidebar__item--active::before {
      content: ""; position: absolute; left: -8px; top: 8px; bottom: 8px;
      width: 2px; background: var(--sb-accent, oklch(0.78 0.130 259)); border-radius: 2px;
    }
    .sidebar__item--active mat-icon { color: var(--sb-accent, oklch(0.78 0.130 259)); opacity: 1; }

    /* ── Panel usuario ── */
    .sidebar__user {
      flex-shrink: 0; display: flex; align-items: center; gap: 10px;
      padding: 12px 10px; border-top: 1px solid var(--sb-border, rgba(255,255,255,0.06));
    }
    .sidebar__avatar {
      width: 30px; height: 30px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 11.5px; font-weight: 600; color: #fff; background: #2d3748;
      flex-shrink: 0; user-select: none;
    }
    .sidebar__avatar--img { object-fit: cover; }
    .sidebar__user-info { flex: 1; overflow: hidden; }
    .sidebar__user-name {
      font-size: 12.5px; font-weight: 500; margin: 0;
      color: var(--sb-text, #cdd3e0);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .sidebar__user-email {
      font-size: 11px; margin: 0; color: var(--sb-text-muted, #7a8397);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .sidebar__logout {
      display: flex; align-items: center; justify-content: center;
      width: 28px; height: 28px; border-radius: 6px;
      border: none; background: none; color: var(--sb-text-muted, #7a8397);
      cursor: pointer; flex-shrink: 0; font-family: inherit;
      transition: background 120ms ease, color 120ms ease;
    }
    .sidebar__logout mat-icon { font-size: 17px; width: 17px; height: 17px; }
    .sidebar__logout:hover { background: rgba(239,68,68,0.12); color: oklch(0.55 0.18 25); }

    /* ── Main ── */
    .main {
      flex: 1; height: 100vh; overflow-y: auto; overflow-x: hidden;
      display: flex; flex-direction: column;
      background: var(--surface-app, #f7f8fa); min-width: 0;
    }

    /* ── Pending screen ── */
    .pending-screen {
      flex: 1; display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      gap: 12px; padding: 48px; text-align: center;
    }
    .pending-icon {
      font-size: 28px; width: 28px; height: 28px;
      color: oklch(0.45 0.130 65);
    }
    .pending-screen h2 { font-size: 17px; font-weight: 600; color: var(--text-primary, #161b26); margin: 0; }
    .pending-screen p { font-size: 13.5px; color: var(--text-tertiary, #6b7386); margin: 0; max-width: 380px; line-height: 1.6; }
    .pending-email { font-size: 13px; color: var(--text-muted, #8a92a3); }
    .btn-logout {
      margin-top: 8px; display: flex; align-items: center; gap: 6px;
      background: none; border: 1px solid var(--border-default, #dfe3eb);
      border-radius: 8px; padding: 8px 16px;
      font-size: 13.5px; color: var(--text-secondary, #353c4d);
      cursor: pointer; font-family: inherit;
      transition: background 120ms ease;
    }
    .btn-logout:hover { background: var(--n-50, #f7f8fa); }
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
