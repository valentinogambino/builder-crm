# Spec: Entrar con Apple

**Carril**: completo (camino de autenticacion y script nuevo del nucleo)
**Estado**: implementada, sin publicar
**Fecha**: 2026-11-02
**Escrita antes del codigo**: si. Amplia [08-auth-externa](08-auth-externa.md), que ya
deja entrar con cualquier proveedor que el servidor de autenticacion tenga encendido.

## Problema

Parte del equipo de un cliente usa iPhone y Mac, y quiere la misma entrada rapida que
Google sin otra contrasena. El mecanismo de 08 ya dibujaria un boton "Continuar con
Apple" si GoTrue lo tiene encendido, pero Apple tiene tres diferencias que lo dejan a
medias:

1. **El secreto vence.** El "secreto de cliente" de Apple no es un texto fijo: es un JWT
   ES256 firmado con la clave `.p8` del equipo de Apple, y vale como maximo seis meses.
   Sin una forma de generarlo, el operador depende de una herramienta externa a la que
   le pega su clave privada.
2. **"Ocultar mi correo".** Apple ofrece entregar una direccion de relevo
   (`...@privaterelay.appleid.com`) en lugar del correo real. Esa direccion no coincide
   con la que el administrador cargo en Ajustes -> Equipo, asi que la persona cae en
   `/sin-acceso` sin entender por que.
3. **Sin nombre.** En el flujo web de OAuth Apple no entrega el nombre de la persona.

## Decisiones del dueno

- D1 (2026-11-02) Apple complementa a email y contrasena y a Google; no reemplaza nada.
  El login con contrasena no se toca.
- D2 (2026-11-02) Se mantiene D2 de 08: ninguna variable propia del CRM. Apple se
  enciende en el servidor de autenticacion y el boton aparece solo.

## Escenarios

1. **Sin configurar** — El login queda como hoy.
2. **Configurado** — Aparece "Continuar con Apple" con el logo de Apple, junto a Google si
   tambien esta encendido. Quien esta en el equipo con su correo de Apple entra y cae en
   el inicio.
3. **Correo oculto** — Quien eligio "Ocultar mi correo" entra a Apple, vuelve y cae en
   `/sin-acceso`. La pantalla le explica que Apple entrego una direccion de relevo, cual
   es, y que puede volver a entrar compartiendo su correo o pedir que lo den de alta con
   esa direccion.
4. **Ya tenia contrasena** — Si el correo coincide con un miembro existente, Apple se
   vincula a esa misma cuenta (mismo `id` de `team_members`, mismo rol). La contrasena
   sigue funcionando.
5. **Secreto por vencer** — El operador corre `npm run apple:secreto` con su `.p8`, y el
   script imprime el JWT y la fecha en que vence.

## Requisitos

- FR-001 `BotonProveedor` muestra el logo propio de Google y de Apple; el resto conserva
  el icono generico.
- FR-002 `scripts/apple-secreto.mjs` genera el secreto: JWT con cabecera
  `{ alg: "ES256", kid: <Key ID> }` y cuerpo `{ iss: <Team ID>, iat, exp, aud:
  "https://appleid.apple.com", sub: <Services ID> }`, firma ES256 en formato JOSE
  (r||s de 64 bytes). Duracion por defecto 180 dias, tope 180 (Apple rechaza mas de
  15777000 segundos). La clave se lee de un archivo; no se guarda ni se manda a ningun
  lado.
- FR-003 La firma vive en una funcion pura (`scripts/lib/apple-secreto.mjs`) con prueba:
  el JWT se verifica con la clave publica y la duracion respeta el tope.
- FR-004 `/sin-acceso` detecta un correo de relevo de Apple y explica el escenario 3.
  Con cualquier otro correo la pantalla queda igual.
- FR-005 Nada de esto cambia el acceso: sigue decidiendolo `team_members` (FR-005 de 08).
- FR-006 `docs/APPLE-AUTH.md` documenta la configuracion en Apple Developer, en GoTrue
  autoalojado y en Supabase cloud, la renovacion semestral y los fallos tipicos.

## Configuracion y modulos

Ninguna variable del CRM. Autoalojado: `GOTRUE_EXTERNAL_APPLE_ENABLED`, `CLIENT_ID`
(el Services ID), `SECRET` (el JWT de FR-002) y `REDIRECT_URI`. Supabase cloud: el
interruptor del panel.

## Modelo de datos

Ninguno. El nombre de un miembro que entra con Apple sale de lo que cargo el
administrador en Ajustes -> Equipo. Si el primer administrador de una instancia nueva se
registra con Apple, queda sin nombre (el disparador ya admite `null`) y se completa
despues.

## Agente de IA

No lo toca.

## Criterios de aceptacion

- CA-001 Sin Apple encendido, `/login` no muestra el boton.
- CA-002 Con `"apple": true` en `/auth/v1/settings`, el boton aparece con el logo de Apple.
- CA-003 `npm test` verifica la firma y el tope de duracion del secreto.
- CA-004 Un usuario con correo `@privaterelay.appleid.com` fuera del equipo ve la
  explicacion en `/sin-acceso`.
- CA-005 Email y contrasena siguen entrando igual (sin cambios en `login/actions.ts`).

## Constitution Check

- I. Nucleo intocable: es nucleo y generico; la instancia no edita nada.
- II. Spec antes que codigo: si.
- III. Autoverificacion: prueba del secreto; el verificador ya informa "apple" en
  "Formas de entrar".
- IV. Cero secretos: la `.p8` y el JWT viven fuera del repo; el script solo imprime.

## Fuera de alcance

- Entrar con Apple desde una app nativa (`signInWithIdToken`).
- Renovar el secreto automaticamente.
- Pedir el nombre en un formulario de bienvenida.
