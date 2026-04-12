import { Component, input } from '@angular/core';
import { NgClass } from '@angular/common';
import { EstadoSolicitud, ESTADO_LABELS } from '../../../core/models/solicitud.model';

@Component({
  selector: 'app-estado-badge',
  standalone: true,
  imports: [NgClass],
  template: `
    <span class="badge" [ngClass]="'badge--' + estado()">
      {{ label() }}
    </span>
  `,
  styles: [`
    .badge {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
    }
    .badge--1 { background: #fff3e0; color: #e65100; }
    .badge--2 { background: #e3f2fd; color: #1565c0; }
    .badge--3 { background: #e8f5e9; color: #2e7d32; }
    .badge--4 { background: #f3e5f5; color: #6a1b9a; }
    .badge--5 { background: #ffebee; color: #b71c1c; }
  `]
})
export class EstadoBadgeComponent {
  readonly estado = input.required<EstadoSolicitud>();
  get label() { return () => ESTADO_LABELS[this.estado()] ?? ''; }
}
