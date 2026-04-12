import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { Subject } from 'rxjs';
import { environment } from '../../../environments/environment';

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
  private hub?: signalR.HubConnection;
  readonly estadoCambiado$ = new Subject<EstadoCambiadoEvent>();
  readonly comentarioAgregado$ = new Subject<ComentarioAgregadoEvent>();

  connect(tenantId: string): void {
    if (this.hub) return; // ya conectado
    this.hub = new signalR.HubConnectionBuilder()
      .withUrl(`${environment.apiUrl.replace(/\/api$/, '')}/hubs/solicitudes`)
      .withAutomaticReconnect()
      .build();

    this.hub.on('EstadoCambiado', (event: EstadoCambiadoEvent) =>
      this.estadoCambiado$.next(event));

    this.hub.on('ComentarioAgregado', (event: ComentarioAgregadoEvent) =>
      this.comentarioAgregado$.next(event));

    this.hub
      .start()
      .then(() => this.hub!.invoke('UnirseATenant', tenantId))
      .catch(console.error);
  }

  disconnect(): void {
    this.hub?.stop();
    this.hub = undefined;
  }
}
