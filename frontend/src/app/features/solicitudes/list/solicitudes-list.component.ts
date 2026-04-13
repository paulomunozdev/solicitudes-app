import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { debounceTime, distinctUntilChanged, Subject, switchMap } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { SolicitudesService } from '../../../core/services/solicitudes.service';
import { SignalRService } from '../../../core/services/signalr.service';
import { Solicitud, EstadoSolicitud, ESTADO_LABELS, PRIORIDAD_LABELS } from '../../../core/models/solicitud.model';

@Component({
  selector: 'app-solicitudes-list',
  standalone: true,
  imports: [DatePipe, MatIconModule, FormsModule],
  template: `
    <!-- Page header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Solicitudes</h1>
        <p class="page-subtitle">{{ total() }} solicitudes encontradas</p>
      </div>
      <button class="btn-primary" (click)="nueva()">
        <mat-icon>add</mat-icon>
        Nueva solicitud
      </button>
    </div>

    <!-- Filters -->
    <div class="filters-bar">
      <div class="search-wrap">
        <mat-icon class="search-icon">search</mat-icon>
        <input class="search-input" type="text" placeholder="Buscar solicitud..."
               [(ngModel)]="busqueda" (ngModelChange)="onBusqueda($event)" />
        @if (busqueda) {
          <button class="clear-btn" (click)="clearBusqueda()"><mat-icon>close</mat-icon></button>
        }
      </div>

      <select class="filter-select" [(ngModel)]="filtroEstado" (ngModelChange)="onFiltro()">
        <option [ngValue]="null">Todos los estados</option>
        <option [ngValue]="1">Pendiente</option>
        <option [ngValue]="2">En Revisión</option>
        <option [ngValue]="3">En Desarrollo</option>
        <option [ngValue]="4">Completada</option>
        <option [ngValue]="5">Rechazada</option>
      </select>

      <select class="filter-select" [(ngModel)]="filtroPrioridad" (ngModelChange)="onFiltro()">
        <option [ngValue]="null">Todas las prioridades</option>
        <option [ngValue]="1">Baja</option>
        <option [ngValue]="2">Media</option>
        <option [ngValue]="3">Alta</option>
        <option [ngValue]="4">Crítica</option>
      </select>

      @if (filtroEstado || filtroPrioridad || busqueda) {
        <button class="btn-clear-all" (click)="clearFiltros()">
          <mat-icon>filter_alt_off</mat-icon>
          Limpiar filtros
        </button>
      }
    </div>

    <!-- Table -->
    <div class="table-card">
      @if (loading()) {
        <div class="loading-state">
          <div class="spinner"></div>
          <p>Cargando solicitudes...</p>
        </div>
      } @else if (solicitudes().length === 0) {
        <div class="empty-state">
          <mat-icon>inbox</mat-icon>
          <p>No hay solicitudes que coincidan</p>
          @if (filtroEstado || filtroPrioridad || busqueda) {
            <button class="btn-primary" (click)="clearFiltros()">Limpiar filtros</button>
          } @else {
            <button class="btn-primary" (click)="nueva()">Crear la primera</button>
          }
        </div>
      } @else {
        <table class="table">
          <thead>
            <tr>
              <th>Título</th>
              <th>Estado</th>
              <th>Prioridad</th>
              <th>Solicitante</th>
              <th>Fecha</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (s of solicitudes(); track s.id) {
              <tr class="table-row" (click)="ver(s.id)">
                <td class="col-titulo">{{ s.titulo }}</td>
                <td><span class="badge badge--estado-{{ s.estado }}">{{ estadoLabel(s) }}</span></td>
                <td><span class="badge badge--prioridad-{{ s.prioridad }}">{{ prioridadLabel(s) }}</span></td>
                <td class="col-muted">{{ s.usuarioCreadorNombre }}</td>
                <td class="col-muted">{{ s.creadoEn | date:'dd/MM/yy HH:mm' }}</td>
                <td class="col-action"><mat-icon>chevron_right</mat-icon></td>
              </tr>
            }
          </tbody>
        </table>

        <!-- Pagination -->
        @if (totalPages() > 1) {
          <div class="pagination">
            <button class="page-btn" [disabled]="page() === 1" (click)="goPage(page() - 1)">
              <mat-icon>chevron_left</mat-icon>
            </button>
            @for (p of pageNumbers(); track p) {
              <button class="page-btn" [class.page-btn--active]="p === page()" (click)="goPage(p)">
                {{ p }}
              </button>
            }
            <button class="page-btn" [disabled]="page() === totalPages()" (click)="goPage(page() + 1)">
              <mat-icon>chevron_right</mat-icon>
            </button>
            <span class="page-info">{{ (page()-1)*pageSize + 1 }}–{{ min(page()*pageSize, total()) }} de {{ total() }}</span>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; flex: 1; padding: 32px; gap: 20px; }

    .page-header { display: flex; align-items: flex-start; justify-content: space-between; }
    .page-title { font-size: 22px; font-weight: 700; color: #0f172a; margin: 0; }
    .page-subtitle { font-size: 13px; color: #64748b; margin: 4px 0 0; }

    .btn-primary {
      display: flex; align-items: center; gap: 6px;
      background: #3b82f6; color: #fff;
      border: none; border-radius: 8px;
      padding: 9px 16px; font-size: 14px; font-weight: 500;
      cursor: pointer; transition: background .15s;
    }
    .btn-primary:hover { background: #2563eb; }
    .btn-primary mat-icon { font-size: 18px; width: 18px; height: 18px; }

    /* Filters */
    .filters-bar {
      display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
    }
    .search-wrap {
      display: flex; align-items: center; gap: 8px;
      background: #fff; border: 1px solid #e2e8f0; border-radius: 8px;
      padding: 0 10px; flex: 1; min-width: 220px;
    }
    .search-icon { color: #94a3b8; font-size: 18px; width: 18px; height: 18px; }
    .search-input {
      flex: 1; border: none; outline: none;
      font-size: 14px; color: #1e293b; padding: 9px 0;
      background: transparent;
    }
    .clear-btn {
      background: none; border: none; cursor: pointer; color: #94a3b8;
      display: flex; align-items: center; padding: 0;
    }
    .clear-btn mat-icon { font-size: 16px; width: 16px; height: 16px; }

    .filter-select {
      border: 1px solid #e2e8f0; border-radius: 8px;
      padding: 9px 12px; font-size: 13px; color: #374151;
      background: #fff; cursor: pointer; outline: none;
    }
    .btn-clear-all {
      display: flex; align-items: center; gap: 6px;
      background: none; border: 1px solid #e2e8f0; border-radius: 8px;
      padding: 9px 12px; font-size: 13px; color: #64748b;
      cursor: pointer; white-space: nowrap;
    }
    .btn-clear-all:hover { background: #f8fafc; }
    .btn-clear-all mat-icon { font-size: 16px; width: 16px; height: 16px; }

    /* Table card */
    .table-card {
      background: #fff; border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,.08);
      overflow: hidden;
    }
    .table { width: 100%; border-collapse: collapse; }
    .table th {
      text-align: left; padding: 12px 16px;
      font-size: 11px; font-weight: 600; color: #64748b;
      text-transform: uppercase; letter-spacing: .6px;
      background: #f8fafc; border-bottom: 1px solid #e2e8f0;
    }
    .table-row td { padding: 14px 16px; border-bottom: 1px solid #f1f5f9; }
    .table-row:last-child td { border-bottom: none; }
    .table-row { cursor: pointer; transition: background .1s; }
    .table-row:hover { background: #f8fafc; }
    .col-titulo { font-size: 14px; font-weight: 500; color: #1e293b; max-width: 300px; }
    .col-muted { font-size: 13px; color: #64748b; }
    .col-action { color: #cbd5e1; text-align: right; }

    .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 500; }
    .badge--estado-1 { background: #fff7ed; color: #c2410c; }
    .badge--estado-2 { background: #eff6ff; color: #1d4ed8; }
    .badge--estado-3 { background: #f0fdf4; color: #15803d; }
    .badge--estado-4 { background: #f5f3ff; color: #7c3aed; }
    .badge--estado-5 { background: #fef2f2; color: #b91c1c; }
    .badge--prioridad-1 { background: #f1f5f9; color: #475569; }
    .badge--prioridad-2 { background: #fefce8; color: #854d0e; }
    .badge--prioridad-3 { background: #fff7ed; color: #c2410c; }
    .badge--prioridad-4 { background: #fef2f2; color: #991b1b; }

    .loading-state, .empty-state {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; padding: 64px; gap: 12px; color: #94a3b8;
    }
    .empty-state mat-icon { font-size: 48px; width: 48px; height: 48px; }
    .spinner {
      width: 32px; height: 32px; border: 3px solid #e2e8f0;
      border-top-color: #3b82f6; border-radius: 50%;
      animation: spin .8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Pagination */
    .pagination {
      display: flex; align-items: center; gap: 4px;
      padding: 12px 16px; border-top: 1px solid #f1f5f9;
    }
    .page-btn {
      min-width: 32px; height: 32px; padding: 0 8px;
      border: 1px solid #e2e8f0; border-radius: 6px;
      background: #fff; cursor: pointer; font-size: 13px; color: #374151;
      display: flex; align-items: center; justify-content: center;
      transition: all .15s;
    }
    .page-btn:hover:not(:disabled) { background: #f8fafc; border-color: #cbd5e1; }
    .page-btn:disabled { opacity: .4; cursor: not-allowed; }
    .page-btn--active { background: #3b82f6; color: #fff; border-color: #3b82f6; }
    .page-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .page-info { margin-left: auto; font-size: 12px; color: #94a3b8; }
  `],
})
export class SolicitudesListComponent implements OnInit {
  private readonly svc = inject(SolicitudesService);
  private readonly signalr = inject(SignalRService);
  private readonly router = inject(Router);
  private readonly busqueda$ = new Subject<string>();

