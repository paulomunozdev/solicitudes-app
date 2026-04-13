import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Subscription } from 'rxjs';
import { SolicitudesService } from '../../../core/services/solicitudes.service';
import { UsuariosService } from '../../../core/services/usuarios.service';
import { SignalRService } from '../../../core/services/signalr.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  ArchivoAdjunto, Solicitud, Comentario, EstadoSolicitud, ESTADO_LABELS, PRIORIDAD_LABELS
} from '../../../core/models/solicitud.model';

@Component({
  selector: 'app-solicitudes-detail',
  standalone: true,
  imports: [DatePipe, FormsModule, MatIconModule],
  template: `
    <div class="page-header">
      <button class="btn-back" (click)="volver()">
        <mat-icon>arrow_back</mat-icon>
      </button>
      <div>
        <h1 class="page-title">Detalle de solicitud</h1>
        <p class="page-subtitle">Información, estado y comentarios</p>
      </div>
    </div>

    @if (loading()) {
      <div class="loading-state"><div class="spinner"></div><p>Cargando...</p></div>
    }

    @if (solicitud(); as s) {
      <div class="content-grid">

        <!-- Columna principal -->
        <div class="main-col">

          <!-- Info card -->
          <div class="card">
            <div class="card-header">
              <span class="badge badge--estado-{{ s.estado }}">{{ estadoLabel(s) }}</span>
              <span class="badge badge--prioridad-{{ s.prioridad }}">{{ prioridadLabel(s) }}</span>
              @if (slaVencida(s)) {
                <span class="badge-sla">
                  <mat-icon>schedule</mat-icon> Fecha límite vencida
                </span>
              }
              @if (estadoActualizado()) {
                <span class="badge-realtime">
                  <mat-icon>bolt</mat-icon> Estado actualizado en tiempo real
                </span>
              }
            </div>
            <h2 class="solicitud-titulo">{{ s.titulo }}</h2>
            <p class="solicitud-desc">{{ s.descripcion }}</p>
          </div>

          <!-- Acciones de progresión (solo Gestor / Admin) -->
          @if (auth.isGestor()) {
            <div class="card">
              <h3 class="card-title">Acciones</h3>
              @switch (s.estado) {
                @case (EstadoSolicitud.Pendiente) {
                  <div class="accion-buttons">
                    <button class="btn-accion btn-accion--primary" [disabled]="guardando()"
                      (click)="avanzar(s.id, EstadoSolicitud.EnRevision)">
                      @if (guardando()) { <span class="btn-spinner"></span> } @else { <mat-icon>manage_search</mat-icon> }
                      Tomar en revisión
                    </button>
                  </div>
                }
                @case (EstadoSolicitud.EnRevision) {
                  <div class="accion-buttons">
                    <button class="btn-accion btn-accion--primary" [disabled]="guardando()"
                      (click)="avanzar(s.id, EstadoSolicitud.EnDesarrollo)">
                      @if (guardando()) { <span class="btn-spinner"></span> } @else { <mat-icon>code</mat-icon> }
                      Iniciar desarrollo
                    </button>
                    <button class="btn-accion btn-accion--danger" [disabled]="guardando()"
                      (click)="avanzar(s.id, EstadoSolicitud.Rechazada)">
                      @if (guardando()) { <span class="btn-spinner"></span> } @else { <mat-icon>cancel</mat-icon> }
                      Rechazar
                    </button>
                  </div>
                }
                @case (EstadoSolicitud.EnDesarrollo) {
                  <div class="accion-buttons">
                    <button class="btn-accion btn-accion--success" [disabled]="guardando()"
                      (click)="avanzar(s.id, EstadoSolicitud.Completada)">
                      @if (guardando()) { <span class="btn-spinner"></span> } @else { <mat-icon>check_circle</mat-icon> }
                      Completar
                    </button>
                    <button class="btn-accion btn-accion--danger" [disabled]="guardando()"
                      (click)="avanzar(s.id, EstadoSolicitud.Rechazada)">
                      @if (guardando()) { <span class="btn-spinner"></span> } @else { <mat-icon>cancel</mat-icon> }
                      Rechazar
                    </button>
                  </div>
                }
                @default {
                  <p class="estado-cerrado">
                    <mat-icon>{{ s.estado === EstadoSolicitud.Completada ? 'check_circle' : 'block' }}</mat-icon>
                    Esta solicitud está {{ s.estado === EstadoSolicitud.Completada ? 'completada' : 'rechazada' }}.
                  </p>
                }
              }
            </div>

            <!-- Reasignación (solo Gestor / Admin) -->
            <div class="card">
              <h3 class="card-title">Asignación</h3>
              <div class="reasignar-row">
                <select class="field-select" [(ngModel)]="consultorSeleccionado">
                  <option [value]="null">Sin asignar</option>
                  @for (u of consultores(); track u.id) {
                    <option [value]="u.id">{{ u.nombre }}</option>
                  }
                </select>
                <button class="btn-primary" [disabled]="reasignando()" (click)="reasignar(s.id)">
                  @if (reasignando()) { <span class="btn-spinner"></span> } @else { <mat-icon>person_add</mat-icon> }
                  Guardar
                </button>
              </div>
              @if (reasignadoOk()) {
                <p class="feedback-ok"><mat-icon>check</mat-icon> Asignación guardada</p>
              }
            </div>
          }

          <!-- Archivos adjuntos -->
          <div class="card">
            <h3 class="card-title">Archivos adjuntos ({{ archivos().length }})</h3>

            @if (archivos().length === 0) {
              <p class="empty-state">Sin archivos adjuntos.</p>
            }
            <div class="archivos-list">
              @for (a of archivos(); track a.id) {
                <div class="archivo-item">
                  <mat-icon class="archivo-icon">{{ iconoArchivo(a.contentType) }}</mat-icon>
                  <div class="archivo-info">
                    <a [href]="a.blobUrl" target="_blank" rel="noopener" class="archivo-nombre">{{ a.nombreArchivo }}</a>
                    <p class="archivo-meta">{{ formatBytes(a.tamanoBytes) }} · {{ a.creadoEn | date:'dd/MM/yyyy' }}</p>
                  </div>
                  <button class="btn-icon-danger" (click)="eliminarArchivo(s.id, a.id)" title="Eliminar">
                    <mat-icon>delete</mat-icon>
                  </button>
                </div>
              }
            </div>

            <!-- Upload -->
            <div class="upload-zone" [class.upload-zone--dragging]="dragging()"
              (dragover)="$event.preventDefault(); dragging.set(true)"
              (dragleave)="dragging.set(false)"
              (drop)="onDrop($event, s.id)">
              <mat-icon>upload_file</mat-icon>
              <p>Arrastra un archivo aquí o <label class="upload-link">
                selecciona uno
                <input type="file" hidden (change)="onFileSelected($event, s.id)">
              </label></p>
              <p class="upload-hint">PDF, Word, Excel, imágenes — máx. 10 MB</p>
              @if (subiendo()) {
                <div class="upload-progress"><div class="spinner"></div> Subiendo...</div>
              }
            </div>
          </div>

          <!-- Comentarios -->
          <div class="card">
            <h3 class="card-title">Comentarios ({{ comentarios().length }})</h3>
            <div class="comentarios-list">
              @if (comentarios().length === 0) {
                <p class="empty-comentarios">Sin comentarios aún. Sé el primero.</p>
              }
              @for (c of comentarios(); track c.id) {
                <div class="comentario" [class.comentario--interno]="c.esInterno">
                  <div class="comentario__header">
                    <div class="comentario__avatar">{{ inicial(c.usuarioNombre) }}</div>
                    <div>
                      <p class="comentario__autor">
                        {{ c.usuarioNombre }}
                        @if (c.esInterno) { <span class="badge-interno">Interno</span> }
                      </p>
                      <p class="comentario__fecha">{{ c.creadoEn | date:'dd/MM/yyyy HH:mm' }}</p>
                    </div>
                  </div>
                  <p class="comentario__texto">{{ c.texto }}</p>
                </div>
              }
            </div>
            <div class="nuevo-comentario">
              <textarea class="field-textarea" [(ngModel)]="nuevoTexto"
                placeholder="Escribe un comentario..." rows="3"></textarea>
              <div class="nuevo-comentario__actions">
                <label class="check-interno">
                  <input type="checkbox" [(ngModel)]="esInterno">
                  <span>Interno (solo consultores)</span>
                </label>
                <button class="btn-primary" [disabled]="!nuevoTexto.trim() || enviando()"
                  (click)="agregarComentario(s.id)">
                  @if (enviando()) { <span class="btn-spinner"></span> } @else {
                    <mat-icon>send</mat-icon> Comentar
                  }
                </button>
              </div>
            </div>
          </div>

        </div>

        <!-- Metadata sidebar -->
        <div class="meta-col">
          <div class="card">
            <h3 class="card-title">Información</h3>
            <div class="meta-list">
              <div class="meta-item">
                <p class="meta-key">Ingresado por</p>
                <p class="meta-val">{{ s.usuarioCreadorNombre }}</p>
              </div>
              @if (s.nombreSolicitante && s.nombreSolicitante !== s.usuarioCreadorNombre) {
                <div class="meta-item">
                  <p class="meta-key">Solicitado por</p>
                  <p class="meta-val">{{ s.nombreSolicitante }}</p>
                </div>
              }
              @if (s.unidadNegocio) {
                <div class="meta-item">
                  <p class="meta-key">Unidad de negocio</p>
                  <p class="meta-val">{{ s.unidadNegocio }}</p>
                </div>
              }
              <div class="meta-item">
                <p class="meta-key">Asignado a</p>
                <p class="meta-val">{{ s.consultorAsignadoNombre ?? 'Sin asignar' }}</p>
              </div>
              @if (s.categoria) {
                <div class="meta-item">
                  <p class="meta-key">Categoría</p>
                  <p class="meta-val">{{ s.categoria }}</p>
                </div>
              }
              @if (s.fechaLimite) {
                <div class="meta-item">
                  <p class="meta-key">Fecha límite</p>
                  <p class="meta-val" [class.meta-val--vencida]="slaVencida(s)">
                    @if (slaVencida(s)) { <mat-icon style="font-size:14px;width:14px;height:14px;vertical-align:-2px">warning</mat-icon> }
                    {{ s.fechaLimite | date:'dd/MM/yyyy' }}
                  </p>
                </div>
              }
              <div class="meta-item">
                <p class="meta-key">Creada</p>
                <p class="meta-val">{{ s.creadoEn | date:'dd/MM/yyyy HH:mm' }}</p>
              </div>
              <div class="meta-item">
                <p class="meta-key">Actualizada</p>
                <p class="meta-val">{{ s.actualizadoEn | date:'dd/MM/yyyy HH:mm' }}</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    }
  `,
  styles: [`
    :host { display: flex; flex-direction: column; flex: 1; padding: 32px; gap: 24px; }

    .page-header { display: flex; align-items: center; gap: 16px; }
    .page-title { font-size: 22px; font-weight: 700; color: #0f172a; margin: 0; }
    .page-subtitle { font-size: 13px; color: #64748b; margin: 4px 0 0; }
    .btn-back {
      width: 36px; height: 36px; border-radius: 8px;
      border: 1px solid #e2e8f0; background: #fff;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; color: #475569; transition: background .15s;
    }
    .btn-back:hover { background: #f8fafc; }
    .btn-back mat-icon { font-size: 20px; width: 20px; height: 20px; }

    .content-grid { display: grid; grid-template-columns: 1fr 280px; gap: 20px; align-items: start; }
    .main-col { display: flex; flex-direction: column; gap: 20px; }
    .meta-col { display: flex; flex-direction: column; gap: 20px; }

    .card { background: #fff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,.08); padding: 24px; }
    .card-header { display: flex; gap: 8px; margin-bottom: 14px; align-items: center; flex-wrap: wrap; }
    .card-title { font-size: 13px; font-weight: 600; color: #374151; margin: 0 0 16px; text-transform: uppercase; letter-spacing: .5px; }

    .solicitud-titulo { font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 12px; }
    .solicitud-desc { font-size: 14px; color: #475569; line-height: 1.7; margin: 0; }

    .badge-realtime {
      display: inline-flex; align-items: center; gap: 4px;
      background: #f0fdf4; color: #15803d;
      border: 1px solid #bbf7d0; border-radius: 20px;
      padding: 3px 10px; font-size: 12px; font-weight: 500;
      animation: fadeIn .3s ease;
    }
    .badge-sla {
      display: inline-flex; align-items: center; gap: 4px;
      background: #fef2f2; color: #b91c1c;
      border: 1px solid #fca5a5; border-radius: 20px;
      padding: 3px 10px; font-size: 12px; font-weight: 500;
    }
    .badge-realtime mat-icon, .badge-sla mat-icon { font-size: 14px; width: 14px; height: 14px; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }

    .accion-buttons { display: flex; gap: 10px; flex-wrap: wrap; }

    .btn-accion {
      display: inline-flex; align-items: center; gap: 6px;
      border: none; border-radius: 8px;
      padding: 10px 18px; font-size: 14px; font-weight: 500;
      cursor: pointer; transition: background .15s, opacity .15s;
    }
    .btn-accion:disabled { opacity: .5; cursor: not-allowed; }
    .btn-accion mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .btn-accion--primary { background: #3b82f6; color: #fff; }
    .btn-accion--primary:hover:not(:disabled) { background: #2563eb; }
    .btn-accion--success { background: #16a34a; color: #fff; }
    .btn-accion--success:hover:not(:disabled) { background: #15803d; }
    .btn-accion--danger { background: #fff; color: #dc2626; border: 1px solid #fca5a5; }
    .btn-accion--danger:hover:not(:disabled) { background: #fef2f2; }

    .estado-cerrado { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #64748b; margin: 0; }
    .estado-cerrado mat-icon { font-size: 18px; width: 18px; height: 18px; }

    /* Reasignación */
    .reasignar-row { display: flex; gap: 10px; align-items: center; }
    .field-select {
      flex: 1; border: 1px solid #e2e8f0; border-radius: 8px;
      padding: 9px 12px; font-size: 14px; color: #1e293b;
      font-family: inherit; background: #fff; outline: none;
    }
    .field-select:focus { border-color: #3b82f6; }
    .feedback-ok {
      display: flex; align-items: center; gap: 4px;
      font-size: 12px; color: #15803d; margin: 8px 0 0;
      animation: fadeIn .3s;
    }
    .feedback-ok mat-icon { font-size: 14px; width: 14px; height: 14px; }

    /* Archivos */
    .archivos-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
    .archivo-item {
      display: flex; align-items: center; gap: 12px;
      padding: 10px 12px; background: #f8fafc;
      border-radius: 8px; border: 1px solid #e2e8f0;
    }
    .archivo-icon { color: #64748b; font-size: 22px; width: 22px; height: 22px; }
    .archivo-info { flex: 1; min-width: 0; }
    .archivo-nombre {
      font-size: 13px; font-weight: 500; color: #3b82f6;
      text-decoration: none; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;
    }
    .archivo-nombre:hover { text-decoration: underline; }
    .archivo-meta { font-size: 11px; color: #94a3b8; margin: 2px 0 0; }
    .btn-icon-danger {
      width: 28px; height: 28px; border: none; background: transparent;
      color: #94a3b8; cursor: pointer; border-radius: 6px;
      display: flex; align-items: center; justify-content: center;
      transition: color .15s, background .15s; flex-shrink: 0;
    }
    .btn-icon-danger:hover { color: #dc2626; background: #fef2f2; }
    .btn-icon-danger mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .upload-zone {
      border: 2px dashed #e2e8f0; border-radius: 10px;
      padding: 24px; text-align: center; cursor: default;
      transition: border-color .15s, background .15s;
    }
    .upload-zone--dragging { border-color: #3b82f6; background: #eff6ff; }
    .upload-zone mat-icon { font-size: 32px; width: 32px; height: 32px; color: #94a3b8; }
    .upload-zone p { font-size: 13px; color: #64748b; margin: 8px 0 0; }
    .upload-hint { font-size: 11px; color: #94a3b8 !important; margin-top: 4px !important; }
    .upload-link { color: #3b82f6; cursor: pointer; text-decoration: underline; }
    .upload-progress { display: flex; align-items: center; gap: 8px; justify-content: center; margin-top: 10px; font-size: 13px; color: #64748b; }
    .empty-state { font-size: 13px; color: #94a3b8; margin: 0 0 12px; }

    /* Comentarios */
    .comentarios-list { display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; }
    .empty-comentarios { font-size: 13px; color: #94a3b8; text-align: center; padding: 24px 0; margin: 0; }
    .comentario { background: #f8fafc; border-radius: 8px; padding: 14px; border-left: 3px solid #e2e8f0; }
    .comentario--interno { background: #fefce8; border-left-color: #facc15; }
    .comentario__header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
    .comentario__avatar { width: 30px; height: 30px; border-radius: 50%; background: #3b82f6; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; flex-shrink: 0; }
    .comentario--interno .comentario__avatar { background: #ca8a04; }
    .comentario__autor { font-size: 13px; font-weight: 600; color: #1e293b; margin: 0; display: flex; align-items: center; gap: 6px; }
    .comentario__fecha { font-size: 11px; color: #94a3b8; margin: 0; }
    .comentario__texto { font-size: 14px; color: #374151; margin: 0; line-height: 1.6; }
    .badge-interno { background: #fef9c3; color: #854d0e; border-radius: 4px; padding: 1px 6px; font-size: 10px; font-weight: 500; }
    .nuevo-comentario { border-top: 1px solid #f1f5f9; padding-top: 16px; display: flex; flex-direction: column; gap: 10px; }
    .field-textarea { width: 100%; box-sizing: border-box; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; font-size: 14px; color: #1e293b; font-family: inherit; resize: vertical; outline: none; }
    .field-textarea:focus { border-color: #3b82f6; }
    .nuevo-comentario__actions { display: flex; justify-content: space-between; align-items: center; }
    .check-interno { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #475569; cursor: pointer; }

    /* Meta */
    .meta-list { display: flex; flex-direction: column; gap: 14px; }
    .meta-item { display: flex; flex-direction: column; gap: 2px; }
    .meta-key { font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: .5px; margin: 0; }
    .meta-val { font-size: 13px; color: #1e293b; margin: 0; }
    .meta-val--vencida { color: #b91c1c; font-weight: 600; }

    /* Buttons */
    .btn-primary { display: flex; align-items: center; gap: 6px; background: #3b82f6; color: #fff; border: none; border-radius: 8px; padding: 9px 18px; font-size: 14px; font-weight: 500; cursor: pointer; transition: background .15s; white-space: nowrap; }
    .btn-primary:hover:not(:disabled) { background: #2563eb; }
    .btn-primary:disabled { opacity: .6; cursor: not-allowed; }
    .btn-primary mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .btn-spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,.4); border-top-color: #fff; border-radius: 50%; animation: spin .7s linear infinite; display: inline-block; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Badges */
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

    .loading-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 64px; gap: 12px; color: #94a3b8; }
    .spinner { width: 32px; height: 32px; border: 3px solid #e2e8f0; border-top-color: #3b82f6; border-radius: 50%; animation: spin .8s linear infinite; }
  `],
})
export class SolicitudesDetailComponent implements OnInit, OnDestroy {
  private readonly route       = inject(ActivatedRoute);
  private readonly router      = inject(Router);
  private readonly svc         = inject(SolicitudesService);
  private readonly usuariosSvc = inject(UsuariosService);
  private readonly signalr     = inject(SignalRService);
  private sub?: Subscription;

