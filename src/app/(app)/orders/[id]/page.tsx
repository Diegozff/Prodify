import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import StageCard from "./_components/StageCard";

type Stage = {
  id: string;
  status: string;
  notes: string | null;
  stages_config: {
    id: string;
    name: string;
    color: string;
    order_index: number;
  } | null;
};

type Material = {
  id: string;
  description: string;
  quantity: number | null;
  unit: string | null;
  supplied_by: string | null;
};

type Order = {
  id: string;
  number: string;
  client_name: string;
  description: string | null;
  priority: string;
  status: string;
  due_date: string | null;
  purchase_order: string | null;
  notes: string | null;
  created_at: string;
  wo_stages: Stage[];
  materials: Material[];
};

const PRIORITY_BADGE: Record<string, string> = {
  Baja: "bg-gray-100 text-gray-600",
  Normal: "bg-blue-100 text-blue-700",
  Alta: "bg-orange-100 text-orange-700",
  Urgente: "bg-red-100 text-red-700",
};

const STATUS_BADGE: Record<string, { label: string; classes: string }> = {
  active: { label: "Activa", classes: "bg-green-100 text-green-700" },
  paused: { label: "Pausada", classes: "bg-yellow-100 text-yellow-700" },
  completed: { label: "Completada", classes: "bg-blue-100 text-blue-700" },
  cancelled: { label: "Cancelada", classes: "bg-gray-100 text-gray-500" },
};

function formatDate(d: string | null) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("work_orders")
    .select(
      `id, number, client_name, description, priority, status, due_date,
       purchase_order, notes, created_at,
       wo_stages(id, status, notes, stages_config(id, name, color, order_index)),
       materials(id, description, quantity, unit, supplied_by)`
    )
    .eq("id", id)
    .single();

  if (!data) notFound();

  const order = data as unknown as Order;

  const stages = [...(order.wo_stages ?? [])].sort(
    (a, b) =>
      (a.stages_config?.order_index ?? 0) - (b.stages_config?.order_index ?? 0)
  );

  const pbadge =
    PRIORITY_BADGE[order.priority] ?? "bg-gray-100 text-gray-600";
  const sbadge = STATUS_BADGE[order.status] ?? {
    label: order.status,
    classes: "bg-gray-100 text-gray-600",
  };

  return (
    <div className="max-w-4xl">
      <Link
        href="/orders"
        className="inline-flex items-center text-sm font-medium text-[#1B9AAA] hover:text-[#156E79] transition-colors"
      >
        ← Volver a órdenes
      </Link>

      {/* Header card */}
      <div className="mt-4 bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-mono font-semibold text-gray-400 tracking-wider">
              {order.number}
            </p>
            <h1 className="mt-1 text-2xl font-bold text-gray-900">
              {order.client_name}
            </h1>
            {order.description && (
              <p className="mt-2 text-gray-600">{order.description}</p>
            )}
          </div>
          <div className="flex flex-col gap-2 items-end flex-shrink-0">
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${pbadge}`}
            >
              {order.priority}
            </span>
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${sbadge.classes}`}
            >
              {sbadge.label}
            </span>
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 border-t border-gray-100 pt-5">
          {order.purchase_order && (
            <div>
              <dt className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                N° OC
              </dt>
              <dd className="mt-0.5 text-sm font-medium text-gray-700">
                {order.purchase_order}
              </dd>
            </div>
          )}
          <div>
            <dt className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              Fecha entrega
            </dt>
            <dd className="mt-0.5 text-sm font-medium text-gray-700">
              {formatDate(order.due_date)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              Creada
            </dt>
            <dd className="mt-0.5 text-sm font-medium text-gray-700">
              {formatDate(order.created_at.split("T")[0])}
            </dd>
          </div>
        </dl>

        {order.notes && (
          <div className="mt-4 rounded-lg bg-gray-50 px-4 py-3">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
              Notas
            </p>
            <p className="text-sm text-gray-700">{order.notes}</p>
          </div>
        )}
      </div>

      {/* Stages */}
      {stages.length > 0 && (
        <div className="mt-6">
          <h2 className="text-base font-semibold text-gray-900 mb-3">
            Etapas de producción
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {stages.map((stage) => (
              <StageCard
                key={stage.id}
                stageId={stage.id}
                orderId={order.id}
                name={stage.stages_config?.name ?? "Etapa"}
                color={stage.stages_config?.color ?? "#6366f1"}
                status={stage.status}
              />
            ))}
          </div>
        </div>
      )}

      {/* Materials */}
      {order.materials && order.materials.length > 0 && (
        <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-3">
            Materiales
          </h2>
          <div className="divide-y divide-gray-50">
            {order.materials.map((mat) => (
              <div
                key={mat.id}
                className="flex items-center gap-4 py-2.5 first:pt-0 last:pb-0"
              >
                <span className="flex-1 text-sm text-gray-700">
                  {mat.description}
                </span>
                {mat.quantity != null && (
                  <span className="text-sm text-gray-500">
                    {mat.quantity}
                    {mat.unit ? ` ${mat.unit}` : ""}
                  </span>
                )}
                <span className="text-xs text-gray-400 w-16 text-right">
                  {mat.supplied_by === "client" ? "Cliente" : "Empresa"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
