import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Categoria {
  id: string;
  nombre: string;
  color: string;
  activo: boolean;
}

@Injectable({ providedIn: 'root' })
export class CategoriasService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/categorias`;

  getAll(soloActivas = false): Observable<Categoria[]> {
    return this.http.get<Categoria[]>(this.base, {
      params: soloActivas ? { soloActivas: 'true' } : {},
    });
  }

  crear(nombre: string, color: string): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(this.base, { nombre, color });
  }

  actualizar(id: string, nombre: string, color: string, activo: boolean): Observable<void> {
    return this.http.put<void>(`${this.base}/${id}`, { nombre, color, activo });
  }

  eliminar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
