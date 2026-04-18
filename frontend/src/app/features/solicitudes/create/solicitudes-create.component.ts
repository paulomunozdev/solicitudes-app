import { Component, OnInit, inject, signal, effect } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { SolicitudesService } from '../../../core/services/solicitudes.service';
import { CategoriasService, Categoria } from '../../../core/services/categorias.service';
import { UnidadesNegocioService, UnidadNegocio } from '../../../core/services/unidades-negocio.service';
import { UsuariosService, UsuarioResumen } from '../../../core/services/usuarios.service';
import { AuthService } from '../../../core/services/auth.service';
import { PrioridadSolicitud, PRIORIDAD_LABELS } from '../../../core/models/solicitud.model';

@Component({
  selector: 'app-solicitudes-create',
  standalone: true,
  imports: [ReactiveFormsModule, MatIconModule],
  template: `
    <!-- Header -->
    <div class="page-header">
      <button class="btn-back" (click)="volver()">
        <mat-icon>arrow_back</mat-icon>
      </button>
      <div>
        <h1 class="page-title">Nueva solicitud</h1>
        <p class="page-subtitle">Completa los datos del requerimiento</p>
      </div>
    </div>

    <!-- Form card -->
    <div class="form-wrapper">
      <div class="form-card">
        <form [formGroup]="form" (ngSubmit)="guardar()">

          <div class="field-group">
            <label class="field-label">Título <span class="required">*</span></label>
            <input class="field-input" formControlName="titulo"
              placeholder="Describe brevemente la solicitud" />
            @if (form.controls.titulo.touched && form.controls.titulo.hasError('required')) {
              <p class="field-error">El título es obligatorio</p>
            }
          </div>

          <div class="field-group">
            <label class="field-label">Descripción <span class="required">*</span></label>
            <textarea class="field-input field-textarea" formControlName="descripcion"
              placeholder="Detalla el requerimiento, contexto e impacto esperado..."></textarea>
            @if (form.controls.descripcion.touched && form.controls.descripcion.hasError('required')) {
              <p class="field-error">La descripción es obligatoria</p>
            }
          </div>

          <!-- Información del solicitante -->
          <div class="section-title">Información del solicitante</div>

          <!-- Ingresado por (siempre = usuario actual, read-only) -->
          <div class="field-group">
            <label class="field-label">Ingresado por</label>
            <div class="field-readonly">
              <span class="readonly-avatar">{{ inicialUsuario() }}</span>
              <span>{{ auth.profile()?.nombre ?? auth.user()?.name ?? '—' }}</span>
            </div>
          </div>

          @if (auth.isGestor()) {
            <!-- Admin/Gestor: BU dropdown + selector de solicitante -->
            <div class="row-fields">
              <div class="field-group">
                <label class="field-label">Unidad de negocio <span class="optional">(del solicitante)</span></label>
                <select class="field-input field-select" formControlName="unidadNegocio"
                  (change)="onBuChange($any($event.target).value)">
                  <option value="">Sin unidad</option>
                  @for (u of unidades(); track u.id) {
                    <option [value]="u.nombre">{{ u.nombre }}</option>
                  }
                </select>
              </div>

              <div class="field-group">
                <label class="field-label">Solicitado por <span class="optional">(opcional)</span></label>
                @if (form.controls.unidadNegocio.value && usuariosBu().length > 0) {
                  <select class="field-input field-select" formControlName="nombreSolicitante">
                    <option value="">— Seleccionar usuario —</option>
                    @for (u of usuariosBu(); track u.id) {
                      <option [value]="u.nombre">{{ u.nombre }}</option>
                    }
                  </select>
                } @else if (form.controls.unidadNegocio.value && cargandoUsuarios()) {
                  <div class="field-input field-loading">Cargando usuarios...</div>
                } @else {
                  <input class="field-input" formControlName="nombreSolicitante"
                    placeholder="Nombre del solicitante" />
                }
                <p class="field-hint">Si se deja vacío, se usará tu nombre.</p>
              </div>
            </div>
          } @else {
            <!-- Usuario normal: BU auto-rellena desde perfil -->
            <div class="row-fields">
              <div class="field-group">
                <label class="field-label">Unidad de negocio</label>
                @if (auth.profile()?.unidadNegocioNombre) {
                  <div class="field-readonly">{{ auth.profile()!.unidadNegocioNombre }}</div>
                } @else {
                  <select class="field-input field-select" formControlName="unidadNegocio">
                    <option value="">Sin unidad</option>
                    @for (u of unidades(); track u.id) {
                      <option [value]="u.nombre">{{ u.nombre }}</option>
                    }
                  </select>
                }
              </div>
              <div></div>
            </div>
          }

          <!-- Prioridad + Categoría -->
          <div class="section-title">Clasificación</div>
          <div class="row-fields">
            <div class="field-group">
              <label class="field-label">Prioridad</label>
              <select class="field-input field-select" formControlName="prioridad">
                @for (p of prioridades; track p.value) {
                  <option [value]="p.value">{{ p.label }}</option>
                }
              </select>
            </div>

            <div class="field-group">
              <label class="field-label">Categoría <span class="optional">(opcional)</span></label>
              <select class="field-input field-select" formControlName="categoria">
                <option value="">Sin categoría</option>
                @for (cat of categorias(); track cat.id) {
                  <option [value]="cat.nombre">{{ cat.nombre }}</option>
                }
              </select>
            </div>
          </div>

          @if (error()) {
            <div class="error-banner">
              <mat-icon>error_outline</mat-icon>
              {{ error() }}
            </div>
          }

          <div class="form-actions">
            <button type="button" class="btn-secondary" (click)="volver()">Cancelar</button>
            <button type="submit" class="btn-primary" [disabled]="form.invalid || guardando()">
              @if (guardando()) {
                <span class="btn-spinner"></span> Creando...
              } @else {
                <mat-icon>add</mat-icon> Crear solicitud
              }
            </button>
          </div>

        </form>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; padding: 28px 32px 48px; min-height: 100%; }

    /* Header */
    .page-header { display: flex; align-items: center; gap: 12px; margin-bottom: 28px; }
    .page-title { font-size: 20px; font-weight: 600; color: var(--text-primary, #161b26); letter-spacing: -0.015em; }
    .btn-back {
      display: inline-flex; align-items: center; gap: 6px; height: 34px; padding: 0 12px;
      border-radius: 8px; font-size: 13px; font-weight: 500;
      color: var(--text-secondary, #353c4d); background: none;
      border: 1px solid var(--border-default, #dfe3eb);
      cursor: pointer; font-family: inherit;
      transition: background 120ms ease, border-color 120ms ease;
    }
    .btn-back:hover { background: var(--n-50, #f7f8fa); border-color: var(--border-strong, #cfd4de); }
    .btn-back mat-icon { font-size: 17px; width: 17px; height: 17px; }

    /* Form */
    .form-wrapper { max-width: 680px; margin: 0 auto; display: flex; flex-direction: column; gap: 0; }
    .form-card {
      background: var(--n-0, #fff); border: 1px solid var(--border-subtle, #e9ecf2);
      border-radius: 12px; overflow: hidden; margin-bottom: 16px;
    }
    .form-card > * { padding: 20px; }
    .form-card > *:not(:last-child) { border-bottom: 1px solid var(--border-subtle, #e9ecf2); }

    .field-group { display: flex; flex-direction: column; gap: 6px; }
    .field-label { font-size: 12.5px; font-weight: 500; color: var(--text-secondary, #353c4d); }
    .required { color: oklch(0.45 0.150 25); margin-left: 2px; }
    .optional { font-weight: 400; color: var(--text-muted, #8a92a3); }

    .field-input {
      width: 100%; height: var(--input-h, 38px); padding: 0 12px;
      background: var(--n-0, #fff); border: 1px solid var(--border-default, #dfe3eb);
      border-radius: 8px; font-size: 13.5px; color: var(--text-primary, #161b26);
      outline: none; font-family: inherit;
      transition: border-color 120ms ease, box-shadow 120ms ease;
    }
    .field-input:hover { border-color: var(--border-strong, #cfd4de); }
    .field-input:focus { border-color: oklch(0.55 0.190 259); box-shadow: 0 0 0 3px oklch(0.78 0.130 259 / 0.20); }
    .field-textarea { height: auto; padding: 10px 12px; min-height: 120px; line-height: 1.55; resize: vertical; }
    .field-select {
      appearance: none; cursor: pointer;
      background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%236b7386' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
      background-repeat: no-repeat; background-position: right 12px center; padding-right: 32px;
    }
    .field-loading { color: var(--text-muted, #8a92a3); font-style: italic; font-size: 13px; }
    .field-error { font-size: 12px; color: oklch(0.45 0.150 25); margin: 0; }

    .field-readonly {
      display: flex; align-items: center; gap: 10px;
      height: var(--input-h, 38px); padding: 0 12px;
      background: var(--n-50, #f7f8fa); border: 1px solid var(--border-subtle, #e9ecf2);
      border-radius: 8px; font-size: 13.5px; color: var(--text-secondary, #353c4d);
    }
    .readonly-avatar {
      width: 24px; height: 24px; border-radius: 50%;
      background: oklch(0.55 0.190 259); color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-size: 10px; font-weight: 600; flex-shrink: 0;
    }

    .row-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .section-title {
      font-size: 11px; font-weight: 600; color: var(--text-muted, #8a92a3);
      text-transform: uppercase; letter-spacing: 0.07em;
      margin-bottom: 12px; margin-top: 4px;
    }
    .field-hint { font-size: 12px; color: var(--text-tertiary, #6b7386); margin: 0; }

    /* Error banner */
    .error-banner {
      display: flex; align-items: center; gap: 8px;
      background: oklch(0.95 0.035 25); border: 1px solid oklch(0.88 0.060 25);
      border-radius: 8px; padding: 10px 14px;
      color: oklch(0.45 0.150 25); font-size: 12.5px; margin-bottom: 16px;
    }
    .error-banner mat-icon { font-size: 16px; width: 16px; height: 16px; flex-shrink: 0; }

    /* Buttons */
    .form-actions { max-width: 680px; margin: 0 auto; display: flex; justify-content: flex-end; gap: 8px; padding-top: 4px; }
    .btn-primary {
      display: inline-flex; align-items: center; gap: 6px; height: 38px; padding: 0 16px;
      border-radius: 8px; font-size: 13.5px; font-weight: 500;
      background: var(--n-900, #161b26); color: #fff;
      border: 1px solid var(--n-900, #161b26);
      cursor: pointer; font-family: inherit;
      transition: background 120ms ease;
    }
    .btn-primary:hover:not(:disabled) { background: var(--n-800, #232937); }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-primary mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .btn-secondary {
      display: inline-flex; align-items: center; height: 38px; padding: 0 16px;
      border-radius: 8px; font-size: 13.5px; font-weight: 500;
      background: var(--n-0, #fff); color: var(--text-secondary, #353c4d);
      border: 1px solid var(--border-default, #dfe3eb);
      cursor: pointer; font-family: inherit;
      transition: background 120ms ease, border-color 120ms ease;
    }
    .btn-secondary:hover:not(:disabled) { background: var(--n-50, #f7f8fa); border-color: var(--border-strong, #cfd4de); }

    .btn-spinner {
      width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.35);
      border-top-color: #fff; border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `],
})
export class SolicitudesCreateComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly svc = inject(SolicitudesService);
  private readonly catSvc = inject(CategoriasService);
  private readonly unidadSvc = inject(UnidadesNegocioService);
  private readonly usuariosSvc = inject(UsuariosService);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);

  readonly guardando = signal(false);
  readonly error = signal('');
  readonly categorias = signal<Categoria[]>([]);
  readonly unidades = signal<UnidadNegocio[]>([]);
  readonly usuariosBu = signal<UsuarioResumen[]>([]);
  readonly cargandoUsuarios = signal(false);

  constructor() {
    // Auto-rellenar BU cuando el perfil esté disponible (usuario normal con BU asignada)
    effect(() => {
      const bu = this.auth.profile()?.unidadNegocioNombre;
      if (bu && !this.auth.isGestor()) {
        this.form.controls.unidadNegocio.setValue(bu);
      }
    });
  }

  ngOnInit(): void {
    this.catSvc.getAll(true).subscribe(data => this.categorias.set(data));
    this.unidadSvc.getAll(true).subscribe(data => this.unidades.set(data));
  }

  readonly prioridades = Object.entries(PRIORIDAD_LABELS).map(([value, label]) => ({
    value: Number(value) as PrioridadSolicitud,
    label,
  }));

  readonly form = this.fb.group({
    titulo:            ['', [Validators.required, Validators.maxLength(200)]],
    descripcion:       ['', [Validators.required, Validators.maxLength(2000)]],
    nombreSolicitante: [''],
    unidadNegocio:     [''],
    prioridad:         [PrioridadSolicitud.Media, Validators.required],
    categoria:         [''],
  });

  onBuChange(bu: string): void {
    this.form.controls.nombreSolicitante.setValue('');
    this.usuariosBu.set([]);
    if (!bu) return;
    this.cargandoUsuarios.set(true);
    this.usuariosSvc.getByBu(bu).subscribe({
      next: users => { this.usuariosBu.set(users); this.cargandoUsuarios.set(false); },
      error: () => this.cargandoUsuarios.set(false),
    });
  }

  guardar(): void {
    if (this.form.invalid) return;
    this.guardando.set(true);
    this.error.set('');

    const { titulo, descripcion, prioridad, categoria, unidadNegocio, nombreSolicitante } = this.form.value;

    // Para usuario normal, usar BU del perfil si no hay selección manual
    const buFinal = unidadNegocio || this.auth.profile()?.unidadNegocioNombre || undefined;

    this.svc.crear({
      titulo: titulo!,
      descripcion: descripcion!,
      prioridad: prioridad!,
      categoria:         categoria         || undefined,
      unidadNegocio:     buFinal           || undefined,
      nombreSolicitante: nombreSolicitante || undefined,
    }).subscribe({
      next: ({ id }) => this.router.navigate(['/solicitudes', id]),
      error: () => {
        this.error.set('Error al crear la solicitud. Intenta nuevamente.');
        this.guardando.set(false);
      },
    });
  }

  inicialUsuario(): string {
    const nombre = this.auth.profile()?.nombre ?? this.auth.user()?.name ?? '';
    return nombre.charAt(0).toUpperCase();
  }

  volver(): void { this.router.navigate(['/solicitudes']); }
}
