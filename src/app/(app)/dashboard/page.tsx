import Link from "next/link";
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import StatusDonut from "./_components/StatusDonut";

// ─── Types ────────────────────────────────────────────────────────────────────

type WoStage = {
  status: string;
  stages_config: { name: string; color: string; order_index: number } | null;
};

type UpcomingOrder = {
  id: string;
  number: string;
  client_name: string;
  due_date: string;
  wo_stages: WoStage[];
};

type RecentOrder = {
  id: string;
  number: string;
  client_name: string;
  status: string;
  updated_at: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getCurrentStage(stages: WoStage[]): WoStage | null {
  return (
    stages
      .filter((s) => !["done", "na"].includes(s.status))
      .sort(
        (a, b) =>
          (a.stages_config?.order_index ?? 0) -
          (b.stages_config?.order_index ?? 0)
      )[0] ?? null
  );
}

function daysUntil(dateStr: string): number {
  const due = new Date(dateStr + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - now.getTime()) / 86_400_000);
}

function formatRelative(ts: string): string {
  const ms = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(ms / 60_000);
  const hours = Math.floor(ms / 3_600_000);
  const days = Math.floor(ms / 86_400_000);
  if (mins < 1) return "Ahora mismo";
  if (mins < 60) return `Hace ${mins} min`;
  if (hours < 24) return `Hace ${hours}h`;
  if (days === 1) return "Ayer";
  if (days < 7) return `Hace ${days} días`;
  return new Date(ts).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
  });
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, { label: string; classes: string }> = {
  active: { label: "Activa", classes: "bg-green-100 text-green-700" },
  paused: { label: "Pausada", classes: "bg-yellow-100 text-yellow-700" },
  completed: { label: "Completada", classes: "bg-blue-100 text-blue-700" },
  cancelled: { label: "Cancelada", classes: "bg-gray-100 text-gray-500" },
};