  readonly auth = inject(AuthService);
  readonly EstadoSolicitud = EstadoSolicitud;

  readonly solicitud       = signal<Solicitud | null>(null);
  readonly comentarios     = signal<Comentario[]>([]);
  readonly archivos        = signal<ArchivoAdjunto[]>([]);
  readonly consultores     = signal<{ id: string; nombre: string }[]>([]);
  readonly loading         = signal(true);
  readonly guardando       = signal(false);
  readonly enviando        = signal(false);
  readonly subiendo        = signal(false);
  readonly reasignando     = signal(false);
  readonly estadoActualizado = signal(false);
  readonly reasignadoOk    = signal(false);
  readonly dragging        = signal(false);

  nuevoTexto = '';
  esInterno = false;
  consultorSeleccionado: string | null = null;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.cargar(id);
    this.cargarComentarios(id);
    this.cargarArchivos(id);

    if (this.auth.isGestor()) {
      this.usuariosSvc.getAll().subscribe(usuarios => {
        this.consultores.set(
          usuarios
            .filter(u => u.rol >= 2) // Gestor y Admin
            .map(u => ({ id: u.id, nombre: u.nombre }))
        );
      });
    }

    this.sub = this.signalr.estadoCambiado$.subscribe(evt => {
      if (evt.solicitudId === id) {
        this.cargar(id);
        this.estadoActualizado.set(true);
        setTimeout(() => this.estadoActualizado.set(false), 4000);
      }
    });

