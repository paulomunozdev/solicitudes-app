import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Subscription } from 'rxjs';
import { SolicitudesService } from '../../../core/services/solicitudes.service';
import { SignalRService } from '../../../core/services/signalr.service';
import {
  Solicitud, Comentario, EstadoSolicitud, ESTADO_LABELS, PRIORIDAD_LABELS
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
              @if (estadoActualizado()) {
                <span class="badge-realtime">
                  <mat-icon>bolt</mat-icon> Estado actualizado en tiempo real
                </span>
              }
            </div>
            <h2 class="solicitud-titulo">{{ s.titulo }}</h2>
            <p class="solicitud-desc">{{ s.descripcion }}</p>
          </div>

          <!-- Cambiar estado -->
          <div class="card">
            <h3 class="card-title">Cambiar estado</h3>
            <div class="estado-form">
              <select class="field-select" [(ngModel)]="nuevoEstado">
                @for (e of estados; track e.value) {
                  <option [ngValue]="e.value">{{ e.label }}</option>
                }
              </select>
              <button class="btn-primary"
                [disabled]="nuevoEstado === s.estado || guardando()"
                (click)="cambiarEstado(s.id)">
                @if (guardando()) { <span class="btn-spinner"></span> } @else { Actualizar }
              </button>
            </div>
          </div>

          <!-- Comentarios -->
          <div class="card">
            <h3 class="card-title">Comentarios ({{ comentarios().length }})</h3>

            <!-- Lista -->
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

            <!-- Nuevo comentario -->
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
                <p class="meta-key">Solicitante</p>
                <p class="meta-val">{{ s.usuarioCreadorNombre }}</p>
              </div>
              @if (s.consultorAsignadoNombre) {
                <div class="meta-item">
                  <p class="meta-key">Asignado a</p>
                  <p class="meta-val">{{ s.consultorAsignadoNombre }}</p>
                </div>
              }
              @if (s.categoria) {
                <div class="meta-item">
                  <p class="meta-key">Categoría</p>
                  <p class="meta-val">{{ s.categoria }}</p>
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
    .badge-realtime mat-icon { font-size: 14px; width: 14px; height: 14px; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }

    .estado-form { display: flex; gap: 12px; align-items: center; }
    .field-select {
      flex: 1; border: 1px solid #e2e8f0; border-radius: 8px;
      padding: 9px 12px; font-size: 14px; color: #1e293b;
      outline: none; background: #fff; font-family: inherit; cursor: pointer;
    }

    /* Comentarios */
    .comentarios-list { display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; }
    .empty-comentarios { font-size: 13px; color: #94a3b8; text-align: center; padding: 24px 0; margin: 0; }

    .comentario { background: #f8fafc; border-radius: 8px; padding: 14px; border-left: 3px solid #e2e8f0; }
    .comentario--interno { background: #fefce8; border-left-color: #facc15; }
    .comentario__header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
    .comentario__avatar {
      width: 30px; height: 30px; border-radius: 50%;
      background: #3b82f6; color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-size: 12px; font-weight: 600; flex-shrink: 0;
    }
    .comentario--interno .comentario__avatar { background: #ca8a04; }
    .comentario__autor { font-size: 13px; font-weight: 600; color: #1e293b; margin: 0; display: flex; align-items: center; gap: 6px; }
    .comentario__fecha { font-size: 11px; color: #94a3b8; margin: 0; }
    .comentario__texto { font-size: 14px; color: #374151; margin: 0; line-height: 1.6; }
    .badge-interno { background: #fef9c3; color: #854d0e; border-radius: 4px; padding: 1px 6px; font-size: 10px; font-weight: 500; }

    .nuevo-comentario { border-top: 1px solid #f1f5f9; padding-top: 16px; display: flex; flex-direction: column; gap: 10px; }
    .field-textarea {
      width: 100%; box-sizing: border-box;
      border: 1px solid #e2e8f0; border-radius: 8px;
      padding: 10px 12px; font-size: 14px; color: #1e293b;
      font-family: inherit; resize: vertical; outline: none;
    }
    .field-textarea:focus { border-color: #3b82f6; }
    .nuevo-comentario__actions { display: flex; justify-content: space-between; align-items: center; }
    .check-interno { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #475569; cursor: pointer; }

    /* Meta */
    .meta-list { display: flex; flex-direction: column; gap: 14px; }
    .meta-item { display: flex; flex-direction: column; gap: 2px; }
    .meta-key { font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: .5px; margin: 0; }
    .meta-val { font-size: 13px; color: #1e293b; margin: 0; }

    /* Buttons */
    .btn-primary {
      display: flex; align-items: center; gap: 6px;
      background: #3b82f6; color: #fff;
      border: none; border-radius: 8px;
      padding: 9px 18px; font-size: 14px; font-weight: 500;
      cursor: pointer; transition: background .15s; white-space: nowrap;
    }
    .btn-primary:hover:not(:disabled) { background: #2563eb; }
    .btn-primary:disabled { opacity: .6; cursor: not-allowed; }
    .btn-primary mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .btn-spinner {
      width: 16px; height: 16px; border: 2px solid rgba(255,255,255,.4);
      border-top-color: #fff; border-radius: 50%;
      animation: spin .7s linear infinite; display: inline-block;
    }
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
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly svc = inject(SolicitudesService);
  private readonly signalr = inject(SignalRService);
  private sub?: Subscription;

  readonly solicitud = signal<Solicitud | null>(null);
  readonly comentarios = signal<Comentario[]>([]);
  readonly loading = signal(true);
  readonly guardando = signal(false);
  readonly enviando = signal(false);
  readonly estadoActualizado = signal(false);

  nuevoEstado: EstadoSolicitud = EstadoSolicitud.Pendiente;
  nuevoTexto = '';
  esInterno = false;

  readonly estados = Object.entries(ESTADO_LABELS).map(([value, label]) => ({
    value: Number(value) as EstadoSolicitud, label,
  }));

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.cargar(id);
    this.cargarComentarios(id);

    // SignalR — actualizar en tiempo real
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
      this.nuevoEstado = s.estado;
      this.loading.set(false);
    });
  }

  cargarComentarios(id: string): void {
    this.svc.getComentarios(id).subscribe(c => this.comentarios.set(c));
  }

  cambiarEstado(id: string): void {
    this.guardando.set(true);
    this.svc.cambiarEstado(id, Number(this.nuevoEstado) as EstadoSolicitud).subscribe({
      next: () => { this.cargar(id); this.guardando.set(false); },
      error: () => this.guardando.set(false),
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

  inicial(nombre: string): string { return nombre.charAt(0).toUpperCase(); }
  estadoLabel(s: Solicitud): string { return ESTADO_LABELS[s.estado] ?? ''; }
  prioridadLabel(s: Solicitud): string { return PRIORIDAD_LABELS[s.prioridad] ?? ''; }
  volver(): void { this.router.navigate(['/solicitudes']); }
}
