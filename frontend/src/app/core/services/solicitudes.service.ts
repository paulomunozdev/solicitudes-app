import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CrearSolicitudRequest, Solicitud } from '../models/solicitud.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SolicitudesService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/solicitudes`;

  getAll(): Observable<Solicitud[]> {
    return this.http.get<Solicitud[]>(this.base);
  }

  getById(id: string): Observable<Solicitud> {
    return this.http.get<Solicitud>(`${this.base}/${id}`);
  }

  crear(request: CrearSolicitudRequest): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(this.base, request);
  }

  cambiarEstado(id: string, nuevoEstado: number): Observable<void> {
    return this.http.patch<void>(`${this.base}/${id}/estado`, { nuevoEstado });
  }

  getComentarios(id: string): Observable<import('../models/solicitud.model').Comentario[]> {
    return this.http.get<import('../models/solicitud.model').Comentario[]>(`${this.base}/${id}/comentarios`);
  }

  agregarComentario(id: string, texto: string, esInterno: boolean): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(`${this.base}/${id}/comentarios`, { texto, esInterno });
  }
}