  readonly solicitudes = signal<Solicitud[]>([]);
  readonly loading = signal(true);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = 10;
  readonly totalPages = computed(() => Math.ceil(this.total() / this.pageSize));
  readonly pageNumbers = computed(() => {
    const t = this.totalPages();
    const p = this.page();
    const start = Math.max(1, p - 2);
    const end = Math.min(t, start + 4);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  });

  busqueda = '';
  filtroEstado: number | null = null;
  filtroPrioridad: number | null = null;

  ngOnInit(): void {
    this.busqueda$.pipe(debounceTime(350), distinctUntilChanged()).subscribe(() => {
      this.page.set(1);
      this.cargar();
    });

    this.cargar();
    this.signalr.connect('00000000-0000-0000-0000-000000000002');
    this.signalr.estadoCambiado$.subscribe(() => this.cargar());
  }

  cargar(): void {
    this.loading.set(true);
    this.svc.getAll({
      estado:    this.filtroEstado ?? undefined,
      prioridad: this.filtroPrioridad ?? undefined,
      busqueda:  this.busqueda || undefined,
      page:      this.page(),
      pageSize:  this.pageSize,
    }).subscribe({
      next: (r: any) => {
        const items = Array.isArray(r) ? r : (r.items ?? []);
        const total = Array.isArray(r) ? r.length : (r.total ?? 0);
        this.solicitudes.set(items);
        this.total.set(total);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onBusqueda(value: string): void { this.busqueda$.next(value); }
  onFiltro(): void { this.page.set(1); this.cargar(); }
  goPage(p: number): void { this.page.set(p); this.cargar(); }

  clearBusqueda(): void { this.busqueda = ''; this.page.set(1); this.cargar(); }
  clearFiltros(): void {
    this.busqueda = ''; this.filtroEstado = null; this.filtroPrioridad = null;
    this.page.set(1); this.cargar();
  }

  min(a: number, b: number): number { return Math.min(a, b); }

  nueva(): void { this.router.navigate(['/solicitudes/nueva']); }
  ver(id: string): void { this.router.navigate(['/solicitudes', id]); }
  estadoLabel(s: Solicitud): string { return ESTADO_LABELS[s.estado] ?? ''; }
  prioridadLabel(s: Solicitud): string { return PRIORIDAD_LABELS[s.prioridad] ?? ''; }
}
