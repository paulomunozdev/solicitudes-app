import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { UnidadesNegocioService, UnidadNegocio } from '../../../core/services/unidades-negocio.service';

const COLORES = [
  { label: 'Azul',     value: '#3b82f6' },
  { label: 'Violeta',  value: '#8b5cf6' },
  { label: 'Verde',    value: '#10b981' },
  { label: 'Ámbar',    value: '#f59e0b' },
  { label: 'Naranja',  value: '#f97316' },
  { label: 'Rojo',     value: '#ef4444' },
  { label: 'Cyan',     value: '#06b6d4' },
  { label: 'Gris',     value: '#64748b' },
  { label: 'Rosa',     value: '#ec4899' },
  { label: 'Negro',    value: '#0f172a' },
];

@Component({
  selector: 'app-unidades-negocio-admin',
  standalone: true,
  imports: [FormsModule, MatIconModule],
  template: `
    <div class="page-header">
      <div>
        <h1 class="page-title">Unidades de negocio</h1>
        <p class="page-subtitle">Gestiona las áreas o departamentos de tu organización</p>
      </div>
    </div>

    <div class="form-card">
      <h2 class="form-title">{{ editando() ? 'Editar unidad' : 'Nueva unidad de negocio' }}</h2>
      <div class="form-row">
        <input class="input" type="text" placeholder="Ej: Recursos Humanos, Finanzas..."
               [(ngModel)]="nombre" maxlength="100" />

        <div class="color-picker">
          @for (c of colores; track c.value) {
            <button class="color-dot"
                    [style.background]="c.value"
                    [class.color-dot--active]="color === c.value"
                    (click)="color = c.value"
                    [title]="c.label">
            </button>
          }
        </div>

        <div class="preview-badge" [style.background]="color + '20'" [style.color]="color">
          {{ nombre || 'Vista previa' }}
        </div>

        <button class="btn-primary" [disabled]="!nombre.trim()" (click)="guardar()">
          <mat-icon>{{ editando() ? 'save' : 'add' }}</mat-icon>
          {{ editando() ? 'Guardar' : 'Agregar' }}
        </button>
        @if (editando()) {
          <button class="btn-cancel" (click)="cancelarEdicion()">Cancelar</button>
        }
      </div>
    </div>

    <div class="table-card">
      @if (loading()) {
        <div class="loading-state"><div class="spinner"></div></div>
      } @else if (unidades().length === 0) {
        <div class="empty-state">
          <mat-icon>corporate_fare</mat-icon>
          <p>No hay unidades de negocio aún</p>
        </div>
      } @else {
        <table class="table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Color</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (u of unidades(); track u.id) {
              <tr class="table-row" [class.row--inactiva]="!u.activo">
                <td>
                  <span class="badge" [style.background]="u.color + '20'" [style.color]="u.color">
                    {{ u.nombre }}
                  </span>
                </td>
                <td><div class="color-swatch" [style.background]="u.color"></div></td>
                <td>
                  <span class="status" [class.status--activo]="u.activo">
                    {{ u.activo ? 'Activa' : 'Inactiva' }}
                  </span>
                </td>
                <td class="col-actions">
                  <button class="icon-btn" (click)="editar(u)" title="Editar">
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button class="icon-btn icon-btn--danger" (click)="toggleActivo(u)"
                          [title]="u.activo ? 'Desactivar' : 'Activar'">
                    <mat-icon>{{ u.activo ? 'visibility_off' : 'visibility' }}</mat-icon>
                  </button>
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

    .form-card { background: var(--n-0, #fff); border: 1px solid var(--border-subtle, #e9ecf2); border-radius: 12px; padding: 20px; display: flex; flex-direction: column; gap: 16px; }
    .form-title { font-size: 13px; font-weight: 600; color: var(--text-primary, #161b26); margin: 0; }
    .form-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }

    .input {
      height: 38px; padding: 0 12px;
      background: var(--n-0, #fff); border: 1px solid var(--border-default, #dfe3eb);
      border-radius: 8px; font-size: 13.5px; color: var(--text-primary, #161b26);
      outline: none; font-family: inherit; width: 240px;
      transition: border-color 120ms ease, box-shadow 120ms ease;
    }
    .input::placeholder { color: var(--text-muted, #8a92a3); }
    .input:focus { border-color: oklch(0.55 0.190 259); box-shadow: 0 0 0 3px oklch(0.78 0.130 259 / 0.20); }

    .color-picker { display: flex; gap: 6px; align-items: center; }
    .color-dot { width: 22px; height: 22px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; transition: transform 120ms ease, border-color 120ms ease, box-shadow 120ms ease; }
    .color-dot:hover { transform: scale(1.15); }
    .color-dot--active { border-color: var(--n-0, #fff); box-shadow: 0 0 0 2px var(--n-700, #353c4d); transform: scale(1.1); }
    .preview-badge { display: inline-flex; align-items: center; height: 22px; padding: 0 10px; border-radius: 9999px; font-size: 12px; font-weight: 500; white-space: nowrap; }

    .btn-primary {
      display: inline-flex; align-items: center; gap: 6px;
      height: 36px; padding: 0 14px;
      background: var(--n-900, #161b26); color: #fff; border: none;
      border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; font-family: inherit;
      transition: background 120ms ease;
    }
    .btn-primary:hover { background: var(--n-800, #232937); }
    .btn-primary:disabled { opacity: .5; cursor: not-allowed; }
    .btn-primary mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .btn-cancel {
      display: inline-flex; align-items: center; height: 36px; padding: 0 14px;
      background: var(--n-0, #fff); color: var(--text-secondary, #353c4d);
      border: 1px solid var(--border-default, #dfe3eb); border-radius: 8px;
      font-size: 13px; cursor: pointer; font-family: inherit; transition: background 120ms ease;
    }
    .btn-cancel:hover { background: var(--n-50, #f7f8fa); }

    .table-card { background: var(--n-0, #fff); border: 1px solid var(--border-subtle, #e9ecf2); border-radius: 12px; overflow: hidden; }
    .table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
    .table th {
      text-align: left; font-size: 11.5px; font-weight: 500;
      color: var(--text-tertiary, #6b7386); letter-spacing: 0.04em; text-transform: uppercase;
      padding: 12px 16px; border-bottom: 1px solid var(--border-subtle, #e9ecf2);
      background: var(--n-25, #fcfcfd); white-space: nowrap;
    }
    .table-row td { padding: 12px 16px; border-bottom: 1px solid var(--border-subtle, #e9ecf2); color: var(--text-secondary, #353c4d); vertical-align: middle; }
    .table-row:last-child td { border-bottom: none; }
    .table-row { transition: background 120ms ease; }
    .table-row:hover { background: var(--n-25, #fcfcfd); }
    .row--inactiva { opacity: .5; }

    .badge { display: inline-flex; align-items: center; height: 22px; padding: 0 10px; border-radius: 9999px; font-size: 12.5px; font-weight: 500; }
    .color-swatch { width: 20px; height: 20px; border-radius: 5px; display: inline-block; border: 1px solid rgba(0,0,0,0.08); }
    .status { display: inline-flex; align-items: center; height: 22px; padding: 0 9px; border-radius: 9999px; font-size: 12px; font-weight: 500; background: var(--n-75, #f1f3f7); color: var(--n-600, #4e566a); }
    .status--activo { background: oklch(0.96 0.035 155); color: oklch(0.42 0.120 155); }

    .col-actions { display: flex; gap: 4px; justify-content: flex-end; }
    .icon-btn { width: 30px; height: 30px; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; background: none; border: none; color: var(--text-muted, #8a92a3); cursor: pointer; font-family: inherit; transition: background 120ms ease, color 120ms ease; }
    .icon-btn:hover { background: var(--n-75, #f1f3f7); color: var(--text-primary, #161b26); }
    .icon-btn--danger:hover { background: oklch(0.95 0.035 25); color: oklch(0.45 0.150 25); }
    .icon-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .loading-state, .empty-state { display: flex; flex-direction: column; align-items: center; padding: 48px; gap: 12px; color: var(--text-muted, #8a92a3); }
    .empty-state mat-icon { font-size: 40px; width: 40px; height: 40px; }
    .spinner { width: 28px; height: 28px; border: 3px solid var(--border-subtle, #e9ecf2); border-top-color: oklch(0.55 0.190 259); border-radius: 50%; animation: spin .8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `],
})
export class UnidadesNegocioAdminComponent implements OnInit {
  private readonly svc = inject(UnidadesNegocioService);

  readonly unidades = signal<UnidadNegocio[]>([]);
  readonly loading = signal(true);
  readonly editando = signal<UnidadNegocio | null>(null);

  readonly colores = COLORES;
  nombre = '';
  color = '#3b82f6';

  ngOnInit(): void { this.cargar(); }

  cargar(): void {
    this.loading.set(true);
    this.svc.getAll().subscribe({
      next: (data) => { this.unidades.set(data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  guardar(): void {
    const u = this.editando();
    if (u) {
      this.svc.actualizar(u.id, this.nombre, this.color, u.activo).subscribe(() => {
        this.cancelarEdicion(); this.cargar();
      });
    } else {
      this.svc.crear(this.nombre, this.color).subscribe(() => {
        this.nombre = ''; this.color = '#3b82f6'; this.cargar();
      });
    }
  }

  editar(u: UnidadNegocio): void { this.editando.set(u); this.nombre = u.nombre; this.color = u.color; }
  cancelarEdicion(): void { this.editando.set(null); this.nombre = ''; this.color = '#3b82f6'; }
  toggleActivo(u: UnidadNegocio): void {
    this.svc.actualizar(u.id, u.nombre, u.color, !u.activo).subscribe(() => this.cargar());
  }
}
