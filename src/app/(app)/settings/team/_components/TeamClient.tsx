"use client";

import { useState, useTransition } from "react";
import {
  Plus,
  X,
  Mail,
  Clock,
  ChevronDown,
  UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  changeRole,
  setUserActive,
  inviteUser,
  cancelInvitation,
} from "../actions";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Member = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  is_active: boolean | null;
};

export type Invitation = {
  id: string;
  email: string;
  role: string;
  invited_by: string;
  invited_by_name: string;
  expires_at: string;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const ROLE_CONFIG: Record<string, { label: string; cls: string }> = {
  admin: {
    label: "Admin",
    cls: "bg-blue-50 text-blue-700 border-blue-200",
  },
  operator: {
    label: "Operador",
    cls: "bg-green-50 text-green-700 border-green-200",
  },
  viewer: {
    label: "Visualizador",
    cls: "bg-gray-50 text-gray-500 border-gray-200",
  },
};

const AVATAR_PALETTES = [
  "bg-[#1B9AAA]/15 text-[#1B9AAA]",
  "bg-purple-100 text-purple-700",
  "bg-orange-100 text-orange-700",
  "bg-emerald-100 text-emerald-700",
  "bg-rose-100 text-rose-700",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string | null, email: string | null): string {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : name.substring(0, 2).toUpperCase();
  }
  return (email?.[0] ?? "?").toUpperCase();
}

function avatarPalette(seed: string): string {
  const hash = [...seed].reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_PALETTES[hash % AVATAR_PALETTES.length];
}

function daysUntil(dateStr: string): string {
  const diff = new Date(dateStr).getTime() - Date.now();
  const days = Math.ceil(diff / 86_400_000);
  if (days < 0) return "Expirada";
  if (days === 0) return "Vence hoy";
  if (days === 1) return "Vence mañana";
  return `En ${days} días`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  const cfg = ROLE_CONFIG[role] ?? ROLE_CONFIG.viewer;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border",
        cfg.cls
      )}
    >
      {cfg.label}
    </span>
  );
}

