import { AgendaGledis } from "@/components/agenda/AgendaGledis";

export const metadata = {
  title: "Agenda de Gledys | Shop",
  description:
    "Agenda rápida con notas grandes, fechas, horarios y contexto operativo para Gledys.",
};

export default function AgendaPage() {
  return <AgendaGledis />;
}
