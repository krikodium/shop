export interface Usuario {
  id: string;
  name: string | null;
  email: string;
  role: string;
  horarioEntrada: string | null;
  horarioSalida: string | null;
  diasTrabajo: string | null;
  createdAt: string;
}
