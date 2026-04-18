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
    :host { display: flex; flex-direction: column; flex: 1; padding: 28px 32px 48px; gap: 20px; overflow-y: auto; }

    .page-header { display: flex; align-items: flex-start; justify-content: space-between; }
    .page-title { font-size: 20px; font-weight: 600; color: var(--text-primary, #161b26); letter-spacing: -0.015em; margin: 0; }
    .page-subtitle { font-size: 13px; color: var(--text-tertiary, #6b7386); margin: 4px 0 0; }

    .kpi-row { display: flex; gap: 12px; flex-wrap: wrap; }
    .kpi-spacer { flex: 1; min-width: 140px; }
    .kpi-card {
      flex: 1; min-width: 140px;
      border-radius: 12px; padding: 18px 20px;
      display: flex; align-items: center; gap: 14px;
      cursor: pointer; transition: box-shadow 200ms ease;
    }
    .kpi-card:hover { box-shadow: 0 4px 12px rgba(16,24,40,0.10); }
    .kpi-card mat-icon { font-size: 24px; width: 24px; height: 24px; opacity: .85; flex-shrink: 0; }
    .kpi-value { font-size: 26px; font-weight: 700; margin: 0; line-height: 1; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
    .kpi-label { font-size: 11px; margin: 4px 0 0; }

    .kpi-card--blue   { background: oklch(0.96 0.030 259); color: oklch(0.42 0.160 259); }
    .kpi-card--orange { background: oklch(0.96 0.045 80);  color: oklch(0.45 0.130 65); }
    .kpi-card--indigo { background: oklch(0.96 0.030 259); color: oklch(0.42 0.160 259); }
    .kpi-card--green  { background: oklch(0.96 0.035 155); color: oklch(0.42 0.120 155); }
    .kpi-card--purple { background: oklch(0.96 0.030 295); color: oklch(0.42 0.140 295); }
    .kpi-card--teal   { background: oklch(0.96 0.030 259); color: oklch(0.42 0.160 259); }
    .kpi-card--red    { background: oklch(0.95 0.035 25);  color: oklch(0.45 0.150 25); }
    .kpi-card--slate  { background: var(--n-75, #f1f3f7);  color: var(--n-600, #4e566a); }

    .charts-row { display: flex; gap: 16px; flex-wrap: wrap; }
    .chart-card { background: var(--n-0, #fff); border: 1px solid var(--border-subtle, #e9ecf2); border-radius: 12px; padding: 20px 24px; flex: 1; min-width: 280px; overflow: hidden; }
    .chart-card--wide { flex: 2; min-width: 380px; }
    .chart-title { font-size: 13px; font-weight: 600; color: var(--text-primary, #161b26); margin: 0 0 16px; letter-spacing: -0.01em; }
    .chart-wrap { position: relative; height: 220px; }
    .chart-wrap--center { display: flex; align-items: center; justify-content: center; }
    .chart-empty { font-size: 13px; color: var(--text-muted, #8a92a3); text-align: center; padding: 60px 0; margin: 0; }

    .loading-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 64px; gap: 12px; color: var(--text-muted, #8a92a3); }
    .spinner { width: 32px; height: 32px; border: 3px solid var(--border-subtle, #e9ecf2); border-top-color: oklch(0.55 0.190 259); border-radius: 50%; animation: spin .8s linear infinite; }
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
    const tooltip = {
      backgroundColor: '#161b26', titleColor: '#fff',
      bodyColor: 'rgba(255,255,255,0.75)', padding: 10, cornerRadius: 8,
      titleFont: { family: "'Geist', sans-serif", size: 12, weight: 600 },
      bodyFont:  { family: "'Geist', sans-serif", size: 12 },
    };
    const tickStyle = { color: '#6b7386', font: { family: "'Geist', sans-serif", size: 11 } };

    // ── Línea: solicitudes por día ─────────────────────────────
    this.charts.push(new Chart(this.lineChartRef.nativeElement, {
      type: 'line',
      data: {
        labels: s.porDia.map(d => d.fecha),
        datasets: [{
          label: 'Solicitudes',
          data: s.porDia.map(d => d.cantidad),
          borderColor: 'oklch(0.55 0.190 259)',
          backgroundColor: 'oklch(0.55 0.190 259 / 0.08)',
          borderWidth: 2, pointRadius: 3, fill: true, tension: 0.4,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1, ...tickStyle }, grid: { color: 'rgba(0,0,0,0.04)' }, border: { display: false } },
          x: { grid: { display: false }, ticks: tickStyle, border: { display: false } },
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
          backgroundColor: [
            'oklch(0.96 0.045 80)',
            'oklch(0.88 0.085 259)',
            'oklch(0.88 0.080 295)',
            'oklch(0.88 0.080 155)',
            'oklch(0.88 0.080 25)',
          ],
          borderColor: [
            'oklch(0.55 0.150 70)',
            'oklch(0.48 0.185 259)',
            'oklch(0.42 0.140 295)',
            'oklch(0.42 0.120 155)',
            'oklch(0.45 0.150 25)',
          ],
          borderWidth: 2,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 10, boxHeight: 10, padding: 16, color: '#6b7386', font: { family: "'Geist', sans-serif", size: 12 } } },
          tooltip,
        },
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
            backgroundColor: 'oklch(0.88 0.085 259)',
            borderColor: 'oklch(0.55 0.190 259)',
            borderWidth: 1, borderRadius: 4,
          }],
        },
        options: {
          indexAxis: 'y',
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip },
          scales: {
            x: { beginAtZero: true, ticks: { stepSize: 1, ...tickStyle }, grid: { color: 'rgba(0,0,0,0.04)' }, border: { display: false } },
            y: { grid: { display: false }, ticks: tickStyle, border: { display: false } },
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
            backgroundColor: 'oklch(0.88 0.080 295)',
            borderColor: 'oklch(0.55 0.170 295)',
            borderWidth: 1, borderRadius: 4,
          }],
        },
        options: {
          indexAxis: 'y',
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip },
          scales: {
            x: { beginAtZero: true, ticks: { stepSize: 1, ...tickStyle }, grid: { color: 'rgba(0,0,0,0.04)' }, border: { display: false } },
            y: { grid: { display: false }, ticks: tickStyle, border: { display: false } },
          },
        },
      }));
    }

    // ── Barra: por prioridad ───────────────────────────────────
    const prioColors: Record<string, { bg: string; border: string }> = {
      Baja:    { bg: 'oklch(0.78 0.040 259)', border: 'oklch(0.55 0.090 259)' },
      Media:   { bg: 'oklch(0.88 0.085 259)', border: 'oklch(0.55 0.190 259)' },
      Alta:    { bg: 'oklch(0.96 0.045 80)',  border: 'oklch(0.55 0.150 70)' },
      Critica: { bg: 'oklch(0.95 0.035 25)',  border: 'oklch(0.58 0.180 25)' },
    };
    this.charts.push(new Chart(this.prioridadChartRef.nativeElement, {
      type: 'bar',
      data: {
        labels: s.porPrioridad.map(x => x.nombre),
        datasets: [{
          label: 'Solicitudes',
          data: s.porPrioridad.map(x => x.cantidad),
          backgroundColor: s.porPrioridad.map(x => prioColors[x.nombre]?.bg ?? 'oklch(0.90 0.030 259)'),
          borderColor:     s.porPrioridad.map(x => prioColors[x.nombre]?.border ?? 'oklch(0.60 0.120 259)'),
          borderWidth: 1, borderRadius: 4,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1, ...tickStyle }, grid: { color: 'rgba(0,0,0,0.04)' }, border: { display: false } },
          x: { grid: { display: false }, ticks: tickStyle, border: { display: false } },
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
              backgroundColor: 'oklch(0.88 0.085 259)', borderColor: 'oklch(0.55 0.190 259)',
              borderWidth: 1, borderRadius: 4,
            },
            {
              label: 'Completadas',
              data: s.porResolutor.map(x => x.completadas),
              backgroundColor: 'oklch(0.88 0.080 155)', borderColor: 'oklch(0.55 0.150 155)',
              borderWidth: 1, borderRadius: 4,
            },
          ],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 10, boxHeight: 10, padding: 16, color: '#6b7386', font: { family: "'Geist', sans-serif", size: 12 } } },
            tooltip,
          },
          scales: {
            y: { beginAtZero: true, ticks: { stepSize: 1, ...tickStyle }, grid: { color: 'rgba(0,0,0,0.04)' }, border: { display: false } },
            x: { grid: { display: false }, ticks: tickStyle, border: { display: false } },
          },
        },
      }));
    }
  }

  ir(estado: number | null): void {
    this.router.navigate(['/solicitudes'], estado ? { queryParams: { estado } } : {});
  }
}