const PIE_DATA_TEMPLATE = [
  { name: "Activa", fill: "#1B9AAA", statusKey: "active" },
  { name: "Pausada", fill: "#F59E0B", statusKey: "paused" },
  { name: "Completada", fill: "#2D6A4F", statusKey: "completed" },
  { name: "Cancelada", fill: "#9CA3AF", statusKey: "cancelled" },
];

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split("T")[0];
  const weekLaterStr = new Date(today.getTime() + 7 * 86_400_000)
    .toISOString()
    .split("T")[0];
  const monthStartStr = new Date(
    today.getFullYear(),
    today.getMonth(),
    1
  ).toISOString();

  const [
    { count: activeCount },
    { count: weekCount },
    { count: monthCount },
    { count: urgentCount },
    { count: pausedCount },
    { count: completedCount },
    { count: cancelledCount },
    { data: upcomingRaw },
    { data: recentRaw },
    { data: profile },
  ] = await Promise.all([
    // KPI 1: active
    supabase
      .from("work_orders")
      .select("*", { count: "exact", head: true })
      .eq("status", "active"),

    // KPI 2: active + due this week
    supabase
      .from("work_orders")
      .select("*", { count: "exact", head: true })
      .eq("status", "active")
      .not("due_date", "is", null)
      .gte("due_date", todayStr)
      .lte("due_date", weekLaterStr),

    // KPI 3: completed this month
    supabase
      .from("work_orders")
      .select("*", { count: "exact", head: true })
      .eq("status", "completed")
      .gte("updated_at", monthStartStr),

    // KPI 4: urgent + active
    supabase
      .from("work_orders")
      .select("*", { count: "exact", head: true })
      .eq("status", "active")
      .eq("priority", "Urgente"),

    // Pie: paused
    supabase
      .from("work_orders")
      .select("*", { count: "exact", head: true })
      .eq("status", "paused"),

    // Pie: completed (total, not just this month)
    supabase
      .from("work_orders")
      .select("*", { count: "exact", head: true })
      .eq("status", "completed"),

    // Pie: cancelled
    supabase
      .from("work_orders")
      .select("*", { count: "exact", head: true })
      .eq("status", "cancelled"),

    // Upcoming orders
    supabase
      .from("work_orders")
      .select(
        "id, number, client_name, due_date, wo_stages(status, stages_config(name, color, order_index))"
      )
      .eq("status", "active")
      .not("due_date", "is", null)
      .order("due_date", { ascending: true })
      .limit(5),

    // Recent activity
    supabase
      .from("work_orders")
      .select("id, number, client_name, status, updated_at")
      .order("updated_at", { ascending: false })
      .limit(5),

    // Company name
    supabase
      .from("profiles")
      .select("full_name, companies(name)")
      .eq("id", user?.id ?? "")
      .maybeSingle(),
  ]);

  // Company name
  const companies = profile?.companies as unknown as
    | { name: string }
    | { name: string }[]
    | null;
  const companyName =
    (Array.isArray(companies) ? companies[0]?.name : companies?.name) ??
    user?.email ??
    "tu empresa";

  // Pie chart data
  const counts: Record<string, number> = {
    active: activeCount ?? 0,
    paused: pausedCount ?? 0,
    completed: completedCount ?? 0,
    cancelled: cancelledCount ?? 0,
  };
  const pieData = PIE_DATA_TEMPLATE.map((d) => ({
    ...d,
    value: counts[d.statusKey] ?? 0,
  }));

  // Typed data
  const upcoming = (upcomingRaw ?? []) as unknown as UpcomingOrder[];
  const recent = (recentRaw ?? []) as unknown as RecentOrder[];

  const kpis = [
    {
      label: "OTs activas",
      value: activeCount ?? 0,
      icon: ClipboardList,
      bg: "bg-[#1B9AAA]/10",
      iconColor: "text-[#1B9AAA]",
      border: "border-[#1B9AAA]/20",
    },
    {
      label: "Vencen esta semana",
      value: weekCount ?? 0,
      icon: Clock,
      bg: "bg-orange-50",
      iconColor: "text-orange-500",
      border: "border-orange-200",
    },
    {
      label: "Completadas este mes",
      value: monthCount ?? 0,
      icon: CheckCircle2,
      bg: "bg-[#2D6A4F]/10",
      iconColor: "text-[#2D6A4F]",
      border: "border-[#2D6A4F]/20",
    },
    {
      label: "Urgentes activas",
      value: urgentCount ?? 0,
      icon: AlertTriangle,
      bg: "bg-red-50",
      iconColor: "text-red-500",
      border: "border-red-200",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">{companyName}</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(({ label, value, icon: Icon, bg, iconColor, border }) => (
          <div
            key={label}
            className={`bg-white rounded-xl border ${border} p-5 flex items-center gap-4`}
          >
            <div className={`${bg} rounded-lg p-3 flex-shrink-0`}>
              <Icon className={`h-5 w-5 ${iconColor}`} />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500 mt-0.5 leading-snug">
                {label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Middle row: donut + upcoming */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Donut */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-1">
            Distribución por estado
          </h2>
          <p className="text-xs text-gray-400 mb-3">Todas las OTs</p>
          <StatusDonut data={pieData} />
        </div>

        {/* Upcoming */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-1">
            Próximas a vencer
          </h2>
          <p className="text-xs text-gray-400 mb-3">OTs activas con fecha de entrega</p>

          {upcoming.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">
              No hay OTs con fecha de entrega próxima
            </p>
          ) : (
            <div className="divide-y divide-gray-50">
              {upcoming.map((order) => {
                const currentStage = getCurrentStage(order.wo_stages ?? []);
                const days = daysUntil(order.due_date);
                const daysBadge =
                  days < 0
                    ? { label: `Vencida`, classes: "bg-red-100 text-red-700" }
                    : days === 0
                    ? { label: "Hoy", classes: "bg-red-100 text-red-700" }
                    : days <= 3
                    ? {
                        label: `${days}d`,
                        classes: "bg-red-100 text-red-700",
                      }
                    : days <= 7
                    ? {
                        label: `${days}d`,
                        classes: "bg-yellow-100 text-yellow-700",
                      }
                    : {
                        label: `${days}d`,
                        classes: "bg-gray-100 text-gray-600",
                      };

                return (
                  <div
                    key={order.id}
                    className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/orders/${order.id}`}
                          className="text-xs font-mono font-semibold text-[#1B9AAA] hover:text-[#156E79]"
                        >
                          {order.number}
                        </Link>
                        <span className="text-xs text-gray-700 truncate">
                          {order.client_name}
                        </span>
                      </div>
                      {currentStage ? (
                        <span
                          className="mt-0.5 inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-white"
                          style={{
                            backgroundColor:
                              currentStage.stages_config?.color ?? "#6366f1",
                          }}
                        >
                          {currentStage.stages_config?.name ?? "—"}
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-300">
                          Sin etapa
                        </span>
                      )}
                    </div>
                    <span
                      className={`flex-shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${daysBadge.classes}`}
                    >
                      {daysBadge.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent activity */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">
            Actividad reciente
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Últimas órdenes creadas o modificadas
          </p>
        </div>

        {recent.length === 0 ? (
          <p className="text-sm text-gray-400 py-10 text-center">
            No hay actividad reciente
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50 bg-gray-50/60">
                <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500">
                  N° OT
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">
                  Cliente
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">
                  Estado
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">
                  Última actualización
                </th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {recent.map((order) => {
                const badge =
                  STATUS_BADGE[order.status] ?? {
                    label: order.status,
                    classes: "bg-gray-100 text-gray-600",
                  };
                return (
                  <tr
                    key={order.id}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-5 py-3 font-mono text-xs font-semibold text-[#1B9AAA]">
                      {order.number}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-800">
                      {order.client_name}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.classes}`}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {formatRelative(order.updated_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/orders/${order.id}`}
                        className="text-xs font-medium text-[#1B9AAA] hover:text-[#156E79]"
                      >
                        Ver →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
