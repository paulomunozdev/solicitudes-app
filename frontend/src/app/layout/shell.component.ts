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
    .sidebar__section {
      font-size: 10px; font-weight: 600; color: #475569;
      text-transform: uppercase; letter-spacing: .8px;
      padding: 12px 12px 4px; margin-top: 4px;
    }

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

    /* ── Pending screen ── */
    .pending-screen {
      flex: 1; display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      gap: 12px; padding: 48px; text-align: center; color: #475569;
    }
    .pending-icon { font-size: 56px; width: 56px; height: 56px; color: #f59e0b; }
    .pending-screen h2 { font-size: 20px; font-weight: 700; color: #0f172a; margin: 0; }
    .pending-screen p { font-size: 14px; margin: 0; max-width: 380px; }
    .pending-email { font-size: 13px; color: #94a3b8; }
    .btn-logout {
      margin-top: 8px; display: flex; align-items: center; gap: 6px;
      background: none; border: 1px solid #e2e8f0; border-radius: 8px;
      padding: 9px 16px; font-size: 14px; color: #64748b; cursor: pointer;
    }
    .btn-logout:hover { background: #f8fafc; }
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
