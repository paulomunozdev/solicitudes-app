import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { debounceTime, distinctUntilChanged, Subject, switchMap } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { SolicitudesService } from '../../../core/services/solicitudes.service';
import { SignalRService } from '../../../core/services/signalr.service';
import { AuthService } from '../../../core/services/auth.service';
import { Solicitud, ESTADO_LABELS, PRIORIDAD_LABELS } from '../../../core/models/solicitud.model';

type Vista = 'todas' | 'mias' | 'pendientes' | 'activas' | 'cerradas' | 'asignadas';

interface TabConfig {
  id: Vista;
  label: string;
  icon: string;
  soloGestor?: boolean;
}

const TABS: TabConfig[] = [
  { id: 'todas',     label: 'Todas',           icon: 'inbox'          },
  { id: 'mias',      label: 'Mis solicitudes',  icon: 'person'         },
  { id: 'pendientes',label: 'Pendientes',       icon: 'schedule'       },
  { id: 'activas',   label: 'Activas',          icon: 'autorenew'      },
  { id: 'cerradas',  label: 'Cerradas',         icon: 'check_circle'   },
  { id: 'asignadas', label: 'Asignadas a mí',   icon: 'assignment_ind', soloGestor: true },
];

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
      <div class="header-actions">
        <button class="btn-secondary" (click)="exportar()" [disabled]="exportando()" title="Exportar a Excel">
          @if (exportando()) { <span class="btn-spinner-dark"></span> } @else { <mat-icon>download</mat-icon> }
          Exportar
        </button>
        <button class="btn-primary" (click)="nueva()">
          <mat-icon>add</mat-icon>
          Nueva solicitud
        </button>
      </div>
    </div>

    <!-- Tabs / Vistas -->
    <div class="tabs-bar">
      @for (tab of visibleTabs(); track tab.id) {
        <button class="tab-btn" [class.tab-btn--active]="vista() === tab.id"
          (click)="cambiarVista(tab.id)">
          <mat-icon>{{ tab.icon }}</mat-icon>
          {{ tab.label }}
        </button>
      }
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

      <select class="filter-select" [(ngModel)]="filtroPrioridad" (ngModelChange)="onFiltro()">
        <option [ngValue]="null">Todas las prioridades</option>
        <option [ngValue]="1">Baja</option>
        <option [ngValue]="2">Media</option>
        <option [ngValue]="3">Alta</option>
        <option [ngValue]="4">Crítica</option>
      </select>

      @if (filtroPrioridad || busqueda) {
        <button class="btn-clear-all" (click)="clearFiltros()">
          <mat-icon>filter_alt_off</mat-icon>
          Limpiar
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
          <p>{{ emptyMessage() }}</p>
          @if (vista() !== 'todas' || filtroPrioridad || busqueda) {
            <button class="btn-primary" (click)="resetVista()">Ver todas</button>
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
              <th>Ingresado por</th>
              <th>Fecha</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (s of solicitudes(); track s.id) {
              <tr class="table-row" (click)="ver(s.id)">
                <td class="col-titulo">
                  {{ s.titulo }}
                  @if (s.nombreSolicitante && s.nombreSolicitante !== s.usuarioCreadorNombre) {
                    <span class="solicitante-tag">{{ s.nombreSolicitante }}</span>
                  }
                </td>
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
    :host { display: block; padding: 28px 32px; max-width: var(--content-max, 1400px); margin: 0 auto; width: 100%; }

    .page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 24px; }
    .page-title { font-size: 22px; font-weight: 600; color: var(--text-primary, #161b26); letter-spacing: -0.015em; }
    .page-subtitle { font-size: 13px; color: var(--text-tertiary, #6b7386); margin-top: 2px; font-variant-numeric: tabular-nums; }
    .header-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

    .btn-secondary {
      display: inline-flex; align-items: center; gap: 6px; height: 36px; padding: 0 14px;
      background: var(--n-0, #fff); color: var(--text-primary, #161b26);
      border: 1px solid var(--border-default, #dfe3eb); border-radius: 8px;
      font-size: 13.5px; font-weight: 500; cursor: pointer; font-family: inherit;
      transition: background 120ms ease, border-color 120ms ease;
    }
    .btn-secondary:hover:not(:disabled) { background: var(--n-50, #f7f8fa); border-color: var(--border-strong, #cfd4de); }
    .btn-secondary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-secondary mat-icon { font-size: 17px; width: 17px; height: 17px; }
    .btn-spinner-dark {
      width: 14px; height: 14px; border: 2px solid currentColor;
      border-top-color: transparent; border-radius: 50%;
      animation: spin 0.7s linear infinite; opacity: 0.8;
    }
    .btn-primary {
      display: inline-flex; align-items: center; gap: 6px; height: 36px; padding: 0 14px;
      background: var(--n-900, #161b26); color: #fff;
      border: 1px solid var(--n-900, #161b26); border-radius: 8px;
      font-size: 13.5px; font-weight: 500; cursor: pointer; font-family: inherit;
      transition: background 120ms ease;
    }
    .btn-primary:hover { background: var(--n-800, #232937); }
    .btn-primary mat-icon { font-size: 17px; width: 17px; height: 17px; }

    /* Tabs */
    .tabs-bar {
      display: flex; gap: 0; border-bottom: 1px solid var(--border-subtle, #e9ecf2);
      margin-bottom: 20px; overflow-x: auto; scrollbar-width: none;
    }
    .tabs-bar::-webkit-scrollbar { display: none; }
    .tab-btn {
      display: inline-flex; align-items: center; gap: 7px;
      padding: 10px 14px 12px; font-size: 13.5px; font-weight: 500;
      color: var(--text-tertiary, #6b7386);
      border-bottom: 2px solid transparent; margin-bottom: -1px;
      white-space: nowrap; cursor: pointer; background: none;
      border-top: none; border-left: none; border-right: none;
      font-family: inherit; transition: color 120ms ease, border-color 120ms ease;
    }
    .tab-btn:hover { color: var(--text-primary, #161b26); }
    .tab-btn--active { color: var(--text-primary, #161b26); border-bottom-color: var(--n-900, #161b26); }
    .tab-btn mat-icon { font-size: 16px; width: 16px; height: 16px; }

    /* Filters */
    .filters-bar { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
    .search-wrap {
      position: relative; display: flex; align-items: center;
      flex: 1; min-width: 220px; max-width: 360px;
    }
    .search-icon {
      position: absolute; left: 10px; font-size: 17px; width: 17px; height: 17px;
      color: var(--text-muted, #8a92a3); pointer-events: none;
    }
    .search-input {
      width: 100%; height: 36px; padding: 0 34px;
      background: var(--n-0, #fff); border: 1px solid var(--border-default, #dfe3eb);
      border-radius: 8px; font-size: 13.5px; color: var(--text-primary, #161b26);
      outline: none; font-family: inherit;
      transition: border-color 120ms ease, box-shadow 120ms ease;
    }
    .search-input::placeholder { color: var(--text-muted, #8a92a3); }
    .search-input:hover { border-color: var(--border-strong, #cfd4de); }
    .search-input:focus { border-color: oklch(0.55 0.190 259); box-shadow: 0 0 0 3px oklch(0.78 0.130 259 / 0.20); }
    .clear-btn {
      position: absolute; right: 6px; width: 22px; height: 22px;
      display: flex; align-items: center; justify-content: center;
      border-radius: 5px; background: none; border: none;
      color: var(--text-muted, #8a92a3); cursor: pointer; font-family: inherit;
      transition: background 120ms ease, color 120ms ease;
    }
    .clear-btn:hover { background: var(--n-100, #e9ecf2); color: var(--text-primary, #161b26); }
    .clear-btn mat-icon { font-size: 15px; width: 15px; height: 15px; }
    .filter-select {
      height: 36px; padding: 0 30px 0 10px;
      background: var(--n-0, #fff); border: 1px solid var(--border-default, #dfe3eb);
      border-radius: 8px; font-size: 13.5px; color: var(--text-primary, #161b26);
      outline: none; cursor: pointer; font-family: inherit; appearance: none;
      background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%236b7386' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
      background-repeat: no-repeat; background-position: right 10px center;
      transition: border-color 120ms ease;
    }
    .filter-select:hover { border-color: var(--border-strong, #cfd4de); }
    .btn-clear-all {
      height: 36px; padding: 0 12px; border-radius: 8px; font-size: 13px; font-weight: 500;
      color: var(--text-tertiary, #6b7386); background: none; border: 1px solid transparent;
      cursor: pointer; font-family: inherit; display: flex; align-items: center; gap: 6px;
      transition: background 120ms ease, color 120ms ease;
    }
    .btn-clear-all:hover { background: var(--n-75, #f1f3f7); color: var(--text-primary, #161b26); }
    .btn-clear-all mat-icon { font-size: 16px; width: 16px; height: 16px; }

    /* Table */
    .table-card { background: var(--n-0, #fff); border: 1px solid var(--border-subtle, #e9ecf2); border-radius: 12px; overflow: hidden; }
    .table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
    .table th {
      text-align: left; padding: 12px 16px;
      font-size: 11.5px; font-weight: 500; color: var(--text-tertiary, #6b7386);
      text-transform: uppercase; letter-spacing: 0.04em;
      background: var(--n-25, #fcfcfd); border-bottom: 1px solid var(--border-subtle, #e9ecf2); white-space: nowrap;
    }
    .table-row td { padding: var(--cell-pad-y, 12px) 16px; border-bottom: 1px solid var(--border-subtle, #e9ecf2); color: var(--text-secondary, #353c4d); vertical-align: middle; height: var(--row-h, 52px); }
    .table-row:last-child td { border-bottom: none; }
    .table-row { cursor: pointer; transition: background 120ms ease; }
    .table-row:hover { background: var(--n-25, #fcfcfd); }
    .col-titulo { font-weight: 500; color: var(--text-primary, #161b26); max-width: 320px; }
    .col-titulo span { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .col-muted { font-size: 12.5px; color: var(--text-tertiary, #6b7386); font-variant-numeric: tabular-nums; white-space: nowrap; }
    .col-action { width: 32px; text-align: right; color: var(--text-muted, #8a92a3); }
    .col-action mat-icon { font-size: 18px; width: 18px; height: 18px; transition: transform 120ms ease; }
    .table-row:hover .col-action mat-icon { transform: translateX(2px); color: var(--text-secondary, #353c4d); }

    .solicitante-tag {
      display: inline-block; margin-left: 6px;
      background: var(--info-bg, oklch(0.96 0.030 259)); color: var(--info-fg, oklch(0.42 0.160 259));
      border-radius: 4px; padding: 1px 6px; font-size: 11px; font-weight: 500;
    }

    .badge { display: inline-flex; align-items: center; gap: 6px; height: 22px; padding: 0 8px 0 7px; border-radius: 9999px; font-size: 12px; font-weight: 500; white-space: nowrap; border: 1px solid transparent; }
    .badge::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: currentColor; opacity: 0.85; flex-shrink: 0; }
    .badge--estado-1 { color: oklch(0.45 0.130 65);  background: oklch(0.96 0.045 80); }
    .badge--estado-2 { color: oklch(0.42 0.160 259); background: oklch(0.96 0.030 259); }
    .badge--estado-3 { color: oklch(0.42 0.140 295); background: oklch(0.96 0.030 295); }
    .badge--estado-4 { color: oklch(0.42 0.120 155); background: oklch(0.96 0.035 155); }
    .badge--estado-5 { color: oklch(0.45 0.150 25);  background: oklch(0.95 0.035 25); }
    .badge--prioridad-1 { color: var(--n-600, #4e566a); background: var(--n-75, #f1f3f7); border-color: var(--border-default, #dfe3eb); }
    .badge--prioridad-2 { color: oklch(0.42 0.160 259); background: oklch(0.96 0.030 259); }
    .badge--prioridad-3 { color: oklch(0.45 0.130 65);  background: oklch(0.96 0.045 80); }
    .badge--prioridad-4 { color: oklch(0.45 0.150 25);  background: oklch(0.95 0.035 25); }

    .loading-state, .empty-state {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; padding: 64px 24px; gap: 16px; text-align: center;
    }
    .empty-state mat-icon { font-size: 28px; width: 28px; height: 28px; color: var(--text-muted, #8a92a3); }
    .spinner { width: 28px; height: 28px; border: 3px solid var(--border-default, #dfe3eb); border-top-color: oklch(0.55 0.190 259); border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Pagination */
    .pagination { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-top: 1px solid var(--border-subtle, #e9ecf2); font-size: 13px; }
    .page-btn {
      min-width: 30px; height: 30px; padding: 0 8px; border-radius: 6px;
      font-size: 12.5px; font-weight: 500; color: var(--text-secondary, #353c4d);
      font-variant-numeric: tabular-nums; border: none; background: none;
      cursor: pointer; font-family: inherit; display: flex; align-items: center; justify-content: center;
      transition: background 120ms ease, color 120ms ease;
    }
    .page-btn mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .page-btn:hover:not(:disabled):not(.page-btn--active) { background: var(--n-75, #f1f3f7); color: var(--text-primary, #161b26); }
    .page-btn--active { background: var(--n-900, #161b26); color: #fff; }
    .page-btn:disabled { opacity: 0.35; cursor: not-allowed; }
    .page-info { color: var(--text-tertiary, #6b7386); font-variant-numeric: tabular-nums; }
  `],
})
export class SolicitudesListComponent implements OnInit {
  private readonly svc = inject(SolicitudesService);
  private readonly signalr = inject(SignalRService);
  private readonly router = inject(Router);
  private readonly busqueda$ = new Subject<string>();
  readonly auth = inject(AuthService);

  readonly solicitudes = signal<Solicitud[]>([]);
  readonly loading = signal(true);
  readonly exportando = signal(false);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = 10;
  readonly vista = signal<Vista>('todas');
  readonly totalPages = computed(() => Math.ceil(this.total() / this.pageSize));
  readonly pageNumbers = computed(() => {
    const t = this.totalPages();
    const p = this.page();
    const start = Math.max(1, p - 2);
    const end = Math.min(t, start + 4);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  });

  readonly visibleTabs = computed(() =>
    TABS.filter(t => !t.soloGestor || this.auth.isGestor())
  );

  readonly emptyMessage = computed(() => {
    const v = this.vista();
    if (v === 'mias')      return 'No tienes solicitudes creadas';
    if (v === 'pendientes') return 'No hay solicitudes pendientes';
    if (v === 'activas')   return 'No hay solicitudes activas';
    if (v === 'cerradas')  return 'No hay solicitudes cerradas';
    if (v === 'asignadas') return 'No tienes solicitudes asignadas';
    return 'No hay solicitudes que coincidan';
  });

  busqueda = '';
  filtroPrioridad: number | null = null;

  ngOnInit(): void {
    this.busqueda$.pipe(debounceTime(350), distinctUntilChanged()).subscribe(() => {
      this.page.set(1);
      this.cargar();
    });

    this.cargar();
    const tenantId = this.auth.profile()?.tenantId;
    if (tenantId) this.signalr.connect(tenantId);
    this.signalr.estadoCambiado$.subscribe(() => this.cargar());
  }

  cargar(): void {
    this.loading.set(true);
    const v = this.vista();
    this.svc.getAll({
      prioridad:       this.filtroPrioridad ?? undefined,
      busqueda:        this.busqueda || undefined,
      page:            this.page(),
      pageSize:        this.pageSize,
      soloMias:        v === 'mias'      || undefined,
      soloActivas:     v === 'activas'   || undefined,
      soloCerradas:    v === 'cerradas'  || undefined,
      soloAsignadaAMi: v === 'asignadas' || undefined,
      // Para "pendientes" usamos el filtro de estado puntual
      estado:          v === 'pendientes' ? 1 : undefined,
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

  cambiarVista(v: Vista): void {
    this.vista.set(v);
    this.page.set(1);
    this.cargar();
  }

  resetVista(): void {
    this.vista.set('todas');
    this.busqueda = '';
    this.filtroPrioridad = null;
    this.page.set(1);
    this.cargar();
  }

  onBusqueda(value: string): void { this.busqueda$.next(value); }
  onFiltro(): void { this.page.set(1); this.cargar(); }
  goPage(p: number): void { this.page.set(p); this.cargar(); }
  clearBusqueda(): void { this.busqueda = ''; this.page.set(1); this.cargar(); }
  clearFiltros(): void { this.busqueda = ''; this.filtroPrioridad = null; this.page.set(1); this.cargar(); }

  exportar(): void {
    this.exportando.set(true);
    const v = this.vista();
    this.svc.exportarExcel({
      prioridad:    this.filtroPrioridad ?? undefined,
      busqueda:     this.busqueda || undefined,
      soloMias:     v === 'mias'     || undefined,
      soloActivas:  v === 'activas'  || undefined,
      soloCerradas: v === 'cerradas' || undefined,
    }).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `solicitudes_${new Date().toISOString().slice(0,10)}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
        this.exportando.set(false);
      },
      error: () => this.exportando.set(false),
    });
  }

  min(a: number, b: number): number { return Math.min(a, b); }
  nueva(): void { this.router.navigate(['/solicitudes/nueva']); }
  ver(id: string): void { this.router.navigate(['/solicitudes', id]); }
  estadoLabel(s: Solicitud): string { return ESTADO_LABELS[s.estado] ?? ''; }
  prioridadLabel(s: Solicitud): string { return PRIORIDAD_LABELS[s.prioridad] ?? ''; }
}
