import Link from "next/link";
import { ShieldOff } from "lucide-react";
import { signOut } from "@/app/login/actions";
import { createClient } from "@/lib/supabase/server";
import { modoLocal } from "@/lib/modo-local";
import { esCorreoRelevoApple } from "@/lib/auth-proveedores";

/**
 * Usuario autenticado pero fuera del equipo: se desactivo, o entro por un signup que
 * ya no deberia estar abierto. No se le muestra nada del CRM.
 *
 * Caso aparte: quien entro con Apple eligiendo "Ocultar mi correo". Apple entrega una
 * direccion de relevo que no coincide con la del equipo, y sin explicarlo parece un
 * error (specs/nucleo/12-entrar-con-apple.md, FR-004).
 */
async function correoDeLaSesion(): Promise<string | null> {
  if (modoLocal()) return null;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    return data.user?.email ?? null;
  } catch {
    return null;
  }
}

export default async function SinAccesoPage() {
  const correo = await correoDeLaSesion();
  const relevoApple = esCorreoRelevoApple(correo);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center gap-4 px-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border bg-card shadow-sm">
        <ShieldOff className="h-5 w-5 text-muted-foreground" />
      </div>
      <h1 className="text-lg font-medium">Tu usuario no forma parte del equipo</h1>
      {relevoApple ? (
        <div className="text-sm text-muted-foreground max-w-sm space-y-2">
          <p>
            Entraste con Apple ocultando tu correo, asi que Apple nos dio una direccion de relevo en
            lugar de la que tiene cargada tu equipo:
          </p>
          <p className="font-mono text-xs break-all">{correo}</p>
          <p>
            Cierra sesion y vuelve a entrar con Apple eligiendo <b>Compartir mi correo</b>, o pide a
            un administrador que te agregue desde Ajustes → Equipo con esa direccion.
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground max-w-sm">
          Pide a un administrador que te agregue desde Ajustes → Equipo. Si ya te agregaron, cierra
          sesion y vuelve a entrar.
        </p>
      )}
      <form action={signOut}>
        <button type="submit" className="text-sm text-primary hover:underline cursor-pointer">
          Cerrar sesion
        </button>
      </form>
      <Link href="/login" className="text-xs text-muted-foreground hover:underline">
        Ir al inicio de sesion
      </Link>
    </div>
  );
}
