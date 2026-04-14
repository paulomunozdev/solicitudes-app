import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface UsuarioResumen {
  id: string;
  nombre: string;
  email: string;
  foto: string | null;
  rol: number;
  rolNombre: string;
  unidadNegocioNombre: string | null;
  activo: boolean;
}

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private readonly http = inject(HttpClient);

  getAll(bu?: string): Observable<UsuarioResumen[]> {
    const url = bu
      ? `${environment.apiUrl}/usuarios?bu=${encodeURIComponent(bu)}`
      : `${environment.apiUrl}/usuarios`;
    return this.http.get<UsuarioResumen[]>(url);
  }

  getByBu(bu: string): Observable<UsuarioResumen[]> {
    return this.getAll(bu);
  }
}
