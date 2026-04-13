import { Component, OnInit, inject, signal, AfterViewInit, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Chart, registerables } from 'chart.js';
import { SolicitudesService, SolicitudesStats } from '../../core/services/solicitudes.service';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <div class="page-header">
      <div>
        <h1 class="page-title">Dashboard</h1>
        <p class="page-subtitle">Resumen de actividad del tenant</p>
      </div>
    </div>

    @if (loading()) {
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Cargando estadísticas...</p>
      </div>
    } @else if (stats()) {

      <!-- KPI Row 1: Estados -->
      <div class="kpi-row">
        <div class="kpi-card kpi-card--blue" (click)="ir(null)">
          <mat-icon>inbox</mat-icon>
          <div>
            <p class="kpi-value">{{ stats()!.total }}</p>
            <p class="kpi-label">Total</p>
          </div>
        </div>
        <div class="kpi-card kpi-card--orange" (click)="ir(1)">
          <mat-icon>schedule</mat-icon>
          <div>
            <p class="kpi-value">{{ stats()!.pendientes }}</p>
            <p class="kpi-label">Pendientes</p>
          </div>
        </div>
        <div class="kpi-card kpi-card--indigo" (click)="ir(2)">
          <mat-icon>visibility</mat-icon>
          <div>
            <p class="kpi-value">{{ stats()!.enRevision }}</p>
            <p class="kpi-label">En Revisión</p>
          </div>
        </div>
        <div class="kpi-card kpi-card--green" (click)="ir(3)">
          <mat-icon>code</mat-icon>
          <div>
            <p class="kpi-value">{{ stats()!.enDesarrollo }}</p>
            <p class="kpi-label">En Desarrollo</p>
          </div>
        </div>
        <div class="kpi-card kpi-card--purple" (click)="ir(4)">
          <mat-icon>check_circle</mat-icon>
          <div>
            <p class="kpi-value">{{ stats()!.completadas }}</p>
            <p class="kpi-label">Completadas</p>
          </div>
        </div>
      </div>

      <!-- KPI Row 2: Operacional -->
      <div class="kpi-row">
        <div class="kpi-card kpi-card--teal">
          <mat-icon>timer</mat-icon>
          <div>
            <p class="kpi-value">{{ stats()!.tiempoPromedioResolucionDias }}</p>
            <p class="kpi-label">Días promedio resolución</p>
          </div>
        </div>
        <div class="kpi-card" [class]="stats()!.sinAsignar > 0 ? 'kpi-card--red' : 'kpi-card--slate'">
          <mat-icon>assignment_late</mat-icon>
          <div>
            <p class="kpi-value">{{ stats()!.sinAsignar }}</p>
            <p class="kpi-label">Sin asignar</p>
          </div>
        </div>
        <div class="kpi-card kpi-card--slate">
          <mat-icon>cancel</mat-icon>
          <div>
            <p class="kpi-value">{{ stats()!.rechazadas }}</p>
            <p class="kpi-label">Rechazadas</p>
          </div>
        </div>
        <!-- spacers para mantener alineación -->
        <div class="kpi-spacer"></div>
        <div class="kpi-spacer"></div>
      </div>

      <!-- Fila 1: Línea por día + Donut estados -->
      <div class="charts-row">
        <div class="chart-card chart-card--wide">
          <h2 class="chart-title">Solicitudes por día (últimos 30 días)</h2>
          <div class="chart-wrap"><canvas #lineChart></canvas></div>
        </div>
        <div class="chart-card">
          <h2 class="chart-title">Distribución por estado</h2>
          <div class="chart-wrap chart-wrap--center"><canvas #donutChart></canvas></div>
        </div>
      </div>

      <!-- Fila 2: Por BU + Por Categoría -->
      <div class="charts-row">
        <div class="chart-card">
          <h2 class="chart-title">Solicitudes por unidad de negocio</h2>
          @if (stats()!.porBu.length === 0) {
            <p class="chart-empty">Sin datos de unidad de negocio</p>
          } @else {
            <div class="chart-wrap"><canvas #buChart></canvas></div>
          }
        </div>
        <div class="chart-card">
          <h2 class="chart-title">Solicitudes por categoría</h2>
          @if (stats()!.porCategoria.length === 0) {
            <p class="chart-empty">Sin datos de categoría</p>
          } @else {
            <div class="chart-wrap"><canvas #categoriaChart></canvas></div>
          }
        </div>
      </div>

      <!-- Fila 3: Por Prioridad + Por Resolutor -->
      <div class="charts-row">
        <div class="chart-card">
          <h2 class="chart-title">Distribución por prioridad</h2>
          <div class="chart-wrap"><canvas #prioridadChart></canvas></div>
        </div>
        <div class="chart-card chart-card--wide">
          <h2 class="chart-title">Carga por resolutor</h2>
          @if (stats()!.porResolutor.length === 0) {
            <p class="chart-empty">Sin solicitudes asignadas</p>
          } @else {
            <div class="chart-wrap"><canvas #resolutorChart></canvas></div>
          }
        </div>
      </div>

    }
  `,
  styles: [`
    :host { display: flex; flex-direction: column; flex: 1; padding: 32px; gap: 20px; overflow-y: auto; }

    .page-header { display: flex; align-items: flex-start; justify-content: space-between; }
    .page-title { font-size: 22px; font-weight: 700; color: #0f172a; margin: 0; }
    .page-subtitle { font-size: 13px; color: #64748b; margin: 4px 0 0; }

    /* KPIs */
    .kpi-row { display: flex; gap: 14px; flex-wrap: wrap; }
    .kpi-spacer { flex: 1; min-width: 140px; }
    .kpi-card {
      flex: 1; min-width: 140px;
      border-radius: 12px; padding: 18px 20px;
      display: flex; align-items: center; gap: 14px;
      cursor: pointer; transition: transform .15s, box-shadow .15s;
      box-shadow: 0 1px 3px rgba(0,0,0,.08);
    }
    .kpi-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,.12); }
    .kpi-card mat-icon { font-size: 26px; width: 26px; height: 26px; opacity: .85; flex-shrink: 0; }
    .kpi-value { font-size: 26px; font-weight: 700; margin: 0; line-height: 1; }
    .kpi-label { font-size: 11px; margin: 4px 0 0; opacity: .8; }

    .kpi-card--blue   { background: #eff6ff; color: #1d4ed8; }
    .kpi-card--orange { background: #fff7ed; color: #c2410c; }
    .kpi-card--indigo { background: #eef2ff; color: #4338ca; }
    .kpi-card--green  { background: #f0fdf4; color: #15803d; }
    .kpi-card--purple { background: #f5f3ff; color: #7c3aed; }
    .kpi-card--teal   { background: #f0fdfa; color: #0f766e; }
    .kpi-card--red    { background: #fef2f2; color: #dc2626; }
    .kpi-card--slate  { background: #f8fafc; color: #475569; }

    /* Charts */
    .charts-row { display: flex; gap: 16px; flex-wrap: wrap; }
    .chart-card {
      background: #fff; border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,.08);
      padding: 20px 24px; flex: 1; min-width: 280px;
    }
    .chart-card--wide { flex: 2; min-width: 380px; }
    .chart-title { font-size: 13px; font-weight: 600; color: #374151; margin: 0 0 16px; text-transform: uppercase; letter-spacing: .4px; }
    .chart-wrap { position: relative; height: 220px; }
    .chart-wrap--center { display: flex; align-items: center; justify-content: center; }
    .chart-empty { font-size: 13px; color: #94a3b8; text-align: center; padding: 60px 0; margin: 0; }

    /* Loading */
    .loading-state {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; padding: 64px; gap: 12px; color: #94a3b8;
    }
    .spinner {
      width: 32px; height: 32px; border: 3px solid #e2e8f0;
      border-top-color: #3b82f6; border-radius: 50%;
      animation: spin .8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `],
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('lineChart')      lineChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('donutChart')     donutChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('buChart')        buChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('categoriaChart') categoriaChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('prioridadChart') prioridadChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('resolutorChart') resolutorChartRef!: ElementRef<HTMLCanvasElement>;

  private readonly svc = inject(SolicitudesService);
  private readonly router = inject(Router);

  private charts: Chart[] = [];
  readonly loading = signal(true);
  readonly stats = signal<SolicitudesStats | null>(null);

  ngOnInit(): void {
    this.svc.getStats().subscribe({
      next: (s) => { this.stats.set(s); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  ngAfterViewInit(): void {
    const interval = setInterval(() => {
      if (this.stats() && this.lineChartRef && this.donutChartRef && this.prioridadChartRef) {
        clearInterval(interval);
        this.renderCharts();
      }
    }, 100);
  }

  ngOnDestroy(): void {
    this.charts.forEach(c => c.destroy());
  }

  renderCharts(): void {
    const s = this.stats()!;

    // ── Línea: solicitudes por día ─────────────────────────────
    this.charts.push(new Chart(this.lineChartRef.nativeElement, {
      type: 'line',
      data: {
        labels: s.porDia.map(d => d.fecha),
        datasets: [{
          label: 'Solicitudes',
          data: s.porDia.map(d => d.cantidad),
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59,130,246,.1)',
          borderWidth: 2, pointRadius: 3, fill: true, tension: 0.4,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: '#f1f5f9' } },
          x: { grid: { display: false } },
        },
      },
    }));

    // ── Donut: distribución por estado ─────────────────────────
    this.charts.push(new Chart(this.donutChartRef.nativeElement, {
      type: 'doughnut',
      data: {
        labels: ['Pendiente', 'En Revisión', 'En Desarrollo', 'Completada', 'Rechazada'],
        datasets: [{
          data: [s.pendientes, s.enRevision, s.enDesarrollo, s.completadas, s.rechazadas],
          backgroundColor: ['#fed7aa', '#bfdbfe', '#bbf7d0', '#ddd6fe', '#fecaca'],
          borderColor:     ['#f97316', '#3b82f6', '#22c55e', '#8b5cf6', '#ef4444'],
          borderWidth: 2,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } },
        cutout: '65%',
      },
    }));

    // ── Barra horizontal: por BU ───────────────────────────────
    if (s.porBu.length > 0 && this.buChartRef) {
      this.charts.push(new Chart(this.buChartRef.nativeElement, {
        type: 'bar',
        data: {
          labels: s.porBu.map(x => x.nombre),
          datasets: [{
            label: 'Solicitudes',
            data: s.porBu.map(x => x.cantidad),
            backgroundColor: '#bfdbfe',
            borderColor: '#3b82f6',
            borderWidth: 1, borderRadius: 4,
          }],
        },
        options: {
          indexAxis: 'y',
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: '#f1f5f9' } },
            y: { grid: { display: false } },
          },
        },
      }));
    }

    // ── Barra horizontal: por categoría ───────────────────────
    if (s.porCategoria.length > 0 && this.categoriaChartRef) {
      this.charts.push(new Chart(this.categoriaChartRef.nativeElement, {
        type: 'bar',
        data: {
          labels: s.porCategoria.map(x => x.nombre),
          datasets: [{
            label: 'Solicitudes',
            data: s.porCategoria.map(x => x.cantidad),
            backgroundColor: '#c7d2fe',
            borderColor: '#6366f1',
            borderWidth: 1, borderRadius: 4,
          }],
        },
        options: {
          indexAxis: 'y',
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: '#f1f5f9' } },
            y: { grid: { display: false } },
          },
        },
      }));
    }

    // ── Barra: por prioridad ───────────────────────────────────
    const prioColors: Record<string, { bg: string; border: string }> = {
      Baja:    { bg: '#e2e8f0', border: '#64748b' },
      Media:   { bg: '#fef9c3', border: '#ca8a04' },
      Alta:    { bg: '#fed7aa', border: '#f97316' },
      Critica: { bg: '#fecaca', border: '#ef4444' },
    };
    this.charts.push(new Chart(this.prioridadChartRef.nativeElement, {
      type: 'bar',
      data: {
        labels: s.porPrioridad.map(x => x.nombre),
        datasets: [{
          label: 'Solicitudes',
          data: s.porPrioridad.map(x => x.cantidad),
          backgroundColor: s.porPrioridad.map(x => prioColors[x.nombre]?.bg ?? '#e2e8f0'),
          borderColor:     s.porPrioridad.map(x => prioColors[x.nombre]?.border ?? '#64748b'),
          borderWidth: 1, borderRadius: 4,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: '#f1f5f9' } },
          x: { grid: { display: false } },
        },
      },
    }));

    // ── Barra agrupada: por resolutor ──────────────────────────
    if (s.porResolutor.length > 0 && this.resolutorChartRef) {
      this.charts.push(new Chart(this.resolutorChartRef.nativeElement, {
        type: 'bar',
        data: {
          labels: s.porResolutor.map(x => x.nombre),
          datasets: [
            {
              label: 'Asignadas',
              data: s.porResolutor.map(x => x.asignadas),
              backgroundColor: '#bfdbfe', borderColor: '#3b82f6',
              borderWidth: 1, borderRadius: 4,
            },
            {
              label: 'Completadas',
              data: s.porResolutor.map(x => x.completadas),
              backgroundColor: '#bbf7d0', borderColor: '#22c55e',
              borderWidth: 1, borderRadius: 4,
            },
          ],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } },
          scales: {
            y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: '#f1f5f9' } },
            x: { grid: { display: false } },
          },
        },
      }));
    }
  }

  ir(estado: number | null): void {
    this.router.navigate(['/solicitudes'], estado ? { queryParams: { estado } } : {});
  }
}
