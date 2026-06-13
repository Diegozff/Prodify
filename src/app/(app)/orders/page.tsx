import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import NewOrderModal from "./_components/NewOrderModal";
import OrderFilters from "./_components/OrderFilters";

type WoStage = {
  id: string;
  status: string;
  stages_config: {
    name: string;
    color: string;
    order_index: number;
  } | null;
};

type Order = {
  id: string;
  number: string;
  client_name: string;
  description: string | null;
  priority: string;
  status: string;
  due_date: string | null;
  wo_stages: WoStage[];
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

function getCurrentStage(order: Order): WoStage | null {
  const active = (order.wo_stages ?? [])
    .filter((s) => !["done", "na"].includes(s.status))
    .sort(
      (a, b) =>
        (a.stages_config?.order_index ?? 0) -
        (b.stages_config?.order_index ?? 0)
    );
  return active[0] ?? null;
}

function formatDate(d: string | null) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; priority?: string }>;
}) {
  const { status, priority } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("work_orders")
    .select(
      "id, number, client_name, description, priority, status, due_date, wo_stages(id, status, stages_config(name, color, order_index))"
    )
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);
  if (priority) query = query.eq("priority", priority);

  const { data: orders } = await query;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Órdenes de Trabajo
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {orders?.length ?? 0} órdenes
          </p>
        </div>
        <NewOrderModal />
      </div>

      <Suspense fallback={<div className="h-10" />}>
        <OrderFilters />
      </Suspense>

      <div className="mt-4 bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/80">
              <th className="text-left px-4 py-3 font-medium text-gray-500 whitespace-nowrap">
                N° OT
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">
                Cliente
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">
                Descripción
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 whitespace-nowrap">
                Prioridad
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">
                Estado
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 whitespace-nowrap">
                Etapa actual
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 whitespace-nowrap">
                Entrega
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {!orders?.length ? (
              <tr>
                <td
                  colSpan={8}
                  className="text-center py-16 text-gray-400 text-sm"
                >
                  No hay órdenes de trabajo.{" "}
                  <span className="text-[#1B9AAA]">Creá la primera.</span>
                </td>
              </tr>
            ) : (
              orders.map((row) => {
                const order = row as unknown as Order;
                const currentStage = getCurrentStage(order);
                const pbadge =
                  PRIORITY_BADGE[order.priority] ?? "bg-gray-100 text-gray-600";
                const sbadge =
                  STATUS_BADGE[order.status] ?? {
                    label: order.status,
                    classes: "bg-gray-100 text-gray-600",
                  };

                return (
                  <tr
                    key={order.id}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono font-semibold text-[#1B9AAA] whitespace-nowrap">
                      {order.number}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {order.client_name}
                    </td>
                    <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate">
                      {order.description ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${pbadge}`}
                      >
                        {order.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${sbadge.classes}`}
                      >
                        {sbadge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {currentStage ? (
                        <span
                          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
                          style={{
                            backgroundColor:
                              currentStage.stages_config?.color ?? "#6366f1",
                          }}
                        >
                          {currentStage.stages_config?.name ?? "—"}
                        </span>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {formatDate(order.due_date)}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/orders/${order.id}`}
                        className="text-[#1B9AAA] hover:text-[#156E79] font-medium text-xs"
                      >
                        Ver →
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
