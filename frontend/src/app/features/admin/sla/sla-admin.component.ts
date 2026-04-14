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
    :host { display: flex; flex-direction: column; flex: 1; padding: 32px; gap: 24px; }

    .page-header { }
    .page-title { font-size: 22px; font-weight: 700; color: #0f172a; margin: 0 0 6px; }
    .page-subtitle { font-size: 13px; color: #64748b; margin: 0; line-height: 1.6; max-width: 600px; }

    .sla-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 16px;
    }

    .sla-card {
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,.08);
      overflow: hidden;
    }

    .sla-card__header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 14px 18px; border-bottom: 1px solid #f1f5f9;
    }
    .sla-card__deadline {
      font-size: 12px; color: #64748b; font-weight: 500;
    }
    .sla-card__body { padding: 18px; display: flex; flex-direction: column; gap: 12px; }

    .sla-label { font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: .5px; }

    .sla-input-row { display: flex; gap: 8px; align-items: center; }
    .sla-input {
      flex: 1; border: 1px solid #e2e8f0; border-radius: 8px;
      padding: 9px 12px; font-size: 16px; font-weight: 600; color: #0f172a;
      outline: none; font-family: inherit; text-align: center;
    }
    .sla-input:focus { border-color: #3b82f6; }
    .sla-input::-webkit-outer-spin-button,
    .sla-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }

    .btn-guardar {
      width: 38px; height: 38px; border-radius: 8px; border: none;
      background: #3b82f6; color: #fff;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: background .15s; flex-shrink: 0;
    }
    .btn-guardar:hover:not(:disabled) { background: #2563eb; }
    .btn-guardar:disabled { opacity: .5; cursor: not-allowed; }
    .btn-guardar mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .btn-spinner {
      width: 16px; height: 16px; border: 2px solid rgba(255,255,255,.4);
      border-top-color: #fff; border-radius: 50%;
      animation: spin .7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Atajos */
    .shortcuts { display: flex; gap: 6px; flex-wrap: wrap; }
    .shortcut-btn {
      padding: 4px 10px; border-radius: 6px; border: 1px solid #e2e8f0;
      background: #f8fafc; font-size: 11px; color: #475569;
      cursor: pointer; transition: all .15s;
    }
    .shortcut-btn:hover { background: #eff6ff; border-color: #bfdbfe; color: #3b82f6; }
    .shortcut-btn--active { background: #eff6ff; border-color: #3b82f6; color: #3b82f6; font-weight: 600; }

    /* Badges de prioridad */
    .prioridad-badge {
      display: inline-block; padding: 3px 10px; border-radius: 20px;
      font-size: 12px; font-weight: 600;
    }
    .prioridad-badge--1 { background: #f1f5f9; color: #475569; }
    .prioridad-badge--2 { background: #fefce8; color: #854d0e; }
    .prioridad-badge--3 { background: #fff7ed; color: #c2410c; }
    .prioridad-badge--4 { background: #fef2f2; color: #991b1b; }

    /* Info box */
    .info-box {
      display: flex; gap: 12px; align-items: flex-start;
      background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px;
      padding: 16px 18px;
    }
    .info-box mat-icon { color: #3b82f6; margin-top: 2px; flex-shrink: 0; }
    .info-box strong { font-size: 13px; color: #1e3a8a; }
    .info-box p { font-size: 13px; color: #3730a3; margin: 4px 0 0; line-height: 1.5; }

    .loading-state { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 64px; color: #94a3b8; }
    .spinner { width: 28px; height: 28px; border: 3px solid #e2e8f0; border-top-color: #3b82f6; border-radius: 50%; animation: spin .8s linear infinite; }
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
