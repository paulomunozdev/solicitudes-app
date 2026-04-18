import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { SolicitudesService } from '../../../core/services/solicitudes.service';
import { SlaConfigDto, PrioridadSolicitud } from '../../../core/models/solicitud.model';

interface SlaRow extends SlaConfigDto {
  horasEdit: number;
  guardando: boolean;
  guardadoOk: boolean;
}

@Component({
  selector: 'app-sla-admin',
  standalone: true,
  imports: [FormsModule, MatIconModule],
  template: `
    <div class="page-header">
      <div>
        <h1 class="page-title">Configuración de SLA</h1>
        <p class="page-subtitle">
          Define cuántas horas tiene el equipo para resolver una solicitud según su prioridad.
          La fecha límite se calcula automáticamente al crear cada solicitud.
        </p>
      </div>
    </div>

    @if (loading()) {
      <div class="loading-state"><div class="spinner"></div><p>Cargando...</p></div>
    }

    @if (!loading()) {
      <div class="sla-grid">
        @for (row of rows(); track row.prioridad) {
          <div class="sla-card sla-card--{{ row.prioridad }}">
            <div class="sla-card__header">
              <span class="prioridad-badge prioridad-badge--{{ row.prioridad }}">
                {{ row.prioridadNombre }}
              </span>
              <span class="sla-card__deadline">
                {{ formatDeadline(row.horasEdit) }}
              </span>
            </div>

            <div class="sla-card__body">
              <label class="sla-label">Horas para resolver</label>
              <div class="sla-input-row">
                <input
                  class="sla-input"
                  type="number"
                  min="1"
                  max="8760"
                  [(ngModel)]="row.horasEdit"
                />
                <button
                  class="btn-guardar"
                  [disabled]="row.guardando || row.horasEdit < 1"
                  (click)="guardar(row)">
                  @if (row.guardando) {
                    <span class="btn-spinner"></span>
                  } @else if (row.guardadoOk) {
                    <mat-icon>check</mat-icon>
                  } @else {
                    <mat-icon>save</mat-icon>
                  }
                </button>
              </div>

              <!-- Atajos rápidos -->
              <div class="shortcuts">
                @for (s of shortcuts; track s.label) {
                  <button class="shortcut-btn"
                    [class.shortcut-btn--active]="row.horasEdit === s.horas"
                    (click)="row.horasEdit = s.horas">
                    {{ s.label }}
                  </button>
                }
              </div>
            </div>
          </div>
        }
      </div>

      <div class="info-box">
        <mat-icon>info</mat-icon>
        <div>
          <strong>¿Cómo funciona?</strong>
          <p>Al crear una solicitud, el sistema calcula automáticamente la fecha límite sumando las horas
          configuradas aquí a la hora de creación. El badge rojo aparece cuando la solicitud supera esa fecha.</p>
        </div>
      </div>
    }
  `,
  styles: [`
    :host { display: flex; flex-direction: column; flex: 1; padding: 28px 32px; gap: 24px; }

    .page-title { font-size: 20px; font-weight: 600; color: var(--text-primary, #161b26); letter-spacing: -0.015em; margin: 0; }
    .page-subtitle { font-size: 13.5px; color: var(--text-tertiary, #6b7386); margin: 4px 0 0; line-height: 1.55; max-width: 600px; }

    .sla-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

    .sla-card { background: var(--n-0, #fff); border: 1px solid var(--border-subtle, #e9ecf2); border-radius: 12px; overflow: hidden; transition: box-shadow 200ms ease; }
    .sla-card:hover { box-shadow: 0 4px 12px rgba(16,24,40,0.06); }

    .sla-card__header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--border-subtle, #e9ecf2); }
    .sla-card__deadline { font-size: 13.5px; font-weight: 600; color: var(--text-primary, #161b26); font-variant-numeric: tabular-nums; }
    .sla-card__body { padding: 20px; display: flex; flex-direction: column; gap: 16px; }

    .sla-label { font-size: 12.5px; font-weight: 500; color: var(--text-secondary, #353c4d); }

    .sla-input-row { display: flex; gap: 0; align-items: center; }
    .sla-input {
      flex: 1; border: 1px solid var(--border-default, #dfe3eb); border-radius: 8px 0 0 8px;
      padding: 0 12px; height: 38px; font-size: 15px; font-weight: 500; color: var(--text-primary, #161b26);
      outline: none; font-family: inherit; font-variant-numeric: tabular-nums;
      background: var(--n-0, #fff); transition: border-color 120ms ease, box-shadow 120ms ease;
      -moz-appearance: textfield;
    }
    .sla-input:focus { border-color: oklch(0.55 0.190 259); box-shadow: 0 0 0 3px oklch(0.78 0.130 259 / 0.20); z-index: 1; }
    .sla-input::-webkit-outer-spin-button,
    .sla-input::-webkit-inner-spin-button { -webkit-appearance: none; }

    .btn-guardar {
      width: 38px; height: 38px; border-radius: 0 8px 8px 0; border: 1px solid var(--border-default, #dfe3eb); border-left: none;
      background: var(--n-900, #161b26); color: #fff;
      display: inline-flex; align-items: center; justify-content: center;
      cursor: pointer; font-family: inherit; transition: background 120ms ease; flex-shrink: 0;
    }
    .btn-guardar:hover:not(:disabled) { background: var(--n-800, #232937); }
    .btn-guardar:disabled { opacity: .5; cursor: not-allowed; }
    .btn-guardar mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .btn-spinner { width: 13px; height: 13px; border: 2px solid rgba(255,255,255,0.35); border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .shortcuts { display: flex; gap: 6px; flex-wrap: wrap; }
    .shortcut-btn {
      height: 26px; padding: 0 10px; border-radius: 6px;
      font-size: 12px; font-weight: 500;
      background: var(--n-75, #f1f3f7); border: 1px solid var(--border-subtle, #e9ecf2);
      color: var(--text-secondary, #353c4d); cursor: pointer; font-family: inherit;
      font-variant-numeric: tabular-nums; transition: background 120ms ease, border-color 120ms ease, color 120ms ease;
    }
    .shortcut-btn:hover { background: var(--n-100, #e9ecf2); border-color: var(--border-default, #dfe3eb); }
    .shortcut-btn--active { background: oklch(0.96 0.030 259); border-color: oklch(0.85 0.075 259); color: oklch(0.42 0.160 259); font-weight: 600; }

    .prioridad-badge { display: inline-flex; align-items: center; gap: 6px; height: 22px; padding: 0 8px 0 7px; border-radius: 9999px; font-size: 12px; font-weight: 500; white-space: nowrap; border: 1px solid transparent; }
    .prioridad-badge::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: currentColor; opacity: 0.85; flex-shrink: 0; }
    .prioridad-badge--1 { color: var(--n-600, #4e566a); background: var(--n-75, #f1f3f7); border-color: var(--border-default, #dfe3eb); }
    .prioridad-badge--2 { color: oklch(0.42 0.160 259); background: oklch(0.96 0.030 259); }
    .prioridad-badge--3 { color: oklch(0.45 0.130 65);  background: oklch(0.96 0.045 80); }
    .prioridad-badge--4 { color: oklch(0.45 0.150 25);  background: oklch(0.95 0.035 25); }

    .info-box { display: flex; gap: 12px; padding: 14px 16px; background: oklch(0.96 0.030 259); border: 1px solid oklch(0.88 0.050 259); border-radius: 10px; }
    .info-box mat-icon { font-size: 18px; width: 18px; height: 18px; color: oklch(0.42 0.160 259); flex-shrink: 0; margin-top: 1px; }
    .info-box strong { font-size: 13px; color: oklch(0.28 0.130 259); font-weight: 600; }
    .info-box p { font-size: 13px; color: oklch(0.35 0.130 259); margin: 4px 0 0; line-height: 1.6; }

    .loading-state { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 64px; color: var(--text-muted, #8a92a3); }
    .spinner { width: 28px; height: 28px; border: 3px solid var(--border-subtle, #e9ecf2); border-top-color: oklch(0.55 0.190 259); border-radius: 50%; animation: spin .8s linear infinite; }
  `],
})
export class SlaAdminComponent implements OnInit {
  private readonly svc = inject(SolicitudesService);

