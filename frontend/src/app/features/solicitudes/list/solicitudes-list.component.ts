import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { SolicitudesService } from '../../../core/services/solicitudes.service';
import { SignalRService } from '../../../core/services/signalr.service';
import { Solicitud, EstadoSolicitud, ESTADO_LABELS, PRIORIDAD_LABELS } from '../../../core/models/solicitud.model';

@Component({
  selector: 'app-solicitudes-list',
  standalone: true,
  imports: [DatePipe, MatIconModule],
  template: `
    <!-- Page header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Solicitudes</h1>
        <p class="page-subtitle">{{ solicitudes().length }} solicitudes activas</p>
      </div>
      <button class="btn-primary" (click)="nueva()">
        <mat-icon>add</mat-icon>
        Nueva solicitud
      </button>
    </div>

    <!-- Stats row -->
    <div class="stats-row">
      @for (stat of stats(); track stat.label) {
        <div class="stat-card">
          <p class="stat-value">{{ stat.value }}</p>
          <p class="stat-label">{{ stat.label }}</p>
        </div>
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
          <p>No hay solicitudes aún</p>
          <button class="btn-primary" (click)="nueva()">Crear la primera</button>
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
      }
    </div>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; flex: 1; padding: 32px; gap: 24px; }

    /* Header */
    .page-header { display: flex; align-items: flex-start; justify-content: space-between; }
    .page-title { font-size: 22px; font-weight: 700; color: #0f172a; margin: 0; }
    .page-subtitle { font-size: 13px; color: #64748b; margin: 4px 0 0; }

    /* Button */
    .btn-primary {
      display: flex; align-items: center; gap: 6px;
      background: #3b82f6; color: #fff;
      border: none; border-radius: 8px;
      padding: 9px 16px; font-size: 14px; font-weight: 500;
      cursor: pointer; transition: background .15s;
    }
    .btn-primary:hover { background: #2563eb; }
    .btn-primary mat-icon { font-size: 18px; width: 18px; height: 18px; }

    /* Stats */
    .stats-row { display: flex; gap: 16px; }
    .stat-card {
      flex: 1; background: #fff; border-radius: 12px;
      padding: 16px 20px; box-shadow: 0 1px 3px rgba(0,0,0,.08);
    }
    .stat-value { font-size: 28px; font-weight: 700; color: #0f172a; margin: 0; }
    .stat-label { font-size: 12px; color: #64748b; margin: 4px 0 0; }

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

    /* Badges estado */
    .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 500; }
    .badge--estado-1 { background: #fff7ed; color: #c2410c; }
    .badge--estado-2 { background: #eff6ff; color: #1d4ed8; }
    .badge--estado-3 { background: #f0fdf4; color: #15803d; }
    .badge--estado-4 { background: #f5f3ff; color: #7c3aed; }
    .badge--estado-5 { background: #fef2f2; color: #b91c1c; }

    /* Badges prioridad */
    .badge--prioridad-1 { background: #f1f5f9; color: #475569; }
    .badge--prioridad-2 { background: #fefce8; color: #854d0e; }
    .badge--prioridad-3 { background: #fff7ed; color: #c2410c; }
    .badge--prioridad-4 { background: #fef2f2; color: #991b1b; }

    /* States */
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
  `],
})
export class SolicitudesListComponent implements OnInit {
  private readonly svc = inject(SolicitudesService);
  private readonly signalr = inject(SignalRService);
  private readonly router = inject(Router);

  readonly solicitudes = signal<Solicitud[]>([]);
  readonly loading = signal(true);

  readonly stats = signal<{ label: string; value: number }[]>([]);

  ngOnInit(): void {
    this.cargar();
    this.signalr.connect('00000000-0000-0000-0000-000000000002');
    this.signalr.estadoCambiado$.subscribe(() => this.cargar());
  }

  cargar(): void {
    this.loading.set(true);
    this.svc.getAll().subscribe({
      next: (data) => {
        this.solicitudes.set(data);
        this.calcularStats(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  calcularStats(data: Solicitud[]): void {
    this.stats.set([
      { label: 'Total', value: data.length },
      { label: 'Pendientes', value: data.filter(s => s.estado === EstadoSolicitud.Pendiente).length },
      { label: 'En desarrollo', value: data.filter(s => s.estado === EstadoSolicitud.EnDesarrollo).length },
      { label: 'Completadas', value: data.filter(s => s.estado === EstadoSolicitud.Completada).length },
    ]);
  }

  nueva(): void { this.router.navigate(['/solicitudes/nueva']); }
  ver(id: string): void { this.router.navigate(['/solicitudes', id]); }
  estadoLabel(s: Solicitud): string { return ESTADO_LABELS[s.estado] ?? ''; }
  prioridadLabel(s: Solicitud): string { return PRIORIDAD_LABELS[s.prioridad] ?? ''; }
}
