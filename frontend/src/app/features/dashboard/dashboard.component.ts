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
      <!-- KPI Cards -->
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

      <!-- Charts row -->
      <div class="charts-row">
        <div class="chart-card chart-card--wide">
          <h2 class="chart-title">Solicitudes por día (últimos 30 días)</h2>
          <div class="chart-wrap"><canvas #lineChart></canvas></div>
        </div>

        <div class="chart-card">
          <h2 class="chart-title">Distribución por estado</h2>
          <div class="chart-wrap chart-wrap--donut"><canvas #donutChart></canvas></div>
        </div>
      </div>
    }
  `,
  styles: [`
    :host { display: flex; flex-direction: column; flex: 1; padding: 32px; gap: 24px; }

    .page-header { display: flex; align-items: flex-start; justify-content: space-between; }
    .page-title { font-size: 22px; font-weight: 700; color: #0f172a; margin: 0; }
    .page-subtitle { font-size: 13px; color: #64748b; margin: 4px 0 0; }

    /* KPIs */
    .kpi-row { display: flex; gap: 16px; flex-wrap: wrap; }
    .kpi-card {
      flex: 1; min-width: 140px;
      border-radius: 12px; padding: 20px;
      display: flex; align-items: center; gap: 14px;
      cursor: pointer; transition: transform .15s, box-shadow .15s;
      box-shadow: 0 1px 3px rgba(0,0,0,.08);
    }
    .kpi-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,.12); }
    .kpi-card mat-icon { font-size: 28px; width: 28px; height: 28px; opacity: .85; }
    .kpi-value { font-size: 28px; font-weight: 700; margin: 0; line-height: 1; }
    .kpi-label { font-size: 12px; margin: 4px 0 0; opacity: .8; }

    .kpi-card--blue   { background: #eff6ff; color: #1d4ed8; }
    .kpi-card--orange { background: #fff7ed; color: #c2410c; }
    .kpi-card--indigo { background: #eef2ff; color: #4338ca; }
    .kpi-card--green  { background: #f0fdf4; color: #15803d; }
    .kpi-card--purple { background: #f5f3ff; color: #7c3aed; }

    /* Charts */
    .charts-row { display: flex; gap: 20px; flex-wrap: wrap; }
    .chart-card {
      background: #fff; border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,.08);
      padding: 20px 24px; flex: 1; min-width: 280px;
    }
    .chart-card--wide { flex: 2; min-width: 400px; }
    .chart-title { font-size: 14px; font-weight: 600; color: #374151; margin: 0 0 16px; }
    .chart-wrap { position: relative; height: 220px; }
    .chart-wrap--donut { height: 220px; display: flex; align-items: center; justify-content: center; }

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
  @ViewChild('lineChart') lineChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('donutChart') donutChartRef!: ElementRef<HTMLCanvasElement>;

  private readonly svc = inject(SolicitudesService);
  private readonly router = inject(Router);
  private lineChart?: Chart;
  private donutChart?: Chart;

  readonly loading = signal(true);
  readonly stats = signal<SolicitudesStats | null>(null);

  ngOnInit(): void {
    this.svc.getStats().subscribe({
      next: (s) => { this.stats.set(s); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  ngAfterViewInit(): void {
    // Espera que stats cargue y luego renderiza
    const interval = setInterval(() => {
      if (this.stats() && this.lineChartRef && this.donutChartRef) {
        clearInterval(interval);
        this.renderCharts();
      }
    }, 100);
  }

  ngOnDestroy(): void {
    this.lineChart?.destroy();
    this.donutChart?.destroy();
  }

  renderCharts(): void {
    const s = this.stats()!;

    // Line chart — solicitudes por día
    this.lineChart = new Chart(this.lineChartRef.nativeElement, {
      type: 'line',
      data: {
        labels: s.porDia.map(d => d.fecha),
        datasets: [{
          label: 'Solicitudes',
          data: s.porDia.map(d => d.cantidad),
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59,130,246,.1)',
          borderWidth: 2,
          pointRadius: 3,
          fill: true,
          tension: 0.4,
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
    });

    // Donut chart — distribución por estado
    this.donutChart = new Chart(this.donutChartRef.nativeElement, {
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
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 12 } } } },
        cutout: '65%',
      },
    });
  }

  ir(estado: number | null): void {
    this.router.navigate(['/solicitudes'], estado ? { queryParams: { estado } } : {});
  }
}
