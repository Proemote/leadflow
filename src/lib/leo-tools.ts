import { ToolDef } from "./openrouter";
import { getServices } from "./services";
import { getAvailability, createBooking } from "./bookings";
import { Service } from "./types";

/** Contexto del interlocutor (en WhatsApp: el contacto real). */
export interface LeoContext {
  contactId?: string | null;
  phone?: string | null;
  name?: string | null;
}

/**
 * Herramientas que se ofrecen a Leo. `canBook` (solo WhatsApp real con
 * contacto) habilita la creación de reservas; el chat de prueba solo
 * puede consultar disponibilidad.
 */
export function buildBookingTools(canBook: boolean): ToolDef[] {
  const tools: ToolDef[] = [
    {
      type: "function",
      function: {
        name: "consultar_disponibilidad",
        description:
          "Devuelve las franjas horarias libres para un servicio en una fecha concreta. Úsala antes de proponer u ofrecer una hora.",
        parameters: {
          type: "object",
          properties: {
            servicio: { type: "string", description: "Nombre del servicio (del catálogo)." },
            fecha: { type: "string", description: "Fecha en formato YYYY-MM-DD." },
          },
          required: ["servicio", "fecha"],
        },
      },
    },
  ];

  if (canBook) {
    tools.push({
      type: "function",
      function: {
        name: "crear_reserva",
        description:
          "Crea una reserva/cita para el cliente tras confirmar el servicio, la fecha y la hora. La cita queda pendiente de confirmación por el equipo.",
        parameters: {
          type: "object",
          properties: {
            servicio: { type: "string", description: "Nombre del servicio (del catálogo)." },
            fecha: { type: "string", description: "Fecha en formato YYYY-MM-DD." },
            hora: { type: "string", description: "Hora de inicio en formato HH:mm (de las franjas libres)." },
            nombre_cliente: { type: "string", description: "Nombre del cliente, si lo ha dicho." },
            notas: { type: "string", description: "Notas opcionales (preferencias, etc.)." },
          },
          required: ["servicio", "fecha", "hora"],
        },
      },
    });
  }

  return tools;
}

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

function resolveService(services: Service[], query: string): Service | null {
  if (!query) return null;
  const q = norm(query);
  return (
    services.find((s) => norm(s.name) === q) ??
    services.find((s) => norm(s.name).includes(q) || q.includes(norm(s.name))) ??
    null
  );
}

function isValidDate(d: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(d);
}
function isValidTime(t: string): boolean {
  return /^\d{2}:\d{2}$/.test(t);
}

/** Ejecuta una herramienta y devuelve un objeto serializable como resultado. */
export async function runLeoTool(
  name: string,
  args: Record<string, unknown>,
  ctx: LeoContext
): Promise<Record<string, unknown>> {
  const services = await getServices(true);

  if (name === "consultar_disponibilidad") {
    const servicio = String(args.servicio ?? "");
    const fecha = String(args.fecha ?? "");
    if (!isValidDate(fecha)) return { error: "La fecha debe ser YYYY-MM-DD." };
    const service = resolveService(services, servicio);
    if (!service) {
      return { error: "Servicio no encontrado.", servicios_disponibles: services.map((s) => s.name) };
    }
    const { slots, closed } = await getAvailability(fecha, service.duration_min ?? 30);
    if (closed) return { fecha, servicio: service.name, cerrado: true, franjas: [] };
    return { fecha, servicio: service.name, franjas: slots };
  }

  if (name === "crear_reserva") {
    const servicio = String(args.servicio ?? "");
    const fecha = String(args.fecha ?? "");
    const hora = String(args.hora ?? "");
    if (!isValidDate(fecha) || !isValidTime(hora)) {
      return { ok: false, motivo: "Formato de fecha u hora inválido." };
    }
    const service = resolveService(services, servicio);
    if (!service) {
      return { ok: false, motivo: "Servicio no encontrado.", servicios_disponibles: services.map((s) => s.name) };
    }
    try {
      const booking = await createBooking({
        service_id: service.id,
        customer_name: String(args.nombre_cliente ?? "") || ctx.name || "Cliente WhatsApp",
        customer_phone: ctx.phone ?? null,
        scheduled_at: `${fecha}T${hora}:00`,
        duration_min: service.duration_min ?? null,
        notes: args.notas ? String(args.notas) : null,
        contact_id: ctx.contactId ?? null,
      });
      return {
        ok: true,
        estado: "pendiente_de_confirmacion",
        reserva: { servicio: service.name, fecha, hora, id: booking.id },
      };
    } catch (err) {
      if (err instanceof Error && err.message === "SLOT_TAKEN") {
        const { slots } = await getAvailability(fecha, service.duration_min ?? 30);
        return { ok: false, motivo: "Esa franja acaba de ocuparse.", franjas_libres: slots };
      }
      return { ok: false, motivo: "No se pudo crear la reserva." };
    }
  }

  return { error: `Herramienta desconocida: ${name}` };
}