  readonly loading = signal(true);
  readonly rows = signal<SlaRow[]>([]);

  readonly shortcuts = [
    { label: '4h',   horas: 4   },
    { label: '8h',   horas: 8   },
    { label: '24h',  horas: 24  },
    { label: '48h',  horas: 48  },
    { label: '72h',  horas: 72  },
    { label: '7d',   horas: 168 },
    { label: '14d',  horas: 336 },
    { label: '30d',  horas: 720 },
  ];

  ngOnInit(): void {
    this.svc.getSlaConfigs().subscribe({
      next: (configs) => {
        this.rows.set(configs.map(c => ({
          ...c,
          horasEdit:  c.horas,
          guardando:  false,
          guardadoOk: false,
        })));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  guardar(row: SlaRow): void {
    if (row.horasEdit < 1) return;
    row.guardando = true;
    this.svc.actualizarSla(row.prioridad, row.horasEdit).subscribe({
      next: () => {
        row.horas     = row.horasEdit;
        row.guardando  = false;
        row.guardadoOk = true;
        setTimeout(() => (row.guardadoOk = false), 2500);
        // Forzar re-render de signals
        this.rows.update(r => [...r]);
      },
      error: () => {
        row.guardando = false;
        this.rows.update(r => [...r]);
      },
    });
  }

  formatDeadline(horas: number): string {
    if (horas < 24)   return `${horas} horas`;
    if (horas < 168)  return `${Math.round(horas / 24)} días`;
    if (horas < 720)  return `${Math.round(horas / 168)} semanas`;
    return `${Math.round(horas / 720)} meses`;
  }
}
