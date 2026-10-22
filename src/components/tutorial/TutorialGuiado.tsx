"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  Sparkles,
  ShoppingCart,
  Package,
  Users,
  Calendar,
  Wallet,
  CheckCircle2,
  X,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "shop_tutorial_completado_v1";
const EVENTO_INICIAR = "shop:iniciar-tutorial";

export interface PasoTutorial {
  id: string;
  titulo: string;
  subtitulo: string;
  descripcion: string;
  puntosClave: string[];
  icono: React.ComponentType<{ className?: string }>;
  linkDirecto?: { href: string; label: string };
}

export const PASOS_TUTORIAL: PasoTutorial[] = [
  {
    id: "bienvenida",
    titulo: "Bienvenida a Hermanas Caradonti Shop",
    subtitulo: "Recorrido inicial del sistema",
    descripcion:
      "Esta plataforma centraliza la gestión del showroom: registro de ventas, control de inventario de prendas y accesorios, pedidos personalizados y caja diaria.",
    puntosClave: [
      "Operación rápida pensada para mostrador y celular.",
      "Ventas con pago completo o seña inicial.",
      "Agenda sincronizada para el equipo.",
    ],
    icono: Sparkles,
  },
  {
    id: "ventas",
    titulo: "Registro de Ventas y Cobros",
    subtitulo: "Punto de Venta / Mostrador",
    descripcion:
      "Desde el botón “+ Venta” podés cargar una compra en segundos. Buscá artículos por nombre o código SKU, asigná una clienta y definí el método de cobro.",
    puntosClave: [
      "Cobros en Efectivo, Transferencia o combinados.",
      "Permite señas y cobros parciales con saldo pendiente.",
      "Emisión y visualización inmediata del ticket.",
    ],
    icono: ShoppingCart,
    linkDirecto: { href: "/ventas/nueva", label: "Abrir Punto de Venta" },
  },
  {
    id: "productos",
    titulo: "Mercadería y Control de Stock",
    subtitulo: "Catálogo e inventario físico",
    descripcion:
      "Mantené el stock actualizado. Podés revisar existencias disponibles, precios en pesos, costos de reposición y alertas de productos con bajo inventario.",
    puntosClave: [
      "Filtros por categoría, proveedor y stock.",
      "Ajustes rápidos de entrada y salida con motivo.",
      "Carga masiva desde planillas de cálculo.",
    ],
    icono: Package,
    linkDirecto: { href: "/productos", label: "Ver catálogo de productos" },
  },
  {
    id: "clientes",
    titulo: "Clientas y Cuentas Corrientes",
    subtitulo: "Fichas, WhatsApp y seguimiento",
    descripcion:
      "Gestioná la información de tus clientas frecuentes. Si una clienta dejó una seña por una prenda, el saldo a favor o pendiente queda registrado en su ficha.",
    puntosClave: [
      "Historial de compras asociado a cada persona.",
      "Teléfono para contacto rápido y entregas.",
      "Control de saldos sin saldar.",
    ],
    icono: Users,
    linkDirecto: { href: "/clientes", label: "Ver lista de clientas" },
  },
  {
    id: "agenda",
    titulo: "Agenda de Gledys y Encargos",
    subtitulo: "Coordinación diaria del showroom",
    descripcion:
      "Anotá pedidos especiales, retiros del día, reservas de prendas y tareas prioritarias para que todo el equipo esté al tanto de las novedades.",
    puntosClave: [
      "Notas rápidas con fecha y estado.",
      "Seguimiento de pedidos con seña y saldo.",
      "Organización visual por día.",
    ],
    icono: Calendar,
    linkDirecto: { href: "/agenda", label: "Ir a Agenda Gledys" },
  },
  {
    id: "caja",
    titulo: "Caja Chica y Gastos Diarios",
    subtitulo: "Control de efectivo en tienda",
    descripcion:
      "Registrá las salidas menores de efectivo (insumos, viáticos, pagos diarios) y consultá el balance acumulado para un arqueo de caja transparente.",
    puntosClave: [
      "Registro de ingresos y egresos al instante.",
      "Cierre mensual con desglose y exportación.",
      "Historial inalterable de movimientos.",
    ],
    icono: Wallet,
    linkDirecto: { href: "/caja-chica", label: "Abrir Caja Chica" },
  },
  {
    id: "final",
    titulo: "¡Todo listo para operar!",
    subtitulo: "Podés repasar cuando quieras",
    descripcion:
      "Ya conocés lo indispensable para gestionar el negocio. Si en algún momento querés volver a ver este recorrido, usá el botón de reiniciar tutorial en tu menú de usuario o en Ayuda.",
    puntosClave: [
      "Acceso disponible en cualquier momento.",
      "Documentación detallada en la sección Ayuda.",
      "Configuración de contraseñas seguras en tu perfil.",
    ],
    icono: CheckCircle2,
  },
];

/**
 * Disparador para reiniciar el tutorial desde cualquier parte del sistema.
 * Limpia el estado de completado, redirecciona al home si es necesario y emite el evento.
 */
export function reiniciarTutorialGlobal(router?: { push: (url: string) => void }) {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
  if (router && window.location.pathname !== "/") {
    router.push("/");
  }
  // Breve delay si hubo navegación para que el home esté montado
  setTimeout(() => {
    window.dispatchEvent(new CustomEvent(EVENTO_INICIAR));
  }, 100);
}

