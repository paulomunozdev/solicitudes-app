import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface UserProfile {
  id: string;
  nombre: string;
  email: string;
  foto: string | null;
  rol: number;
  rolNombre: string;
  unidadNegocioNombre: string | null;
  activo: boolean;
  ultimoAcceso: string;
}

interface UnidadNegocio { id: string; nombre: string; color: string; }

const ROL_OPTIONS = [
  { value: 0, label: 'Pendiente',   color: '#f59e0b' },
  { value: 1, label: 'Solicitante', color: '#3b82f6' },
  { value: 2, label: 'Gestor',      color: '#8b5cf6' },
  { value: 3, label: 'Admin',       color: '#ef4444' },
  { value: 4, label: 'Observador',  color: '#64748b' },
];

@Component({
  selector: 'app-usuarios-admin',
  standalone: true,
  imports: [FormsModule, MatIconModule, DatePipe],
  template: `
    <div class="page-header">
      <div>
        <h1 class="page-title">Usuarios</h1>
        <p class="page-subtitle">Gestiona los accesos y roles del equipo</p>
      </div>
    </div>

    <div class="table-card">
      @if (loading()) {
        <div class="loading-state"><div class="spinner"></div></div>
      } @else if (usuarios().length === 0) {
        <div class="empty-state">
          <mat-icon>group</mat-icon>
          <p>No hay usuarios aún</p>
        </div>
      } @else {
        <table class="table">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Rol</th>
              <th>Unidad de Negocio</th>
              <th>Último acceso</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (u of usuarios(); track u.id) {
              <tr class="table-row">
                <td>
                  <div class="user-cell">
                    @if (u.foto) {
                      <img class="avatar avatar--img" [src]="u.foto" [alt]="u.nombre" />
                    } @else {
                      <div class="avatar">{{ u.nombre[0] }}</div>
                    }
                    <div>
                      <p class="user-name">{{ u.nombre }}</p>
                      <p class="user-email">{{ u.email }}</p>
                    </div>
                  </div>
                </td>
                <td>
                  @if (editando()?.id === u.id) {
                    <select class="field-select" [(ngModel)]="editRol">
                      @for (r of roles; track r.value) {
                        <option [value]="r.value">{{ r.label }}</option>
                      }
                    </select>
                  } @else {
                    <span class="rol-badge" [style.background]="rolColor(u.rol) + '20'" [style.color]="rolColor(u.rol)">
                      {{ rolLabel(u.rol) }}
                    </span>
                  }
                </td>
                <td>
                  @if (editando()?.id === u.id) {
                    <select class="field-select" [(ngModel)]="editBu">
                      <option value="">Sin unidad</option>
                      @for (bu of unidades(); track bu.id) {
                        <option [value]="bu.nombre">{{ bu.nombre }}</option>
                      }
                    </select>
                  } @else {
                    <span class="muted">{{ u.unidadNegocioNombre || '—' }}</span>
                  }
                </td>
                <td class="muted">{{ u.ultimoAcceso | date:'dd/MM/yy HH:mm' }}</td>
                <td class="col-actions">
                  @if (editando()?.id === u.id) {
                    <button class="icon-btn icon-btn--save" (click)="guardar()" title="Guardar">
                      <mat-icon>check</mat-icon>
                    </button>
                    <button class="icon-btn" (click)="cancelar()" title="Cancelar">
                      <mat-icon>close</mat-icon>
                    </button>
                  } @else {
                    <button class="icon-btn" (click)="editar(u)" title="Editar">
                      <mat-icon>edit</mat-icon>
                    </button>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; flex: 1; padding: 28px 32px; gap: 20px; }

    .page-title { font-size: 20px; font-weight: 600; color: var(--text-primary, #161b26); letter-spacing: -0.015em; margin: 0; }
    .page-subtitle { font-size: 13px; color: var(--text-tertiary, #6b7386); margin: 4px 0 0; }

    .table-card { background: var(--n-0, #fff); border: 1px solid var(--border-subtle, #e9ecf2); border-radius: 12px; overflow: hidden; }
    .table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
    .table th {
      text-align: left; font-size: 11.5px; font-weight: 500;
      color: var(--text-tertiary, #6b7386); letter-spacing: 0.04em; text-transform: uppercase;
      padding: 12px 16px; border-bottom: 1px solid var(--border-subtle, #e9ecf2);
      background: var(--n-25, #fcfcfd); white-space: nowrap;
    }
    .table-row td {
      padding: 12px 16px; border-bottom: 1px solid var(--border-subtle, #e9ecf2);
      color: var(--text-secondary, #353c4d); vertical-align: middle; height: 52px;
    }
    .table-row:last-child td { border-bottom: none; }
    .table-row { transition: background 120ms ease; }
    .table-row:hover { background: var(--n-25, #fcfcfd); }

    .user-cell { display: flex; align-items: center; gap: 12px; }
    .avatar {
      width: 34px; height: 34px; border-radius: 50%;
      background: var(--n-200, #cfd4de); color: var(--n-600, #4e566a);
      display: inline-flex; align-items: center; justify-content: center;
      font-size: 12px; font-weight: 600; flex-shrink: 0; user-select: none;
    }
    .avatar--img { object-fit: cover; }
    .user-name { font-size: 13.5px; font-weight: 500; color: var(--text-primary, #161b26); margin: 0; line-height: 1.2; }
    .user-email { font-size: 12px; color: var(--text-muted, #8a92a3); margin: 2px 0 0; max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    .rol-badge { display: inline-flex; align-items: center; height: 22px; padding: 0 9px; border-radius: 9999px; font-size: 12px; font-weight: 500; white-space: nowrap; }
    .muted { font-size: 12.5px; color: var(--text-tertiary, #6b7386); font-variant-numeric: tabular-nums; }

    .field-select {
      height: 30px; padding: 0 26px 0 8px;
      background: var(--n-0, #fff); border: 1px solid var(--border-default, #dfe3eb);
      border-radius: 6px; font-size: 13px; color: var(--text-primary, #161b26);
      outline: none; cursor: pointer; font-family: inherit; appearance: none;
      background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7386' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
      background-repeat: no-repeat; background-position: right 8px center;
      transition: border-color 120ms ease, box-shadow 120ms ease;
    }
    .field-select:focus { border-color: oklch(0.55 0.190 259); box-shadow: 0 0 0 2px oklch(0.78 0.130 259 / 0.20); }

    .col-actions { display: flex; gap: 4px; justify-content: flex-end; }
    .icon-btn {
      width: 28px; height: 28px; border-radius: 6px;
      display: inline-flex; align-items: center; justify-content: center;
      background: none; border: 1px solid var(--border-default, #dfe3eb);
      color: var(--text-muted, #8a92a3); cursor: pointer; font-family: inherit;
      transition: background 120ms ease, color 120ms ease, border-color 120ms ease;
    }
    .icon-btn:hover { background: var(--n-75, #f1f3f7); color: var(--text-primary, #161b26); border-color: var(--border-strong, #cfd4de); }
    .icon-btn mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .icon-btn--save { background: oklch(0.96 0.035 155); border-color: oklch(0.88 0.060 155); color: oklch(0.42 0.120 155); }
    .icon-btn--save:hover { background: oklch(0.90 0.070 155); }

    .loading-state, .empty-state { display: flex; flex-direction: column; align-items: center; padding: 48px; gap: 12px; color: var(--text-muted, #8a92a3); }
    .empty-state mat-icon { font-size: 40px; width: 40px; height: 40px; }
    .spinner { width: 28px; height: 28px; border: 3px solid var(--border-subtle, #e9ecf2); border-top-color: oklch(0.55 0.190 259); border-radius: 50%; animation: spin .8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `],
})
export class UsuariosAdminComponent implements OnInit {
  private readonly http = inject(HttpClient);

