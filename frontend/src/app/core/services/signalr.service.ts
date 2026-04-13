import { Injectable, inject } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export interface EstadoCambiadoEvent {
  solicitudId: string;
  tenantId: string;
  estadoAnterior: number;
  nuevoEstado: number;
}

export interface ComentarioAgregadoEvent {
  solicitudId: string;
  usuarioNombre: string;
  texto: string;
}

@Injectable({ providedIn: 'root' })
export class SignalRService {
  private readonly auth = inject(AuthService);
  private hub?: signalR.HubConnection;

  readonly estadoCambiado$    = new Subject<EstadoCambiadoEvent>();
  readonly comentarioAgregado$ = new Subject<ComentarioAgregadoEvent>();

  connect(tenantId: string): void {
    if (this.hub) return; // ya conectado

    const hubUrl = environment.apiUrl.replace(/\/api$/, '') + '/hubs/solicitudes';

    this.hub = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        // Pasa el JWT en cada request de SignalR (query string para WebSocket, header para HTTP)
        accessTokenFactory: () => this.auth.getToken().then(t => t ?? ''),
      })
      .withAutomaticReconnect()
      .build();

    this.hub.on('EstadoCambiado', (event: EstadoCambiadoEvent) =>
      this.estadoCambiado$.next(event));

    this.hub.on('ComentarioAgregado', (event: ComentarioAgregadoEvent) =>
      this.comentarioAgregado$.next(event));

    this.hub
      .start()
      .then(() => this.hub!.invoke('UnirseATenant', tenantId))
      .catch(err => console.error('[SignalR] Error al conectar:', (err as Error)?.message ?? 'error desconocido'));
  }

  disconnect(): void {
    this.hub?.stop();
    this.hub = undefined;
  }
}
