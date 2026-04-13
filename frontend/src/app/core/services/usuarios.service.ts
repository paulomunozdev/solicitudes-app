import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface UsuarioResumen {
  id: string;
  nombre: string;
  email: string;
  unidadNegocioNombre: string | null;
}

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private readonly http = inject(HttpClient);

  getByBu(bu: string): Observable<UsuarioResumen[]> {
    return this.http.get<UsuarioResumen[]>(
      `${environment.apiUrl}/usuarios?bu=${encodeURIComponent(bu)}`
    );
  }
}