  readonly usuarios  = signal<UserProfile[]>([]);
  readonly unidades  = signal<UnidadNegocio[]>([]);
  readonly loading   = signal(true);
  readonly editando  = signal<UserProfile | null>(null);

  readonly roles = ROL_OPTIONS;
  editRol = 1;
  editBu  = '';

  ngOnInit(): void {
    this.cargar();
    this.http.get<UnidadNegocio[]>(`${environment.apiUrl}/unidades-negocio?soloActivas=true`)
      .subscribe(data => this.unidades.set(data));
  }

  cargar(): void {
    this.loading.set(true);
    this.http.get<UserProfile[]>(`${environment.apiUrl}/usuarios`).subscribe({
      next: data => { this.usuarios.set(data); this.loading.set(false); },
      error: ()  => this.loading.set(false),
    });
  }

  editar(u: UserProfile): void {
    this.editando.set(u);
    this.editRol = u.rol;
    this.editBu  = u.unidadNegocioNombre ?? '';
  }

  cancelar(): void { this.editando.set(null); }

  guardar(): void {
    const u = this.editando();
    if (!u) return;
    this.http.put(`${environment.apiUrl}/usuarios/${u.id}`, {
      rol: this.editRol,
      unidadNegocioNombre: this.editBu || null,
    }).subscribe(() => { this.cancelar(); this.cargar(); });
  }

  rolLabel(rol: number): string { return ROL_OPTIONS.find(r => r.value === rol)?.label ?? '?'; }
  rolColor(rol: number): string { return ROL_OPTIONS.find(r => r.value === rol)?.color ?? '#64748b'; }
}
