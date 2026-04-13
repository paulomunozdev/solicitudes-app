import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { ArchivoAdjunto, Comentario, CrearSolicitudRequest, Solicitud } from '../models/solicitud.model';
import { environment } from '../../../environments/environment';

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface SolicitudesStats {
  total: number;
  pendientes: number;
  enRevision: number;
  enDesarrollo: number;
  completadas: number;
  rechazadas: number;
  porDia: { fecha: string; cantidad: number }[];
  porBu: { nombre: string; cantidad: number }[];
  porCategoria: { nombre: string; cantidad: number }[];
  porPrioridad: { nombre: string; cantidad: number }[];
  tiempoPromedioResolucionDias: number;
  sinAsignar: number;
  porResolutor: { nombre: string; asignadas: number; completadas: number }[];
}

export interface SolicitudesFilter {
  estado?: number;
  prioridad?: number;
  busqueda?: string;
  page?: number;
  pageSize?: number;
  soloMias?: boolean;
  soloActivas?: boolean;
  soloCerradas?: boolean;
  soloAsignadaAMi?: boolean;
}

@Injectable({ providedIn: 'root' })
export class SolicitudesService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/solicitudes`;

  getAll(filter: SolicitudesFilter = {}): Observable<PagedResult<Solicitud>> {
    let params = new HttpParams();
    if (filter.estado != null)        params = params.set('estado',          filter.estado);
    if (filter.prioridad != null)     params = params.set('prioridad',       filter.prioridad);
    if (filter.busqueda)              params = params.set('busqueda',         filter.busqueda);
    if (filter.page)                  params = params.set('page',             filter.page);
    if (filter.pageSize)              params = params.set('pageSize',         filter.pageSize);
    if (filter.soloMias)              params = params.set('soloMias',         true);
    if (filter.soloActivas)           params = params.set('soloActivas',      true);
    if (filter.soloCerradas)          params = params.set('soloCerradas',     true);
    if (filter.soloAsignadaAMi)       params = params.set('soloAsignadaAMi',  true);
    return this.http.get<PagedResult<Solicitud>>(this.base, { params }).pipe(timeout(15000));
  }

  getStats(): Observable<SolicitudesStats> {
    return this.http.get<SolicitudesStats>(`${this.base}/stats`).pipe(timeout(15000));
  }

  getById(id: string): Observable<Solicitud> {
    return this.http.get<Solicitud>(`${this.base}/${id}`).pipe(timeout(15000));
  }

  crear(request: CrearSolicitudRequest): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(this.base, request);
  }

  cambiarEstado(id: string, nuevoEstado: number): Observable<void> {
    return this.http.patch<void>(`${this.base}/${id}/estado`, { nuevoEstado });
  }

  reasignar(id: string, consultorId: string | null): Observable<void> {
    return this.http.patch<void>(`${this.base}/${id}/reasignar`, { consultorId });
  }

  getComentarios(id: string): Observable<Comentario[]> {
    return this.http.get<Comentario[]>(`${this.base}/${id}/comentarios`);
  }

  agregarComentario(id: string, texto: string, esInterno: boolean): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(`${this.base}/${id}/comentarios`, { texto, esInterno });
  }

  getArchivos(id: string): Observable<ArchivoAdjunto[]> {
    return this.http.get<ArchivoAdjunto[]>(`${this.base}/${id}/archivos`);
  }

  subirArchivo(id: string, archivo: File): Observable<{ id: string }> {
    const formData = new FormData();
    formData.append('archivo', archivo, archivo.name);
    return this.http.post<{ id: string }>(`${this.base}/${id}/archivos`, formData);
  }

  eliminarArchivo(solicitudId: string, archivoId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${solicitudId}/archivos/${archivoId}`);
  }

  exportarExcel(filter: Omit<SolicitudesFilter, 'page' | 'pageSize' | 'soloAsignadaAMi'> = {}): Observable<Blob> {
    let params = new HttpParams();
    if (filter.estado != null)    params = params.set('estado',       filter.estado);
    if (filter.prioridad != null) params = params.set('prioridad',    filter.prioridad);
    if (filter.busqueda)          params = params.set('busqueda',      filter.busqueda);
    if (filter.soloMias)          params = params.set('soloMias',      true);
    if (filter.soloActivas)       params = params.set('soloActivas',   true);
    if (filter.soloCerradas)      params = params.set('soloCerradas',  true);
    return this.http.get(`${this.base}/export`, { params, responseType: 'blob' });
  }
}
