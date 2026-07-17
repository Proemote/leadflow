"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Contact, Operation, CustomerMetrics, OperationStatus, Opportunity, Booking, BookingStatus, ContactService, ContactServiceStatus, Service, BusinessConfig } from "@/lib/types";
import { CUSTOMER_STATUS_META, getJourneyStageMeta } from "@/lib/metrics";
import { formatPrice } from "@/lib/money";
import { formatSchedule } from "@/lib/format";
import { initials } from "@/lib/format";
import { IconBack, IconPlus, IconTrash } from "@/components/icons";

const OP_STATUS: Record<OperationStatus, { label: string; cls: string }> = {
  completed: { label: "Completada", cls: "chip-hot" },
  pending:   { label: "Pendiente",  cls: "chip-warm" },
  refunded:  { label: "Reembolsada", cls: "" },
};

const BOOKING_STATUS: Record<BookingStatus, { label: string; cls: string }> = {
  pending:   { label: "Pendiente",  cls: "chip-warm" },
  confirmed: { label: "Confirmada", cls: "chip-cold" },
  done:      { label: "Realizada",  cls: "chip-hot"  },
  cancelled: { label: "Cancelada",  cls: ""           },
};

const CS_STATUS: Record<ContactServiceStatus, { label: string; cls: string }> = {
  contratado: { label: "Contratado", cls: "chip-warm" },
  completado: { label: "Completado", cls: "chip-hot" },
  cancelado:  { label: "Cancelado",  cls: "" },
};

const STAGE_COLOR: Record<string, string> = { Ganado: "#34d399", Perdido: "#fb7185" };
function stageAccent(s: string) { return STAGE_COLOR[s] ?? "#a855f7"; }

function fecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