export function TutorialGuiado({ bloqueado = false }: { bloqueado?: boolean }) {
  const [abierto, setAbierto] = useState(false);
  const [pasoIndex, setPasoIndex] = useState(0);
  const router = useRouter();
  const pathname = usePathname();

  const iniciarDesdeCero = useCallback(() => {
    setPasoIndex(0);
    setAbierto(true);
  }, []);

  useEffect(() => {
    if (bloqueado) return;

    // Verificar si el usuario ya vio el tutorial
    try {
      const completado = localStorage.getItem(STORAGE_KEY);
      if (!completado) {
        // Primer ingreso: iniciar automáticamente
        const timer = setTimeout(() => {
          setAbierto(true);
        }, 600);
        return () => clearTimeout(timer);
      }
    } catch {}

    const handleEvento = () => {
      iniciarDesdeCero();
    };

    window.addEventListener(EVENTO_INICIAR, handleEvento);
    return () => window.removeEventListener(EVENTO_INICIAR, handleEvento);
  }, [bloqueado, iniciarDesdeCero]);

  const cerrarYOmitir = useCallback(() => {
    setAbierto(false);
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {}
  }, []);

  const pasoSiguiente = useCallback(() => {
    if (pasoIndex < PASOS_TUTORIAL.length - 1) {
      setPasoIndex((prev) => prev + 1);
    } else {
      cerrarYOmitir();
    }
  }, [pasoIndex, cerrarYOmitir]);

  const pasoAnterior = useCallback(() => {
    if (pasoIndex > 0) {
      setPasoIndex((prev) => prev - 1);
    }
  }, [pasoIndex]);

  const reiniciarAlHome = useCallback(() => {
    setPasoIndex(0);
    if (pathname !== "/") {
      router.push("/");
    }
  }, [pathname, router]);

  // Soporte de navegación por teclado
  useEffect(() => {
    if (!abierto) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        cerrarYOmitir();
      } else if (e.key === "ArrowRight") {
        pasoSiguiente();
      } else if (e.key === "ArrowLeft") {
        pasoAnterior();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [abierto, cerrarYOmitir, pasoSiguiente, pasoAnterior]);

  if (!abierto || bloqueado) return null;

  const paso = PASOS_TUTORIAL[pasoIndex];
  const IconoPaso = paso.icono;
  const esUltimo = pasoIndex === PASOS_TUTORIAL.length - 1;
  const progresoPorcentaje = ((pasoIndex + 1) / PASOS_TUTORIAL.length) * 100;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Tutorial guiado del sistema"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in-0 duration-200"
    >
      <div className="relative w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl text-card-foreground animate-in zoom-in-95 duration-200">
        {/* Cabecera con progreso y botón cerrar */}
        <div className="flex items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-xs">
              Paso {pasoIndex + 1} de {PASOS_TUTORIAL.length}
            </Badge>
            <span className="text-xs text-muted-foreground">{paso.subtitulo}</span>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={cerrarYOmitir}
            className="size-8 p-0 text-muted-foreground hover:text-foreground"
            aria-label="Omitir tutorial"
          >
            <X className="size-4" />
          </Button>
        </div>

        {/* Barra de progreso */}
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all duration-300 ease-out"
            style={{ width: `${progresoPorcentaje}%` }}
          />
        </div>

        {/* Contenido del paso actual */}
        <div className="pt-6 pb-4">
          <div className="flex items-start gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-foreground">
              <IconoPaso className="size-6" />
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-semibold tracking-tight text-foreground">
                {paso.titulo}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                {paso.descripcion}
              </p>
            </div>
          </div>

          {/* Lista de aspectos clave */}
          <div className="mt-4 rounded-lg border border-border/80 bg-muted/40 p-3.5">
            <ul className="space-y-2 text-xs text-muted-foreground">
              {paso.puntosClave.map((punto, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <span className="size-1.5 shrink-0 rounded-full bg-foreground" />
                  <span className="text-foreground/90">{punto}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Enlace opcional directo al módulo */}
          {paso.linkDirecto && (
            <div className="mt-3 text-right">
              <Link
                href={paso.linkDirecto.href}
                onClick={cerrarYOmitir}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground hover:underline"
              >
                <span>{paso.linkDirecto.label}</span>
                <ArrowRight className="size-3" />
              </Link>
            </div>
          )}
        </div>

        {/* Botonera de control inferior */}
        <div className="flex items-center justify-between border-t border-border pt-4">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={cerrarYOmitir}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Omitir
            </Button>

            {pasoIndex > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={reiniciarAlHome}
                title="Reiniciar y volver al inicio"
                className="text-xs text-muted-foreground hover:text-foreground gap-1 px-2"
              >
                <RotateCcw className="size-3" />
                <span className="hidden sm:inline">Reiniciar</span>
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={pasoAnterior}
              disabled={pasoIndex === 0}
              className="text-xs gap-1"
            >
              <ArrowLeft className="size-3.5" />
              Anterior
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={pasoSiguiente}
              className="text-xs gap-1"
            >
              <span>{esUltimo ? "Finalizar" : "Siguiente"}</span>
              {!esUltimo && <ArrowRight className="size-3.5" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
