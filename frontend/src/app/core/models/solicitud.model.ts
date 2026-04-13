export enum EstadoSolicitud {
  Pendiente = 1,
  EnRevision = 2,
  EnDesarrollo = 3,
  Completada = 4,
  Rechazada = 5,
}

export enum PrioridadSolicitud {
  Baja = 1,
  Media = 2,
  Alta = 3,
  Critica = 4,
}

export const ESTADO_LABELS: Record<EstadoSolicitud, string> = {
  [EstadoSolicitud.Pendiente]: 'Pendiente',
  [EstadoSolicitud.EnRevision]: 'En Revisión',
  [EstadoSolicitud.EnDesarrollo]: 'En Desarrollo',
  [EstadoSolicitud.Completada]: 'Completada',
  [EstadoSolicitud.Rechazada]: 'Rechazada',
};

export const ESTADO_COLORS: Record<EstadoSolicitud, string> = {
  [EstadoSolicitud.Pendiente]: 'warn',
  [EstadoSolicitud.EnRevision]: 'accent',
  [EstadoSolicitud.EnDesarrollo]: 'primary',
  [EstadoSolicitud.Completada]: 'success',
  [EstadoSolicitud.Rechazada]: 'error',
};

export const PRIORIDAD_LABELS: Record<PrioridadSolicitud, string> = {
  [PrioridadSolicitud.Baja]: 'Baja',
  [PrioridadSolicitud.Media]: 'Media',
  [PrioridadSolicitud.Alta]: 'Alta',
  [PrioridadSolicitud.Critica]: 'Crítica',
};

export interface Solicitud {
  id: string;
  titulo: string;
  descripcion: string;
  estado: EstadoSolicitud;
  estadoNombre: string;
  prioridad: PrioridadSolicitud;
  prioridadNombre: string;
  categoria: string | null;
  unidadNegocio: string | null;
  nombreSolicitante: string | null;
  fechaLimite: string | null;
  usuarioCreadorId: string;
  usuarioCreadorNombre: string;
  consultorAsignadoId: string | null;
  consultorAsignadoNombre: string | null;
  creadoEn: string;
  actualizadoEn: string;
  totalComentarios: number;
}

export interface Comentario {
  id: string;
  texto: string;
  esInterno: boolean;
  usuarioNombre: string;
  creadoEn: string;
}

export interface CrearSolicitudRequest {
  titulo: string;
  descripcion: string;
  prioridad: PrioridadSolicitud;
  categoria?: string;
  unidadNegocio?: string;
  nombreSolicitante?: string;
  fechaLimite?: string;
}

export interface AgregarComentarioRequest {
  texto: string;
  esInterno: boolean;
}

export interface ArchivoAdjunto {
  id: string;
  nombreArchivo: string;
  blobUrl: string;
  contentType: string;
  tamanoBytes: number;
  subidoPorNombre: string;
  creadoEn: string;
}
