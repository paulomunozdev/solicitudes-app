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
    :host { display: block; padding: 28px 32px; }

    .page-header { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
    .page-title { font-size: 22px; font-weight: 600; color: var(--text-primary, #161b26); letter-spacing: -0.015em; margin: 0; }
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

    .content-grid { display: flex; gap: 24px; align-items: flex-start; max-width: 1200px; margin: 0 auto; }
    .main-col { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 16px; }
    .meta-col { width: 280px; flex-shrink: 0; display: flex; flex-direction: column; gap: 12px; position: sticky; top: 24px; }

    .card { background: var(--n-0, #fff); border: 1px solid var(--border-subtle, #e9ecf2); border-radius: 12px; overflow: hidden; }
    .card-header { display: flex; gap: 8px; margin-bottom: 16px; align-items: center; flex-wrap: wrap; }
    .card-title { font-size: 12px; font-weight: 600; color: var(--text-muted, #8a92a3); margin: 0 0 14px; text-transform: uppercase; letter-spacing: 0.07em; }

    .solicitud-titulo { font-size: 22px; font-weight: 600; color: var(--text-primary, #161b26); letter-spacing: -0.015em; margin: 0 0 12px; line-height: 1.25; }
    .solicitud-desc { font-size: 14px; color: var(--text-secondary, #353c4d); line-height: 1.65; margin: 0; }

    .badge-realtime {
      display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; margin-bottom: 12px;
      background: oklch(0.96 0.035 155); border: 1px solid oklch(0.88 0.060 155);
      border-radius: 8px; color: oklch(0.42 0.120 155); font-size: 12px; font-weight: 500;
      animation: fadeIn 200ms ease;
    }
    .badge-realtime__dot {
      width: 7px; height: 7px; border-radius: 50%; background: oklch(0.55 0.150 155);
      animation: pulse-dot 1.8s ease-in-out infinite; flex-shrink: 0;
    }
    @keyframes pulse-dot { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.8); } }
    .badge-sla {
      display: inline-flex; align-items: center; gap: 8px; padding: 10px 14px; margin-bottom: 16px;
      background: oklch(0.95 0.035 25); border: 1px solid oklch(0.88 0.060 25);
      border-radius: 8px; color: oklch(0.45 0.150 25); font-size: 12.5px; font-weight: 500;
    }
    .badge-sla mat-icon, .badge-realtime mat-icon { font-size: 16px; width: 16px; height: 16px; flex-shrink: 0; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }

    /* Acciones */
    .accion-buttons { display: flex; flex-direction: column; gap: 8px; }
    .btn-accion {
      display: flex; align-items: center; justify-content: center; gap: 7px;
      width: 100%; height: 36px; border-radius: 8px; font-size: 13px; font-weight: 500;
      border: 1px solid; cursor: pointer; font-family: inherit;
      transition: background 120ms ease, border-color 120ms ease;
    }
    .btn-accion:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-accion mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .btn-accion--primary { background: var(--n-900, #161b26); color: #fff; border-color: var(--n-900, #161b26); }
    .btn-accion--primary:hover:not(:disabled) { background: var(--n-800, #232937); }
    .btn-accion--success { background: var(--n-900, #161b26); color: #fff; border-color: var(--n-900, #161b26); }
    .btn-accion--success:hover:not(:disabled) { background: var(--n-800, #232937); }
    .btn-accion--danger { background: var(--n-0, #fff); color: oklch(0.45 0.150 25); border-color: var(--border-default, #dfe3eb); }
    .btn-accion--danger:hover:not(:disabled) { background: oklch(0.95 0.035 25); border-color: oklch(0.88 0.060 25); }
    .estado-cerrado { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text-tertiary, #6b7386); margin: 0; }
    .estado-cerrado mat-icon { font-size: 17px; width: 17px; height: 17px; }

    /* Reasignación */
    .reasignar-row { display: flex; gap: 8px; align-items: center; }
    .field-select {
      flex: 1; height: 36px; padding: 0 30px 0 10px;
      background: var(--n-0, #fff); border: 1px solid var(--border-default, #dfe3eb);
      border-radius: 8px; font-size: 13px; color: var(--text-primary, #161b26);
      font-family: inherit; outline: none; appearance: none;
      background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%236b7386' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
      background-repeat: no-repeat; background-position: right 10px center;
      transition: border-color 120ms ease;
    }
    .field-select:focus { border-color: oklch(0.55 0.190 259); }
    .feedback-ok { display: flex; align-items: center; gap: 6px; font-size: 12.5px; color: oklch(0.42 0.120 155); padding: 6px 0; }
    .feedback-ok mat-icon { font-size: 15px; width: 15px; height: 15px; }

    /* Archivos */
    .archivos-list { display: flex; flex-direction: column; gap: 0; }
    .archivo-item {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 20px; border-bottom: 1px solid var(--border-subtle, #e9ecf2);
      transition: background 120ms ease;
    }
    .archivo-item:last-child { border-bottom: none; }
    .archivo-item:hover { background: var(--n-25, #fcfcfd); }
    .archivo-icon { font-size: 18px; width: 18px; height: 18px; color: var(--text-muted, #8a92a3); }
    .archivo-info { flex: 1; min-width: 0; }
    .archivo-nombre {
      font-size: 13px; font-weight: 500; color: var(--text-link, oklch(0.48 0.185 259));
      text-decoration: none; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;
    }
    .archivo-nombre:hover { text-decoration: underline; }
    .archivo-meta { font-size: 11.5px; color: var(--text-muted, #8a92a3); margin-top: 2px; }
    .btn-icon-danger {
      width: 28px; height: 28px; border: none; background: transparent;
      color: var(--text-muted, #8a92a3); cursor: pointer; border-radius: 6px;
      display: flex; align-items: center; justify-content: center;
      transition: color 120ms ease, background 120ms ease; flex-shrink: 0; opacity: 0;
    }
    .archivo-item:hover .btn-icon-danger { opacity: 1; }
    .btn-icon-danger:hover { color: oklch(0.45 0.150 25); background: oklch(0.95 0.035 25); }
    .btn-icon-danger mat-icon { font-size: 16px; width: 16px; height: 16px; }

    .upload-zone {
      margin: 0 20px 20px;
      border: 1.5px dashed var(--border-default, #dfe3eb); border-radius: 10px;
      padding: 24px; text-align: center; cursor: pointer;
      transition: border-color 120ms ease, background 120ms ease;
    }
    .upload-zone--dragging, .upload-zone:hover { border-color: oklch(0.55 0.190 259); background: oklch(0.97 0.020 259); }
    .upload-zone mat-icon { font-size: 28px; width: 28px; height: 28px; color: var(--text-muted, #8a92a3); display: block; margin: 0 auto 8px; }
    .upload-zone p { font-size: 13px; color: var(--text-secondary, #353c4d); font-weight: 500; margin: 0; }
    .upload-hint { font-size: 12px; color: var(--text-muted, #8a92a3) !important; margin-top: 4px !important; }
    .upload-link { color: oklch(0.48 0.185 259); cursor: pointer; text-decoration: underline; }
    .upload-progress { display: flex; align-items: center; gap: 8px; justify-content: center; margin-top: 10px; font-size: 13px; color: var(--text-tertiary, #6b7386); }
    .empty-state { font-size: 13px; color: var(--text-muted, #8a92a3); margin: 0 20px 16px; }

    /* Comentarios */
    .comentarios-list { display: flex; flex-direction: column; gap: 0; padding: 4px 20px 0; }
    .empty-comentarios { font-size: 13px; color: var(--text-muted, #8a92a3); text-align: center; padding: 24px 0; margin: 0; }
    .comentario { display: flex; gap: 12px; padding: 16px 0; border-bottom: 1px solid var(--border-subtle, #e9ecf2); position: relative; }
    .comentario:last-child { border-bottom: none; }
    .comentario:not(:last-child)::before {
      content: ""; position: absolute; left: 15px; top: 48px; bottom: -16px;
      width: 1px; background: var(--border-subtle, #e9ecf2);
    }
    .comentario--interno { background: none; }
    .comentario__header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; flex-wrap: wrap; }
    .comentario__avatar {
      width: 32px; height: 32px; border-radius: 50%;
      background: oklch(0.55 0.190 259); color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-size: 12px; font-weight: 600; flex-shrink: 0; position: relative; z-index: 1;
    }
    .comentario--interno .comentario__avatar { background: oklch(0.65 0.150 75); }
    .comentario__body { flex: 1; min-width: 0; }
    .comentario__autor { font-size: 13px; font-weight: 600; color: var(--text-primary, #161b26); margin: 0; }
    .comentario__fecha { font-size: 12px; color: var(--text-muted, #8a92a3); margin: 0; font-variant-numeric: tabular-nums; }
    .comentario__texto { font-size: 13.5px; color: var(--text-secondary, #353c4d); margin: 0; line-height: 1.6; white-space: pre-wrap; }
    .badge-interno {
      display: inline-flex; align-items: center; height: 18px; padding: 0 7px;
      border-radius: 9999px; font-size: 10.5px; font-weight: 600;
      background: oklch(0.96 0.045 80); color: oklch(0.45 0.130 65);
      letter-spacing: 0.03em; text-transform: uppercase;
    }
    .nuevo-comentario { padding: 16px 20px 20px; border-top: 1px solid var(--border-subtle, #e9ecf2); display: flex; flex-direction: column; gap: 10px; }
    .field-textarea {
      width: 100%; min-height: 80px; padding: 10px 12px;
      background: var(--n-0, #fff); border: 1px solid var(--border-default, #dfe3eb);
      border-radius: 8px; font-size: 13.5px; color: var(--text-primary, #161b26);
      font-family: inherit; resize: vertical; outline: none; line-height: 1.55;
      transition: border-color 120ms ease, box-shadow 120ms ease;
    }
    .field-textarea:focus { border-color: oklch(0.55 0.190 259); box-shadow: 0 0 0 3px oklch(0.78 0.130 259 / 0.20); }
    .nuevo-comentario__actions { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
    .check-interno { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; color: var(--text-secondary, #353c4d); user-select: none; }
    .check-interno input[type="checkbox"] { width: 15px; height: 15px; accent-color: oklch(0.55 0.190 259); cursor: pointer; }

    /* Meta sidebar */
    .meta-list { display: flex; flex-direction: column; gap: 0; }
    .meta-item { display: flex; align-items: flex-start; gap: 10px; padding: 11px 16px; border-bottom: 1px solid var(--border-subtle, #e9ecf2); }
    .meta-item:last-child { border-bottom: none; }
    .meta-item__icon { width: 20px; flex-shrink: 0; margin-top: 1px; }
    .meta-item__icon mat-icon { font-size: 15px; width: 15px; height: 15px; color: var(--text-muted, #8a92a3); }
    .meta-key { font-size: 11.5px; color: var(--text-muted, #8a92a3); margin: 0 0 2px; }
    .meta-val { font-size: 13px; color: var(--text-primary, #161b26); margin: 0; font-weight: 500; }
    .meta-val--vencida { color: oklch(0.45 0.150 25); font-weight: 600; }

    /* Card header title */
    .card-section-title { padding: 14px 16px; border-bottom: 1px solid var(--border-subtle, #e9ecf2); font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-muted, #8a92a3); }

    /* Buttons */
    .btn-primary {
      display: inline-flex; align-items: center; gap: 6px; height: 34px; padding: 0 14px;
      border-radius: 8px; font-size: 13px; font-weight: 500;
      background: var(--n-900, #161b26); color: #fff; border: none;
      cursor: pointer; font-family: inherit; white-space: nowrap;
      transition: background 120ms ease;
    }
    .btn-primary:hover:not(:disabled) { background: var(--n-800, #232937); }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-primary mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .btn-spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.35); border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Badges */
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

    .loading-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 64px; gap: 12px; color: var(--text-muted, #8a92a3); }
    .spinner { width: 28px; height: 28px; border: 3px solid var(--border-default, #dfe3eb); border-top-color: oklch(0.55 0.190 259); border-radius: 50%; animation: spin 0.8s linear infinite; }
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
