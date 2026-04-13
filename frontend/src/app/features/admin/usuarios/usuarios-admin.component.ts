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
    :host { display: flex; flex-direction: column; flex: 1; padding: 32px; gap: 20px; }
    .page-title { font-size: 22px; font-weight: 700; color: #0f172a; margin: 0; }
    .page-subtitle { font-size: 13px; color: #64748b; margin: 4px 0 0; }

    .table-card { background: #fff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,.08); overflow: hidden; }
    .table { width: 100%; border-collapse: collapse; }
    .table th {
      text-align: left; padding: 12px 16px;
      font-size: 11px; font-weight: 600; color: #64748b;
      text-transform: uppercase; letter-spacing: .6px;
      background: #f8fafc; border-bottom: 1px solid #e2e8f0;
    }
    .table-row td { padding: 12px 16px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
    .table-row:last-child td { border-bottom: none; }

    .user-cell { display: flex; align-items: center; gap: 10px; }
    .avatar {
      width: 36px; height: 36px; border-radius: 50%;
      background: #334155; color: #94a3b8;
      display: flex; align-items: center; justify-content: center;
      font-weight: 600; font-size: 14px; flex-shrink: 0;
    }
    .avatar--img { object-fit: cover; }
    .user-name { font-size: 14px; font-weight: 500; color: #1e293b; margin: 0; }
    .user-email { font-size: 12px; color: #64748b; margin: 0; }

    .rol-badge { padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 500; }
    .muted { font-size: 13px; color: #64748b; }

    .field-select {
      border: 1px solid #e2e8f0; border-radius: 6px;
      padding: 6px 10px; font-size: 13px; color: #374151;
      background: #fff; cursor: pointer; outline: none;
    }

    .col-actions { display: flex; gap: 4px; justify-content: flex-end; }
    .icon-btn { background: none; border: none; cursor: pointer; color: #64748b; padding: 6px; border-radius: 6px; display: flex; }
    .icon-btn:hover { background: #f1f5f9; }
    .icon-btn--save { color: #15803d; }
    .icon-btn--save:hover { background: #dcfce7; }
    .icon-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .loading-state, .empty-state { display: flex; flex-direction: column; align-items: center; padding: 48px; gap: 12px; color: #94a3b8; }
    .empty-state mat-icon { font-size: 40px; width: 40px; height: 40px; }
    .spinner { width: 28px; height: 28px; border: 3px solid #e2e8f0; border-top-color: #3b82f6; border-radius: 50%; animation: spin .8s linear infinite; }
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
