"use client";

import { useActionState } from "react";
import Image from "next/image";
import Link from "next/link";
import { register } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const INDUSTRIES = [
  { value: "metalurgica", label: "Metalúrgica" },
  { value: "taller", label: "Taller mecánico" },
  { value: "carpinteria", label: "Carpintería" },
  { value: "electronica", label: "Electrónica" },
  { value: "otro", label: "Otro" },
];

export default function RegisterPage() {
  const [state, action, isPending] = useActionState(register, null);

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="items-center text-center">
        <Image
          src="/logo.png"
          alt="Prodify"
          width={120}
          height={40}
          className="mb-2 object-contain"
          priority
        />
        <CardTitle>Crear cuenta</CardTitle>
        <CardDescription>Registrá tu empresa en Prodify</CardDescription>
      </CardHeader>

      <CardContent>
        <form action={action} className="space-y-4">
          {state?.error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
              {state.error}
            </p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="company_name">Nombre de empresa</Label>
            <Input
              id="company_name"
              name="company_name"
              placeholder="Acme S.A."
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="industry">Industria</Label>
            <select
              id="industry"
              name="industry"
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Seleccioná una industria</option>
              {INDUSTRIES.map((i) => (
                <option key={i.value} value={i.value}>
                  {i.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="full_name">Nombre completo</Label>
            <Input
              id="full_name"
              name="full_name"
              placeholder="Juan García"
              required
              autoComplete="name"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="tu@empresa.com"
              required
              autoComplete="email"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Creando cuenta…" : "Crear cuenta"}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="justify-center text-sm text-muted-foreground">
        ¿Ya tenés cuenta?&nbsp;
        <Link href="/login" className="text-primary hover:underline font-medium">
          Iniciá sesión
        </Link>
      </CardFooter>
    </Card>
  );
}
