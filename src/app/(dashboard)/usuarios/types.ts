export interface Usuario {
  id: string;
  name: string | null;
  email: string;
  role: string;
  horarioEntrada: string | null;
  horarioSalida: string | null;
  diasTrabajo: string | null;
  createdAt: string;
  /** false = invitado que todavía no definió su contraseña (acceso pendiente) */
  tienePassword?: boolean;
  emailVerified?: string | null;
}