    this.signalr.comentarioAgregado$.subscribe(evt => {
      if (evt.solicitudId === id) this.cargarComentarios(id);
    });
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }

  cargar(id: string): void {
    this.svc.getById(id).subscribe(s => {
      this.solicitud.set(s);
      this.consultorSeleccionado = s.consultorAsignadoId;
      this.loading.set(false);
    });
  }

  cargarComentarios(id: string): void {
    this.svc.getComentarios(id).subscribe(c => this.comentarios.set(c));
  }

  cargarArchivos(id: string): void {
    this.svc.getArchivos(id).subscribe(a => this.archivos.set(a));
  }

  avanzar(id: string, estado: EstadoSolicitud): void {
    this.guardando.set(true);
    this.svc.cambiarEstado(id, estado).subscribe({
      next: () => { this.cargar(id); this.guardando.set(false); },
      error: () => this.guardando.set(false),
    });
  }

  reasignar(id: string): void {
    this.reasignando.set(true);
    this.svc.reasignar(id, this.consultorSeleccionado).subscribe({
      next: () => {
        this.reasignando.set(false);
        this.reasignadoOk.set(true);
        this.cargar(id);
        setTimeout(() => this.reasignadoOk.set(false), 3000);
      },
      error: () => this.reasignando.set(false),
    });
  }

  agregarComentario(id: string): void {
    if (!this.nuevoTexto.trim()) return;
    this.enviando.set(true);
    this.svc.agregarComentario(id, this.nuevoTexto, this.esInterno).subscribe({
      next: () => {
        this.nuevoTexto = '';
        this.esInterno = false;
        this.cargarComentarios(id);
        this.enviando.set(false);
      },
      error: () => this.enviando.set(false),
    });
  }

  onFileSelected(event: Event, solicitudId: string): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) this.subirArchivo(input.files[0], solicitudId);
  }

  onDrop(event: DragEvent, solicitudId: string): void {
    event.preventDefault();
    this.dragging.set(false);
    const file = event.dataTransfer?.files[0];
    if (file) this.subirArchivo(file, solicitudId);
  }

  subirArchivo(file: File, solicitudId: string): void {
    this.subiendo.set(true);
    this.svc.subirArchivo(solicitudId, file).subscribe({
      next: () => { this.cargarArchivos(solicitudId); this.subiendo.set(false); },
      error: () => this.subiendo.set(false),
    });
  }

  eliminarArchivo(solicitudId: string, archivoId: string): void {
    if (!confirm('¿Eliminar este archivo?')) return;
    this.svc.eliminarArchivo(solicitudId, archivoId).subscribe({
      next: () => this.cargarArchivos(solicitudId),
    });
  }

  slaVencida(s: Solicitud): boolean {
    if (!s.fechaLimite) return false;
    const cerrada = s.estado === EstadoSolicitud.Completada || s.estado === EstadoSolicitud.Rechazada;
    return !cerrada && new Date(s.fechaLimite) < new Date();
  }

  iconoArchivo(contentType: string): string {
    if (contentType.startsWith('image/')) return 'image';
    if (contentType === 'application/pdf') return 'picture_as_pdf';
    if (contentType.includes('spreadsheet') || contentType.includes('excel')) return 'table_chart';
    if (contentType.includes('word')) return 'description';
    return 'attach_file';
  }

  formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  inicial(nombre: string): string { return nombre.charAt(0).toUpperCase(); }
  estadoLabel(s: Solicitud): string { return ESTADO_LABELS[s.estado] ?? ''; }
  prioridadLabel(s: Solicitud): string { return PRIORIDAD_LABELS[s.prioridad] ?? ''; }
  volver(): void { this.router.navigate(['/solicitudes']); }
}
