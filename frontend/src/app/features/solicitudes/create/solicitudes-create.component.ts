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
    :host { display: flex; flex-direction: column; flex: 1; padding: 32px; gap: 24px; }

    /* Header */
    .page-header { display: flex; align-items: center; gap: 16px; }
    .page-title { font-size: 22px; font-weight: 700; color: #0f172a; margin: 0; }
    .page-subtitle { font-size: 13px; color: #64748b; margin: 4px 0 0; }
    .btn-back {
      width: 36px; height: 36px; border-radius: 8px;
      border: 1px solid #e2e8f0; background: #fff;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; color: #475569;
      transition: background .15s;
    }
    .btn-back:hover { background: #f8fafc; }
    .btn-back mat-icon { font-size: 20px; width: 20px; height: 20px; }

    /* Form */
    .form-wrapper { max-width: 680px; }
    .form-card {
      background: #fff; border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,.08);
      padding: 28px;
    }

    .field-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 20px; }
    .field-label { font-size: 13px; font-weight: 500; color: #374151; }
    .required { color: #ef4444; }
    .optional { font-weight: 400; color: #9ca3af; }

    .field-input {
      border: 1px solid #e2e8f0; border-radius: 8px;
      padding: 9px 12px; font-size: 14px; color: #1e293b;
      outline: none; transition: border-color .15s;
      font-family: inherit; background: #fff; width: 100%; box-sizing: border-box;
    }
    .field-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,.1); }
    .field-textarea { min-height: 120px; resize: vertical; }
    .field-select { appearance: none; cursor: pointer; }
    .field-loading { color: #94a3b8; font-style: italic; }
    .field-error { font-size: 12px; color: #ef4444; margin: 0; }

    .field-readonly {
      display: flex; align-items: center; gap: 8px;
      border: 1px solid #e2e8f0; border-radius: 8px;
      padding: 9px 12px; font-size: 14px; color: #475569;
      background: #f8fafc;
    }
    .readonly-avatar {
      width: 24px; height: 24px; border-radius: 50%;
      background: #3b82f6; color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 600; flex-shrink: 0;
    }

    .row-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .section-title {
      font-size: 11px; font-weight: 600; color: #94a3b8;
      text-transform: uppercase; letter-spacing: .6px;
      margin-bottom: 12px; margin-top: 4px;
    }
    .field-hint { font-size: 11px; color: #94a3b8; margin: 0; }

    /* Error banner */
    .error-banner {
      display: flex; align-items: center; gap: 8px;
      background: #fef2f2; border: 1px solid #fecaca;
      border-radius: 8px; padding: 10px 14px;
      color: #b91c1c; font-size: 13px; margin-bottom: 16px;
    }
    .error-banner mat-icon { font-size: 18px; width: 18px; height: 18px; }

    /* Buttons */
    .form-actions { display: flex; justify-content: flex-end; gap: 12px; padding-top: 8px; }
    .btn-primary {
      display: flex; align-items: center; gap: 6px;
      background: #3b82f6; color: #fff;
      border: none; border-radius: 8px;
      padding: 9px 18px; font-size: 14px; font-weight: 500;
      cursor: pointer; transition: background .15s;
    }
    .btn-primary:hover:not(:disabled) { background: #2563eb; }
    .btn-primary:disabled { opacity: .6; cursor: not-allowed; }
    .btn-primary mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .btn-secondary {
      background: transparent; color: #475569;
      border: 1px solid #e2e8f0; border-radius: 8px;
      padding: 9px 18px; font-size: 14px; font-weight: 500;
      cursor: pointer; transition: background .15s;
    }
    .btn-secondary:hover { background: #f8fafc; }

    .btn-spinner {
      width: 16px; height: 16px; border: 2px solid rgba(255,255,255,.4);
      border-top-color: #fff; border-radius: 50%;
      animation: spin .7s linear infinite; display: inline-block;
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
