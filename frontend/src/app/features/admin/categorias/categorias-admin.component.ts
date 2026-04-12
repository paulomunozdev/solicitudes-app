import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { CategoriasService, Categoria } from '../../../core/services/categorias.service';

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
  { label: 'Lima',     value: '#84cc16' },
];

@Component({
  selector: 'app-categorias-admin',
  standalone: true,
  imports: [FormsModule, MatIconModule],
  template: `
    <div class="page-header">
      <div>
        <h1 class="page-title">Categorías</h1>
        <p class="page-subtitle">Administra las categorías disponibles para las solicitudes</p>
      </div>
    </div>

    <!-- Formulario nueva/editar -->
    <div class="form-card">
      <h2 class="form-title">{{ editando() ? 'Editar categoría' : 'Nueva categoría' }}</h2>
      <div class="form-row">
        <input class="input" type="text" placeholder="Nombre de la categoría"
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

    <!-- Lista -->
    <div class="table-card">
      @if (loading()) {
        <div class="loading-state">
          <div class="spinner"></div>
        </div>
      } @else if (categorias().length === 0) {
        <div class="empty-state">
          <mat-icon>label_off</mat-icon>
          <p>No hay categorías aún</p>
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
            @for (cat of categorias(); track cat.id) {
              <tr class="table-row" [class.row--inactiva]="!cat.activo">
                <td>
                  <span class="cat-badge" [style.background]="cat.color + '20'" [style.color]="cat.color">
                    {{ cat.nombre }}
                  </span>
                </td>
                <td>
                  <div class="color-swatch" [style.background]="cat.color" [title]="cat.color"></div>
                </td>
                <td>
                  <span class="status-badge" [class.status-badge--activo]="cat.activo">
                    {{ cat.activo ? 'Activa' : 'Inactiva' }}
                  </span>
                </td>
                <td class="col-actions">
                  <button class="icon-btn" (click)="editar(cat)" title="Editar">
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button class="icon-btn icon-btn--danger" (click)="toggleActivo(cat)"
                          [title]="cat.activo ? 'Desactivar' : 'Activar'">
                    <mat-icon>{{ cat.activo ? 'visibility_off' : 'visibility' }}</mat-icon>
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
    :host { display: flex; flex-direction: column; flex: 1; padding: 32px; gap: 20px; }

    .page-title { font-size: 22px; font-weight: 700; color: #0f172a; margin: 0; }
    .page-subtitle { font-size: 13px; color: #64748b; margin: 4px 0 0; }

    .form-card {
      background: #fff; border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,.08); padding: 20px 24px;
    }
    .form-title { font-size: 14px; font-weight: 600; color: #374151; margin: 0 0 16px; }
    .form-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }

    .input {
      border: 1px solid #e2e8f0; border-radius: 8px;
      padding: 9px 12px; font-size: 14px; color: #1e293b;
      outline: none; width: 240px;
    }
    .input:focus { border-color: #3b82f6; }

    .color-picker { display: flex; gap: 6px; align-items: center; }
    .color-dot {
      width: 24px; height: 24px; border-radius: 50%;
      border: 2px solid transparent; cursor: pointer;
      transition: transform .15s, border-color .15s;
    }
    .color-dot:hover { transform: scale(1.15); }
    .color-dot--active { border-color: #0f172a; transform: scale(1.15); }

    .preview-badge {
      padding: 4px 12px; border-radius: 20px;
      font-size: 13px; font-weight: 500; white-space: nowrap;
    }

    .btn-primary {
      display: flex; align-items: center; gap: 6px;
      background: #3b82f6; color: #fff; border: none;
      border-radius: 8px; padding: 9px 16px;
      font-size: 14px; font-weight: 500; cursor: pointer;
    }
    .btn-primary:disabled { opacity: .5; cursor: not-allowed; }
    .btn-primary mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .btn-cancel {
      background: none; border: 1px solid #e2e8f0; border-radius: 8px;
      padding: 9px 14px; font-size: 14px; color: #64748b; cursor: pointer;
    }

    /* Table */
    .table-card {
      background: #fff; border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,.08); overflow: hidden;
    }
    .table { width: 100%; border-collapse: collapse; }
    .table th {
      text-align: left; padding: 12px 16px;
      font-size: 11px; font-weight: 600; color: #64748b;
      text-transform: uppercase; letter-spacing: .6px;
      background: #f8fafc; border-bottom: 1px solid #e2e8f0;
    }
    .table-row td { padding: 12px 16px; border-bottom: 1px solid #f1f5f9; }
    .table-row:last-child td { border-bottom: none; }
    .row--inactiva { opacity: .5; }

    .cat-badge { padding: 3px 10px; border-radius: 20px; font-size: 13px; font-weight: 500; }
    .color-swatch { width: 20px; height: 20px; border-radius: 50%; }

    .status-badge {
      padding: 2px 8px; border-radius: 20px; font-size: 12px; font-weight: 500;
      background: #f1f5f9; color: #64748b;
    }
    .status-badge--activo { background: #dcfce7; color: #15803d; }

    .col-actions { display: flex; gap: 4px; justify-content: flex-end; }
    .icon-btn {
      background: none; border: none; cursor: pointer; color: #64748b;
      padding: 6px; border-radius: 6px; display: flex;
    }
    .icon-btn:hover { background: #f1f5f9; }
    .icon-btn--danger:hover { background: #fef2f2; color: #ef4444; }
    .icon-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .loading-state, .empty-state {
      display: flex; flex-direction: column; align-items: center;
      padding: 48px; gap: 12px; color: #94a3b8;
    }
    .empty-state mat-icon { font-size: 40px; width: 40px; height: 40px; }
    .spinner {
      width: 28px; height: 28px; border: 3px solid #e2e8f0;
      border-top-color: #3b82f6; border-radius: 50%;
      animation: spin .8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `],
})
export class CategoriasAdminComponent implements OnInit {
  private readonly svc = inject(CategoriasService);

  readonly categorias = signal<Categoria[]>([]);
  readonly loading = signal(true);
  readonly editando = signal<Categoria | null>(null);

  readonly colores = COLORES;
  nombre = '';
  color = '#3b82f6';

  ngOnInit(): void { this.cargar(); }

  cargar(): void {
    this.loading.set(true);
    this.svc.getAll().subscribe({
      next: (data) => { this.categorias.set(data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  guardar(): void {
    const cat = this.editando();
    if (cat) {
      this.svc.actualizar(cat.id, this.nombre, this.color, cat.activo).subscribe(() => {
        this.cancelarEdicion();
        this.cargar();
      });
    } else {
      this.svc.crear(this.nombre, this.color).subscribe(() => {
        this.nombre = '';
        this.color = '#3b82f6';
        this.cargar();
      });
    }
  }

  editar(cat: Categoria): void {
    this.editando.set(cat);
    this.nombre = cat.nombre;
    this.color = cat.color;
  }

  cancelarEdicion(): void {
    this.editando.set(null);
    this.nombre = '';
    this.color = '#3b82f6';
  }

  toggleActivo(cat: Categoria): void {
    this.svc.actualizar(cat.id, cat.nombre, cat.color, !cat.activo)
      .subscribe(() => this.cargar());
  }
}
