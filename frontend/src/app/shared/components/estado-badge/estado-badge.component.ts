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
    :host { display: inline-block; }
    .badge {
      display: inline-flex; align-items: center; gap: 6px;
      height: 22px; padding: 0 8px 0 7px;
      border-radius: 9999px; font-size: 12px; font-weight: 500;
      line-height: 1; white-space: nowrap; border: 1px solid transparent;
      font-family: inherit;
    }
    .badge::before {
      content: ""; width: 6px; height: 6px;
      border-radius: 50%; background: currentColor;
      opacity: 0.85; flex-shrink: 0;
    }
    .badge--1 { color: oklch(0.45 0.130 65);  background: oklch(0.96 0.045 80); }
    .badge--2 { color: oklch(0.42 0.160 259); background: oklch(0.96 0.030 259); }
    .badge--3 { color: oklch(0.42 0.140 295); background: oklch(0.96 0.030 295); }
    .badge--4 { color: oklch(0.42 0.120 155); background: oklch(0.96 0.035 155); }
    .badge--5 { color: oklch(0.45 0.150 25);  background: oklch(0.95 0.035 25); }
  `]
})
export class EstadoBadgeComponent {
  readonly estado = input.required<EstadoSolicitud>();
  get label() { return () => ESTADO_LABELS[this.estado()] ?? ''; }
}