function RoleSelect({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  const cfg = ROLE_CONFIG[value] ?? ROLE_CONFIG.viewer;
  return (
    <div className="relative inline-flex">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={cn(
          "appearance-none text-xs font-medium rounded-full pl-2.5 pr-6 py-0.5 border cursor-pointer transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-[#1B9AAA]/25",
          "disabled:cursor-not-allowed disabled:opacity-60",
          cfg.cls
        )}
      >
        <option value="admin">Admin</option>
        <option value="operator">Operador</option>
        <option value="viewer">Visualizador</option>
      </select>
      <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 opacity-60" />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function TeamClient({
  members: initialMembers,
  invitations: initialInvitations,
  currentUserId,
}: {
  members: Member[];
  invitations: Invitation[];
  currentUserId: string;
}) {
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [invitations, setInvitations] = useState<Invitation[]>(initialInvitations);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Invite modal
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("operator");

  // ── Handlers ────────────────────────────────────────────────────────────────

  function handleRoleChange(userId: string, newRole: string) {
    const prev = members.find((m) => m.id === userId)?.role;
    setMembers((ms) => ms.map((m) => (m.id === userId ? { ...m, role: newRole } : m)));
    setErrorMsg(null);
    startTransition(async () => {
      const result = await changeRole(userId, newRole);
      if (result?.error) {
        setErrorMsg(result.error);
        setMembers((ms) =>
          ms.map((m) => (m.id === userId ? { ...m, role: prev ?? m.role } : m))
        );
      }
    });
  }

  function handleToggleActive(userId: string, currentActive: boolean) {
    const next = !currentActive;
    setMembers((ms) =>
      ms.map((m) => (m.id === userId ? { ...m, is_active: next } : m))
    );
    setErrorMsg(null);
    startTransition(async () => {
      const result = await setUserActive(userId, next);
      if (result?.error) {
        setErrorMsg(result.error);
        setMembers((ms) =>
          ms.map((m) => (m.id === userId ? { ...m, is_active: currentActive } : m))
        );
      }
    });
  }

  function handleInvite() {
    if (!inviteEmail.trim()) return;
    setErrorMsg(null);
    startTransition(async () => {
      const result = await inviteUser({
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      if (result?.error) {
        setErrorMsg(result.error);
        return;
      }
      setSuccessMsg(`Invitación enviada a ${inviteEmail.trim()}`);
      setInviteOpen(false);
      setInviteEmail("");
      setInviteRole("operator");
    });
  }

  function handleCancelInvitation(invId: string) {
    setInvitations((prev) => prev.filter((i) => i.id !== invId));
    startTransition(async () => {
      const result = await cancelInvitation(invId);
      if (result?.error) {
        setErrorMsg(result.error);
        setInvitations(initialInvitations);
      }
    });
  }

  function openInvite() {
    setInviteOpen(true);
    setInviteEmail("");
    setInviteRole("operator");
    setErrorMsg(null);
    setSuccessMsg(null);
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Banners */}
      {successMsg && (
        <div className="mb-5 flex items-center justify-between gap-3 rounded-lg bg-green-50 border border-green-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-green-600 flex-shrink-0" />
            <p className="text-sm text-green-700">{successMsg}</p>
          </div>
          <button onClick={() => setSuccessMsg(null)}>
            <X className="h-4 w-4 text-green-400 hover:text-green-600" />
          </button>
        </div>
      )}
      {errorMsg && (
        <div className="mb-5 flex items-center justify-between gap-3 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
          <p className="text-sm text-red-700">{errorMsg}</p>
          <button onClick={() => setErrorMsg(null)}>
            <X className="h-4 w-4 text-red-400 hover:text-red-600" />
          </button>
        </div>
      )}

      {/* ── Members ──────────────────────────────────────────────────────────── */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-700">Miembros</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {members.length} usuario{members.length !== 1 ? "s" : ""} en la empresa
            </p>
          </div>
          <Button
            onClick={openInvite}
            disabled={isPending}
            size="sm"
            className="bg-[#1B9AAA] hover:bg-[#156E79] text-white text-xs gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Invitar usuario
          </Button>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[44px_1fr_160px_110px] gap-3 px-4 py-2.5 bg-gray-50/80 border-b border-gray-100">
            <div />
            <span className="text-xs font-medium text-gray-500">Nombre / Email</span>
            <span className="text-xs font-medium text-gray-500">Rol</span>
            <span className="text-xs font-medium text-gray-500 text-center">Estado</span>
          </div>

          {members.length === 0 ? (
            <p className="text-center py-10 text-sm text-gray-400">
              No hay miembros registrados.
            </p>
          ) : (
            members.map((member) => {
              const isSelf = member.id === currentUserId;
              const isActive = member.is_active ?? true;
              const initials = getInitials(member.full_name, member.email);
              const palette = avatarPalette(member.id);

              return (
                <div
                  key={member.id}
                  className={cn(
                    "grid grid-cols-[44px_1fr_160px_110px] gap-3 px-4 py-3.5 border-b border-gray-50 last:border-0 items-center",
                    !isActive && "opacity-55"
                  )}
                >
                  {/* Avatar */}
                  <div
                    className={cn(
                      "w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                      palette
                    )}
                  >
                    {initials}
                  </div>

                  {/* Name + email */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-800 truncate">
                        {member.full_name ?? member.email ?? "Usuario"}
                      </span>
                      {isSelf && (
                        <span className="flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400">
                          Tú
                        </span>
                      )}
                    </div>
                    {member.email && member.full_name && (
                      <p className="text-xs text-gray-400 truncate mt-0.5">
                        {member.email}
                      </p>
                    )}
                  </div>

                  {/* Role */}
                  <div>
                    {isSelf ? (
                      <RoleBadge role={member.role} />
                    ) : (
                      <RoleSelect
                        value={member.role}
                        onChange={(v) => handleRoleChange(member.id, v)}
                        disabled={isPending}
                      />
                    )}
                  </div>

                  {/* Status */}
                  <div className="flex justify-center">
                    {isSelf ? (
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">
                        Activo
                      </span>
                    ) : (
                      <button
                        onClick={() => handleToggleActive(member.id, isActive)}
                        disabled={isPending}
                        className={cn(
                          "text-xs font-medium px-2.5 py-1 rounded-full border transition-colors",
                          isActive
                            ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                            : "bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100"
                        )}
                      >
                        {isActive ? "Activo" : "Inactivo"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* ── Pending invitations ───────────────────────────────────────────────── */}
      {invitations.length > 0 && (
        <section>
          <div className="mb-3">
            <h2 className="text-sm font-semibold text-gray-700">
              Invitaciones pendientes
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {invitations.length} invitación{invitations.length !== 1 ? "es" : ""} sin aceptar
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-[1fr_140px_160px_110px_40px] gap-3 px-4 py-2.5 bg-gray-50/80 border-b border-gray-100">
              <span className="text-xs font-medium text-gray-500">Email</span>
              <span className="text-xs font-medium text-gray-500">Rol</span>
              <span className="text-xs font-medium text-gray-500">Invitado por</span>
              <span className="text-xs font-medium text-gray-500 text-center">Expira en</span>
              <div />
            </div>

            {invitations.map((inv) => (
              <div
                key={inv.id}
                className="grid grid-cols-[1fr_140px_160px_110px_40px] gap-3 px-4 py-3.5 border-b border-gray-50 last:border-0 items-center"
              >
                {/* Email */}
                <div className="flex items-center gap-2 min-w-0">
                  <Mail className="h-3.5 w-3.5 text-gray-300 flex-shrink-0" />
                  <span className="text-sm text-gray-700 truncate">{inv.email}</span>
                </div>

                {/* Role */}
                <div>
                  <RoleBadge role={inv.role} />
                </div>

                {/* Invited by */}
                <span className="text-sm text-gray-500 truncate">
                  {inv.invited_by_name}
                </span>

                {/* Expires */}
                <div className="flex items-center justify-center gap-1 text-xs text-gray-400">
                  <Clock className="h-3 w-3 flex-shrink-0" />
                  <span>{daysUntil(inv.expires_at)}</span>
                </div>

                {/* Cancel */}
                <button
                  onClick={() => handleCancelInvitation(inv.id)}
                  disabled={isPending}
                  title="Cancelar invitación"
                  className="flex items-center justify-center p-1.5 rounded-md text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Invite modal ─────────────────────────────────────────────────────── */}
      {inviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => !isPending && setInviteOpen(false)}
          />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm p-6 z-10">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-gray-900">
                Invitar usuario
              </h2>
              <button
                onClick={() => !isPending && setInviteOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="invite-email">Email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="usuario@empresa.com"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && inviteEmail.trim()) handleInvite();
                  }}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="invite-role">Rol</Label>
                <select
                  id="invite-role"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B9AAA]/30"
                >
                  <option value="operator">
                    Operador — puede crear y editar órdenes
                  </option>
                  <option value="viewer">Visualizador — solo puede ver</option>
                </select>
              </div>

              <p className="text-xs text-gray-400">
                La invitación expira en 7 días. No se enviará un email real por ahora.
              </p>
            </div>

            {errorMsg && inviteOpen && (
              <p className="mt-3 text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">
                {errorMsg}
              </p>
            )}

            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setInviteOpen(false)}
                disabled={isPending}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleInvite}
                disabled={isPending || !inviteEmail.trim()}
                className="flex-1 bg-[#1B9AAA] hover:bg-[#156E79] text-white"
              >
                {isPending ? "Enviando..." : "Enviar invitación"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