function fechaHora(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}, ${d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`;
}

type Comment = { id: string; content: string; created_at: string };

type ActivityEntry =
  | { kind: "operation"; date: string; data: Operation }
  | { kind: "comment"; date: string; data: Comment }
  | { kind: "booking"; date: string; data: Booking };

export function CustomerDetail({
  contact: initialContact,
  operations: initialOps,
  opportunities,
  bookings: initialBookings,
  contractedServices: initialContractedServices,
  services,
  businessConfig,
  metrics: initialMetrics,
  demo,
}: {
  contact: Contact;
  operations: Operation[];
  opportunities: Opportunity[];
  bookings: Booking[];
  contractedServices: ContactService[];
  services: Service[];
  businessConfig: BusinessConfig;
  metrics: CustomerMetrics;
  demo: boolean;
}) {
  const router = useRouter();
  const [contact, setContact] = useState(initialContact);
  const [operations, setOperations] = useState(initialOps);
  const [bookings, setBookings] = useState(initialBookings);
  const [contractedServices, setContractedServices] = useState(initialContractedServices);
  const [showForm, setShowForm] = useState(false);
  const [showEditContact, setShowEditContact] = useState(false);
  const [showAddBooking, setShowAddBooking] = useState(false);
  const [showAddService, setShowAddService] = useState(false);
  const [editingOperation, setEditingOperation] = useState<Operation | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  // Load comments from BD on mount
  useEffect(() => {
    if (demo) {
      try {
        const stored = localStorage.getItem(`comments-${contact.id}`);
        if (stored) {
          setComments(JSON.parse(stored));
        }
      } catch (e) {
        console.error("Error loading comments:", e);
      }
      return;
    }

    async function loadComments() {
      setLoadingComments(true);
      try {
        const res = await fetch(`/api/contacts/${contact.id}/notes`);
        if (res.ok) {
          const data = await res.json();
          setComments(data.notes || []);
        }
      } catch (e) {
        console.error("Error loading comments:", e);
      } finally {
        setLoadingComments(false);
      }
    }
    loadComments();
  }, [contact.id, demo]);

  async function addComment() {
    if (!newComment.trim()) return;
    setCommentError(null);
    try {
      if (demo) {
        const comment = {
          id: `cmnt-${Date.now()}`,
          content: newComment.trim(),
          created_at: new Date().toISOString(),
        };
        const updated = [comment, ...comments];
        setComments(updated);
        localStorage.setItem(`comments-${contact.id}`, JSON.stringify(updated));
        setNewComment("");
        return;
      }

      const res = await fetch("/api/contact-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact_id: contact.id, content: newComment.trim() }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Error al guardar comentario");
      setComments((prev) => [j.note, ...prev]);
      setNewComment("");
    } catch (e) {
      setCommentError(e instanceof Error ? e.message : "Error desconocido");
    }
  }

  async function deleteComment(id: string) {
    if (!confirm("¿Eliminar este comentario?")) return;
    try {
      if (demo) {
        const updated = comments.filter((c) => c.id !== id);
        setComments(updated);
        localStorage.setItem(`comments-${contact.id}`, JSON.stringify(updated));
        return;
      }

      const res = await fetch(`/api/contact-notes?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Error al eliminar");
      setComments((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      setCommentError(e instanceof Error ? e.message : "Error desconocido");
    }
  }

  async function deleteOperation(op: Operation) {
    if (!confirm(`¿Eliminar operación "${op.concept}"?`)) return;
    setOperations((arr) => arr.filter((o) => o.id !== op.id));
    if (!demo) {
      await fetch(`/api/operations/${op.id}`, { method: "DELETE" }).catch(e => {
        console.error("Error deleting operation:", e);
        alert("Error al eliminar");
        setOperations((arr) => [...arr, op]);
      });
    }
  }

  async function updateOperation(op: Operation) {
    setOperations((arr) => arr.map((o) => o.id === op.id ? op : o));
    if (!demo) {
      await fetch(`/api/operations/${op.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ concept: op.concept, amount_cents: op.amount_cents, status: op.status }),
      }).catch(e => {
        console.error("Error updating operation:", e);
        alert("Error al guardar");
      });
    }
  }
  const meta = CUSTOMER_STATUS_META[initialMetrics.estado];
  const m = initialMetrics;

  const deleteContact = useCallback(async () => {
    if (!confirm(`¿Eliminar contacto "${contact.name}"? Esta acción no se puede deshacer.`)) return;
    if (demo) {
      router.push("/clientes");
      return;
    }
    try {
      await fetch(`/api/customers/${contact.id}`, { method: "DELETE" });
      router.push("/clientes");
    } catch (e) {
      console.error("Error deleting contact:", e);
      alert("Error al eliminar contacto");
    }
  }, [contact.id, contact.name, demo, router]);

  async function patchBookingStatus(b: Booking, status: BookingStatus) {
    setBookings((arr) => arr.map((x) => (x.id === b.id ? { ...x, status } : x)));
    if (!demo) {
      await fetch(`/api/bookings/${b.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
    }
  }

  async function removeBooking(b: Booking) {
    if (!confirm("¿Eliminar esta cita? Esta acción no se puede deshacer.")) return;
    setBookings((arr) => arr.filter((x) => x.id !== b.id));
    if (!demo) await fetch(`/api/bookings/${b.id}`, { method: "DELETE" });
  }

  async function patchServiceStatus(cs: ContactService, status: ContactServiceStatus) {
    setContractedServices((arr) => arr.map((x) => (x.id === cs.id ? { ...x, status } : x)));
    if (!demo) {
      await fetch(`/api/contact-services/${cs.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
    }
  }

  async function removeService(cs: ContactService) {
    if (!confirm("¿Eliminar este servicio contratado?")) return;
    setContractedServices((arr) => arr.filter((x) => x.id !== cs.id));
    if (!demo) await fetch(`/api/contact-services/${cs.id}`, { method: "DELETE" });
  }

  // Feed unificado: operaciones + comentarios + citas, ordenado por fecha desc
  const activity = useMemo<ActivityEntry[]>(() => {
    const entries: ActivityEntry[] = [
      ...operations.map((o) => ({ kind: "operation" as const, date: o.date, data: o })),
      ...comments.map((c) => ({ kind: "comment" as const, date: c.created_at, data: c })),
      ...bookings.map((b) => ({ kind: "booking" as const, date: b.scheduled_at ?? b.created_at, data: b })),
    ];
    return entries.sort((a, b) => b.date.localeCompare(a.date));
  }, [operations, comments, bookings]);

  return (
    <div className="space-y-6">
      <Link href="/clientes" className="inline-flex items-center gap-1.5 text-sm text-violet-300 hover:text-white">
        <IconBack width={16} height={16} /> Contactos
      </Link>

      {/* Cabecera */}
      <div className="panel p-6 flex flex-wrap items-center gap-4">
        <div className="size-14 rounded-full grid place-items-center text-lg font-bold text-white shrink-0" style={{ background: "linear-gradient(140deg,#8b5cf6,#6d28d9)" }}>
          {initials(contact.name, contact.phone ?? "?")}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-violet-50">{contact.name ?? "Sin nombre"}</h1>
            <span className={`chip ${meta.cls}`}>{meta.label}</span>
            {(contact as any).journey_stage && (
              <span className={`chip ${getJourneyStageMeta((contact as any).journey_stage).cls}`}>
                {getJourneyStageMeta((contact as any).journey_stage).label}
              </span>
            )}
          </div>
          <div className="text-sm text-violet-300/70 mt-0.5">
            {[contact.company, contact.email, contact.phone].filter(Boolean).join(" · ") || "Sin datos de contacto"}
          </div>
          {(contact.tags ?? []).length > 0 && (
            <div className="flex gap-1.5 mt-2">
              {(contact.tags ?? []).map((t) => (
                <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-200 border border-[var(--color-edge)]">{t}</span>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-3 flex-wrap">
          <button className="btn-ghost" onClick={() => setShowEditContact((v) => !v)}>Editar contacto</button>
          <button className="text-[13px] px-3 py-1.5 rounded-lg border border-rose-500/40 text-rose-400 hover:bg-rose-500/10 transition flex items-center gap-2" onClick={deleteContact}>
            <IconTrash width={14} height={14} /> Borrar
          </button>
          <button className="btn-primary flex items-center gap-2" onClick={() => setShowForm((v) => !v)}>
            <IconPlus width={16} height={16} /> Añadir operación
          </button>
        </div>
      </div>

      {showEditContact && (
        <EditContactForm
          contact={contact}
          demo={demo}
          onSaved={(c) => {
            setContact(c);
            setShowEditContact(false);
          }}
          onCancel={() => setShowEditContact(false)}
        />
      )}

      {/* Métricas: una sola tira compacta */}
      <div className="panel overflow-x-auto">
        <div className="flex divide-x divide-[var(--color-edge-soft)] min-w-max">
          <StatCell label="CLV histórico" value={m.nOps ? formatPrice(m.clvCents) : "—"} sub={m.nOps ? undefined : "sin compras"} highlight />
          <StatCell label="Ticket medio" value={m.nOps ? formatPrice(m.aovCents) : "—"} />
          <StatCell label="Operaciones" value={String(m.nOps)} sub={m.recurrente ? "recurrente" : m.nOps === 1 ? "1ª compra" : undefined} />
          <StatCell label="Cliente desde" value={m.clienteDesde ? fecha(m.clienteDesde) : "—"} sub={m.antiguedad ?? undefined} />
          <StatCell label="Recencia" value={m.recenciaDias == null ? "—" : m.recenciaDias === 0 ? "hoy" : `hace ${m.recenciaDias} d`} sub={m.nOps ? "última compra" : undefined} />
          <StatCell label="Frecuencia media" value={m.frecuenciaMediaDias == null ? "—" : `${m.frecuenciaMediaDias} d`} sub={m.frecuenciaMediaDias == null ? "≥2 compras" : "entre compras"} />
          <StatCell label="Recurrencia" value={m.nOps ? `${Math.round(m.tasaRecurrencia * 100)}%` : "—"} />
          <StatCell label="Citas" value={String(bookings.length)} sub={bookings.filter(b => b.status === "done").length > 0 ? `${bookings.filter(b => b.status === "done").length} realizadas` : undefined} />
        </div>
      </div>

      {showForm && <AddOperationForm contactId={contact.id} demo={demo} onDone={() => { setShowForm(false); router.refresh(); }} />}

      {/* Dos columnas: gestión a la izquierda, actividad a la derecha */}
      <div className="grid grid-cols-1 lg:grid-cols-[35%_1fr] gap-6 items-start">
        {/* Columna izquierda: listas de gestión */}
        <div className="space-y-6">
          {opportunities.length > 0 && (
            <div className="panel p-5">
              <h3 className="font-semibold text-violet-50 mb-2">Oportunidades</h3>
              <div className="divide-y divide-[var(--color-edge-soft)]">
                {opportunities.map((o) => (
                  <div key={o.id} className="flex items-center gap-3 py-2">
                    <span className="size-2 rounded-full shrink-0" style={{ background: stageAccent(o.stage) }} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-violet-50 truncate">{o.title}</div>
                      <div className="text-[11px] text-violet-300/60">{o.stage} · {o.probability}%</div>
                    </div>
                    <span className="text-sm font-semibold text-violet-100 shrink-0">{formatPrice(o.value_cents)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Servicios contratados */}
          <div className="panel p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-violet-50">Servicios contratados</h3>
              <button className="btn-ghost flex items-center gap-1.5 py-1 px-2.5 text-xs" onClick={() => setShowAddService((v) => !v)}>
                <IconPlus width={13} height={13} /> Añadir
              </button>
            </div>
            {showAddService && (
              <AddContractedServiceForm
                contactId={contact.id}
                services={services}
                demo={demo}
                onCreated={(cs) => {
                  setContractedServices((arr) => [cs, ...arr]);
                  setShowAddService(false);
                }}
                onCancel={() => setShowAddService(false)}
              />
            )}
            {contractedServices.length === 0 ? (
              <div className="flex items-center justify-between gap-3 py-2">
                <span className="text-sm text-violet-300/50">🛠️ Sin servicios contratados</span>
                <button className="btn-ghost text-xs py-1 px-2.5 shrink-0" onClick={() => setShowAddService(true)}>+ Añadir</button>
              </div>
            ) : (
              <div className="divide-y divide-[var(--color-edge-soft)]">
                {contractedServices.map((cs) => {
                  const meta = CS_STATUS[cs.status];
                  return (
                    <div key={cs.id} className="py-2 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-violet-50 truncate flex-1 min-w-0">{cs.service_name ?? "Servicio"}</span>
                        <span className={`chip ${meta.cls} shrink-0`}>{meta.label}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] text-violet-300/60 truncate">
                          {cs.service_price_cents ? formatPrice(cs.service_price_cents, cs.service_currency || undefined) : ""} {cs.notes ? `· ${cs.notes}` : ""}
                        </span>
                        <div className="flex gap-1.5 shrink-0">
                          <select
                            value={cs.status}
                            onChange={(e) => patchServiceStatus(cs, e.target.value as ContactServiceStatus)}
                            className="text-[11px] bg-violet-500/10 border border-[var(--color-edge)] rounded px-1.5 py-0.5 text-violet-300"
                          >
                            {["contratado", "completado", "cancelado"].map((s) => (
                              <option key={s} value={s}>
                                {CS_STATUS[s as ContactServiceStatus].label}
                              </option>
                            ))}
                          </select>
                          <button
                            className="py-1 px-1.5 text-xs rounded border border-rose-500/30 text-rose-300 hover:bg-rose-500/10"
                            onClick={() => removeService(cs)}
                            title="Eliminar"
                          >
                            <IconTrash width={13} height={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Citas / Reservas */}
          <div className="panel p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-violet-50">Citas y reservas</h3>
              <button className="btn-ghost flex items-center gap-1.5 py-1 px-2.5 text-xs" onClick={() => setShowAddBooking((v) => !v)}>
                <IconPlus width={13} height={13} /> Añadir
              </button>
            </div>
            {showAddBooking && (
              <AddBookingForm
                contact={contact}
                services={services}
                businessConfig={businessConfig}
                demo={demo}
                onCreated={(b) => {
                  setBookings((arr) => [b, ...arr]);
                  setShowAddBooking(false);
                }}
                onCancel={() => setShowAddBooking(false)}
              />
            )}
            {bookings.length === 0 ? (
              <div className="flex items-center justify-between gap-3 py-2">
                <span className="text-sm text-violet-300/50">📅 Sin citas pendientes</span>
                <button className="btn-ghost text-xs py-1 px-2.5 shrink-0" onClick={() => setShowAddBooking(true)}>+ Añadir</button>
              </div>
            ) : (
              <div className="divide-y divide-[var(--color-edge-soft)]">
                {bookings.map((b) => {
                  const s = BOOKING_STATUS[b.status];
                  return (
                    <div key={b.id} className="py-2 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-violet-50 truncate flex-1 min-w-0">{b.service_name ?? b.notes ?? "Cita"}</span>
                        <span className={`chip ${s.cls} shrink-0`}>{s.label}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] text-violet-300/60 truncate">
                          {b.scheduled_at
                            ? new Date(b.scheduled_at).toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
                            : "Sin fecha"}
                        </span>
                        <div className="flex gap-1.5 shrink-0">
                          {b.status === "pending" && (
                            <button className="btn-ghost py-1 px-2 text-[11px]" onClick={() => patchBookingStatus(b, "confirmed")}>Confirmar</button>
                          )}
                          {(b.status === "pending" || b.status === "confirmed") && (
                            <>
                              <button className="btn-ghost py-1 px-2 text-[11px]" onClick={() => patchBookingStatus(b, "done")}>Hecha</button>
                              <button className="py-1 px-2 text-[11px] rounded border border-rose-500/30 text-rose-300 hover:bg-rose-500/10" onClick={() => patchBookingStatus(b, "cancelled")}>Cancelar</button>
                            </>
                          )}
                          <button
                            className="py-1 px-1.5 text-xs rounded border border-rose-500/30 text-rose-300 hover:bg-rose-500/10"
                            onClick={() => removeBooking(b)}
                            title="Eliminar"
                          >
                            <IconTrash width={13} height={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Columna derecha: Actividad (operaciones + comentarios + citas fusionados) */}
        <div className="panel p-5">
          <h3 className="font-semibold text-violet-50 mb-3">Actividad</h3>
          <div className="flex gap-2 mb-1">
            <input
              className="input flex-1 text-sm"
              placeholder="Agregar comentario..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addComment()}
            />
            <button className="btn-primary text-sm px-4" onClick={addComment}>Agregar</button>
          </div>
          {commentError && <p className="text-sm text-rose-400 mt-2">{commentError}</p>}

          {loadingComments ? (
            <p className="text-sm text-violet-300/50 py-4">Cargando actividad…</p>
          ) : activity.length === 0 ? (
            <div className="py-3">
              <span className="text-sm text-violet-300/50">🕓 Sin actividad todavía</span>
            </div>
          ) : (
            <div className="divide-y divide-[var(--color-edge-soft)] mt-2 max-h-[640px] overflow-y-auto">
              {activity.map((entry) => {
                if (entry.kind === "operation") {
                  const o = entry.data;
                  const s = OP_STATUS[o.status];
                  return (
                    <div key={`op-${o.id}`} className="flex items-start gap-3 py-2.5">
                      <span className="text-base shrink-0" title="Operación">💰</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-violet-50 truncate">{o.concept}</span>
                          <span className={`chip ${s.cls}`}>{s.label}</span>
                        </div>
                        <div className="text-[11px] text-violet-300/60">
                          {fechaHora(o.date)}{o.source === "opportunity" ? " · desde oportunidad" : ""}
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-violet-50 shrink-0">{formatPrice(o.amount_cents, o.currency)}</span>
                      <div className="flex gap-1 shrink-0">
                        <button
                          className="py-1 px-2 text-xs rounded border border-violet-500/30 text-violet-300 hover:bg-violet-500/10 transition"
                          onClick={() => setEditingOperation(o)}
                          title="Editar"
                        >
                          Editar
                        </button>
                        <button
                          className="py-1 px-1.5 text-xs rounded border border-rose-500/30 text-rose-300 hover:bg-rose-500/10 transition"
                          onClick={() => deleteOperation(o)}
                          title="Eliminar"
                        >
                          <IconTrash width={13} height={13} />
                        </button>
                      </div>
                    </div>
                  );
                }
                if (entry.kind === "comment") {
                  const c = entry.data;
                  return (
                    <div key={`cm-${c.id}`} className="flex items-start gap-3 py-2.5">
                      <span className="text-base shrink-0" title="Comentario">💬</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-violet-50 break-words">{c.content}</p>
                        <div className="text-[11px] text-violet-300/60">{fechaHora(c.created_at)}</div>
                      </div>
                      <button
                        className="text-violet-300/40 hover:text-rose-400 transition text-xs shrink-0"
                        onClick={() => deleteComment(c.id)}
                        title="Eliminar comentario"
                      >
                        ✕
                      </button>
                    </div>
                  );
                }
                const b = entry.data;
                const s = BOOKING_STATUS[b.status];
                return (
                  <div key={`bk-${b.id}`} className="flex items-start gap-3 py-2.5">
                    <span className="text-base shrink-0" title="Cita">📅</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-violet-50 truncate">{b.service_name ?? b.notes ?? "Cita"}</span>
                        <span className={`chip ${s.cls}`}>{s.label}</span>
                      </div>
                      <div className="text-[11px] text-violet-300/60">{fechaHora(b.scheduled_at ?? b.created_at)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {editingOperation && (
        <EditOperationForm
          operation={editingOperation}
          demo={demo}
          onSaved={(op) => {
            updateOperation(op);
            setEditingOperation(null);
          }}
          onCancel={() => setEditingOperation(null)}
        />
      )}
    </div>
  );
}

function StatCell({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className="px-4 py-2.5 shrink-0">
      <div className="text-[10px] uppercase tracking-wider text-violet-300/60 whitespace-nowrap">{label}</div>
      <div className={`text-base font-bold leading-tight mt-0.5 whitespace-nowrap ${highlight ? "gradient-text" : "text-violet-50"}`}>{value}</div>
      {sub && <div className="text-[10px] text-violet-300/40 whitespace-nowrap">{sub}</div>}
    </div>
  );
}

function AddOperationForm({ contactId, demo, onDone }: { contactId: string; demo: boolean; onDone: () => void }) {
  const [f, setF] = useState({ concept: "", amount: "", status: "completed", date: new Date().toISOString().slice(0, 10) });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!f.concept.trim()) return setError("El concepto es obligatorio.");
    setBusy(true); setError(null);
    try {
      if (demo) { onDone(); return; }
      const res = await fetch("/api/operations", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact_id: contactId, concept: f.concept, amount: f.amount, status: f.status, date: new Date(`${f.date}T12:00:00`).toISOString() }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Error");
      onDone();
    } catch (e) { setError(e instanceof Error ? e.message : "Error"); } finally { setBusy(false); }
  }

  return (
    <div className="panel p-6 space-y-4">
      <h3 className="font-semibold text-violet-50">Nueva operación</h3>
      <div className="grid sm:grid-cols-2 gap-3">
        <input className="input" placeholder="Concepto / servicio *" value={f.concept} onChange={(e) => setF({ ...f, concept: e.target.value })} />
        <input className="input" placeholder="Importe (€)" inputMode="decimal" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
        <select className="input" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
          <option value="completed">Completada</option>
          <option value="pending">Pendiente</option>
          <option value="refunded">Reembolsada</option>
        </select>
        <input type="date" className="input" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
      </div>
      {demo && <p className="text-xs text-amber-300/80">Modo demo: no se guardará.</p>}
      {error && <p className="text-sm text-rose-400">{error}</p>}
      <div className="flex gap-3">
        <button className="btn-primary" onClick={save} disabled={busy}>{busy ? "Guardando…" : "Añadir"}</button>
        <button className="btn-ghost" onClick={onDone}>Cancelar</button>
      </div>
    </div>
  );
}

function EditContactForm({ contact, demo, onSaved, onCancel }: { contact: Contact; demo: boolean; onSaved: (c: Contact) => void; onCancel: () => void }) {
  const [f, setF] = useState({
    name: contact.name ?? "",
    surname: contact.surname ?? "",
    phone: contact.phone ?? "",
    email: contact.email ?? "",
    company: contact.company ?? "",
    notes: contact.notes ?? "",
    journey_stage: (contact as any).journey_stage ?? "",
    tags: (contact.tags ?? []).join(", "),
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    const patch = {
      name: f.name.trim() || null,
      surname: f.surname.trim() || null,
      phone: f.phone.trim() || null,
      email: f.email.trim() || null,
      company: f.company.trim() || null,
      notes: f.notes.trim() || null,
      journey_stage: f.journey_stage || null,
      tags: f.tags.split(",").map((t) => t.trim()).filter(Boolean),
    };

    if (demo) {
      onSaved({ ...contact, ...patch });
      return;
    }

    try {
      const res = await fetch(`/api/customers/${contact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Error");
      onSaved(j.contact);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel p-6 space-y-4">
      <h3 className="font-semibold text-violet-50">Editar contacto</h3>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Nombre">
          <input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </Field>
        <Field label="Apellidos">
          <input className="input" value={f.surname} onChange={(e) => setF({ ...f, surname: e.target.value })} />
        </Field>
        <Field label="Teléfono">
          <input className="input" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
        </Field>
        <Field label="Email">
          <input className="input" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        </Field>
        <Field label="Empresa">
          <input className="input" value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} />
        </Field>
      </div>
      <Field label="Etapa del customer journey">
        <select className="input" value={f.journey_stage} onChange={(e) => setF({ ...f, journey_stage: e.target.value })}>
          <option value="">Sin clasificar</option>
          <option value="potencial">Cliente potencial</option>
          <option value="propuesta_enviada">Propuesta enviada</option>
          <option value="propuesta_pendiente">Propuesta pendiente</option>
          <option value="propuesta_aceptada">Propuesta aceptada</option>
          <option value="propuesta_rechazada">Propuesta rechazada</option>
          <option value="cliente">Cliente</option>
          <option value="cliente_inactivo">Cliente inactivo</option>
        </select>
      </Field>
      <Field label="Etiquetas (separadas por comas)">
        <input className="input" value={f.tags} onChange={(e) => setF({ ...f, tags: e.target.value })} placeholder="VIP, Recurrente" />
      </Field>
      <Field label="Notas">
        <textarea className="input" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
      </Field>
      {demo && <p className="text-xs text-amber-300/80">Modo demo: no se guardará.</p>}
      {error && <p className="text-sm text-rose-400">{error}</p>}
      <div className="flex gap-3">
        <button className="btn-primary" onClick={save} disabled={busy}>{busy ? "Guardando…" : "Guardar cambios"}</button>
        <button className="btn-ghost" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}

function AddContractedServiceForm({
  contactId,
  services,
  demo,
  onCreated,
  onCancel,
}: {
  contactId: string;
  services: Service[];
  demo: boolean;
  onCreated: (cs: ContactService) => void;
  onCancel: () => void;
}) {
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [status, setStatus] = useState<ContactServiceStatus>("contratado");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const service = services.find((s) => s.id === serviceId);

  async function save() {
    if (!serviceId) return setError("Elige un servicio.");
    setBusy(true);
    setError(null);

    if (demo) {
      onCreated({
        id: `tmp-${Date.now()}`,
        contact_id: contactId,
        service_id: serviceId,
        status,
        notes: notes.trim() || null,
        created_at: new Date().toISOString(),
        service_name: service?.name ?? null,
        service_price_cents: service?.price_cents ?? null,
        service_currency: service?.currency ?? null,
      });
      return;
    }

    try {
      const res = await fetch("/api/contact-services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact_id: contactId,
          service_id: serviceId,
          status,
          notes: notes.trim() || null,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Error");
      onCreated(j.contactService);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel p-6 space-y-4 mb-4">
      <h4 className="font-semibold text-violet-50 text-sm">Nuevo servicio contratado</h4>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Servicio">
          <select className="input" value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {formatPrice(s.price_cents, s.currency)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Estado">
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value as ContactServiceStatus)}>
            <option value="contratado">Contratado</option>
            <option value="completado">Completado</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </Field>
      </div>
      <Field label="Notas (opcional)">
        <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      {demo && <p className="text-xs text-amber-300/80">Modo demo: no se guardará.</p>}
      {error && <p className="text-sm text-rose-400">{error}</p>}
      <div className="flex gap-3">
        <button className="btn-primary" onClick={save} disabled={busy}>{busy ? "Guardando…" : "Añadir"}</button>
        <button className="btn-ghost" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}

function AddBookingForm({
  contact,
  services,
  businessConfig,
  demo,
  onCreated,
  onCancel,
}: {
  contact: Contact;
  services: Service[];
  businessConfig: BusinessConfig;
  demo: boolean;
  onCreated: (b: Booking) => void;
  onCancel: () => void;
}) {
  const isAppt = businessConfig.businessType === "appointments";
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState("");
  const [party, setParty] = useState("");
  const [notes, setNotes] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [closed, setClosed] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const service = services.find((s) => s.id === serviceId);
  const duration = service?.duration_min ?? 30;

  const loadSlots = useCallback(async () => {
    if (!isAppt || !date) return;
    setLoadingSlots(true);
    setTime("");
    try {
      const res = await fetch(`/api/availability?date=${date}&duration=${duration}`);
      const j = await res.json();
      setSlots(j.slots ?? []);
      setClosed(Boolean(j.closed));
    } finally {
      setLoadingSlots(false);
    }
  }, [isAppt, date, duration]);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  async function save() {
    if (!time) return setError(isAppt ? "Elige una franja horaria." : "Indica la hora.");
    setBusy(true);
    setError(null);

    const scheduled_at = `${date}T${time}:00`;
    const payload = {
      contact_id: contact.id,
      service_id: serviceId || null,
      customer_name: contact.name ?? "Cliente",
      customer_phone: contact.phone || null,
      scheduled_at,
      duration_min: isAppt ? duration : null,
      party_size: !isAppt && party ? parseInt(party, 10) : null,
      notes: notes.trim() || null,
    };

    if (demo) {
      onCreated({
        id: `tmp-${Date.now()}`,
        contact_id: contact.id,
        service_id: serviceId || null,
        customer_name: contact.name ?? "Cliente",
        customer_phone: contact.phone || null,
        scheduled_at,
        duration_min: isAppt ? duration : null,
        party_size: !isAppt && party ? parseInt(party, 10) : null,
        status: "pending",
        notes: notes.trim() || null,
        created_at: new Date().toISOString(),
        service_name: service?.name ?? null,
      });
      return;
    }

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Error al crear");
      onCreated({ ...j.booking, service_name: service?.name ?? null });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel p-6 space-y-4 mb-4">
      <h4 className="font-semibold text-violet-50 text-sm">Nueva {isAppt ? "cita" : "reserva"}</h4>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Servicio">
          <select className="input" value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {formatPrice(s.price_cents, s.currency)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Fecha">
          <input type="date" className="input" value={date} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>

      {isAppt ? (
        <div>
          <span className="text-xs text-violet-300/70 mb-1.5 block">Franja disponible</span>
          {loadingSlots ? (
            <p className="text-sm text-violet-300/50">Calculando disponibilidad…</p>
          ) : closed ? (
            <p className="text-sm text-amber-300/80">Cerrado ese día. Elige otra fecha.</p>
          ) : slots.length === 0 ? (
            <p className="text-sm text-amber-300/80">No quedan franjas libres para este servicio ese día.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {slots.map((s) => (
                <button
                  key={s}
                  onClick={() => setTime(s)}
                  className="px-3 py-1.5 rounded-lg text-sm border transition"
                  style={
                    time === s
                      ? { background: "linear-gradient(180deg,#8b5cf6,#6d28d9)", borderColor: "rgba(168,85,247,0.5)", color: "#fff" }
                      : { background: "rgba(124,58,237,0.08)", borderColor: "var(--color-edge)", color: "#cbbfe6" }
                  }
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Hora">
            <input type="time" className="input" value={time} onChange={(e) => setTime(e.target.value)} />
          </Field>
          <Field label="Nº de personas">
            <input className="input" value={party} onChange={(e) => setParty(e.target.value.replace(/\D/g, ""))} placeholder="2" inputMode="numeric" />
          </Field>
        </div>
      )}

      <Field label="Notas (opcional)">
        <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>

      {demo && <p className="text-xs text-amber-300/80">Modo demo: no se guardará.</p>}
      {error && <p className="text-sm text-rose-400">{error}</p>}
      <div className="flex gap-3">
        <button className="btn-primary" onClick={save} disabled={busy}>
          {busy ? "Guardando…" : `Crear ${isAppt ? "cita" : "reserva"}`}
        </button>
        <button className="btn-ghost" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}

function EditOperationForm({
  operation,
  demo,
  onSaved,
  onCancel,
}: {
  operation: Operation;
  demo: boolean;
  onSaved: (op: Operation) => void;
  onCancel: () => void;
}) {
  const [f, setF] = useState({
    concept: operation.concept,
    amount_cents: (operation.amount_cents / 100).toString(),
    status: operation.status,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!f.concept.trim()) return setError("Concepto es obligatorio.");
    setBusy(true);
    setError(null);
    const amount_cents = Math.round(parseFloat(f.amount_cents) * 100);
    if (isNaN(amount_cents)) return setError("Monto inválido.");

    if (demo) {
      onSaved({ ...operation, concept: f.concept.trim(), amount_cents, status: f.status as OperationStatus });
      return;
    }

    try {
      const res = await fetch(`/api/operations/${operation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ concept: f.concept.trim(), amount_cents, status: f.status }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Error");
      onSaved(j.operation);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/50 backdrop-blur-sm" onClick={onCancel}>
      <div className="panel p-6 w-full max-w-sm space-y-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-semibold text-violet-50">Editar operación</h3>
        <Field label="Concepto">
          <input className="input" value={f.concept} onChange={(e) => setF({ ...f, concept: e.target.value })} />
        </Field>
        <Field label="Monto (€)">
          <input className="input" inputMode="decimal" value={f.amount_cents} onChange={(e) => setF({ ...f, amount_cents: e.target.value })} />
        </Field>
        <Field label="Estado">
          <select className="input" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as OperationStatus })}>
            <option value="completed">Completada</option>
            <option value="pending">Pendiente</option>
            <option value="refunded">Reembolsada</option>
          </select>
        </Field>
        {demo && <p className="text-xs text-amber-300/80">Modo demo: no se guardará.</p>}
        {error && <p className="text-sm text-rose-400">{error}</p>}
        <div className="flex gap-3">
          <button className="btn-primary" onClick={save} disabled={busy}>{busy ? "Guardando…" : "Guardar"}</button>
          <button className="btn-ghost" onClick={onCancel}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs text-violet-300/70 mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}
