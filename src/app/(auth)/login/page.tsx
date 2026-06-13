"use client";

import { useActionState } from "react";
import Image from "next/image";
import Link from "next/link";
import { login } from "./actions";
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

export default function LoginPage() {
  const [state, action, isPending] = useActionState(login, null);

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="items-center text-center">
        <Image
          src="/logo.png"
          alt="Prodify"
          width={120}
          height={40}
          className="mb-2 object-contain"
          priority
        />
        <CardTitle>Iniciar sesión</CardTitle>
        <CardDescription>Ingresá a tu cuenta de Prodify</CardDescription>
      </CardHeader>

      <CardContent>
        <form action={action} className="space-y-4">
          {state?.error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
              {state.error}
            </p>
          )}

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
              autoComplete="current-password"
            />
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Ingresando…" : "Ingresar"}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="justify-center text-sm text-muted-foreground">
        ¿No tenés cuenta?&nbsp;
        <Link href="/register" className="text-primary hover:underline font-medium">
          Registrate
        </Link>
      </CardFooter>
    </Card>
  );
}
