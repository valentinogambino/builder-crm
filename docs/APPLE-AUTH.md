# Entrar con Apple

Opcional y apagado de fabrica, igual que [Google](GOOGLE-AUTH.md). Si lo configuras,
aparece **Continuar con Apple** en el login; si no, no aparece. El CRM no tiene
variables propias: le pregunta al servidor de autenticacion que proveedores tiene
encendidos. Email y contrasena siguen funcionando igual.

## Lo primero

**Entrar con Apple NO da acceso al CRM.** Quien no este en Ajustes -> Equipo con ese
mismo correo termina en `/sin-acceso`. Orden de trabajo: primero das de alta a la
persona con el correo de su Apple ID (contrasena temporal vacia si va a entrar solo con
Apple) y despues ella entra con el boton. Si ya tenia contrasena, Apple se vincula a esa
misma cuenta y conserva su rol.

Tres cosas de Apple que Google no tiene:

- **El secreto vence a los seis meses.** Es un JWT firmado con tu clave `.p8`. Se genera
  con `npm run apple:secreto` y hay que renovarlo antes de que venza.
- **"Ocultar mi correo".** Si la persona lo elige, Apple entrega una direccion
  `...@privaterelay.appleid.com` que no coincide con la del equipo. `/sin-acceso` se lo
  explica: puede volver a entrar eligiendo **Compartir mi correo**, o el administrador la
  da de alta con esa direccion de relevo.
- **No llega el nombre.** En el flujo web Apple no entrega el nombre. El que se ve en el
  CRM es el que cargo el administrador en Ajustes -> Equipo.

## En Apple Developer

Hace falta una cuenta paga del Apple Developer Program, idealmente la del cliente.

1. **Certificates, Identifiers & Profiles -> Identifiers -> App IDs**: crea uno (o usa
   uno existente) con la capacidad **Sign In with Apple**. Anota el **Team ID** (arriba a
   la derecha).
2. **Identifiers -> Services IDs**: crea uno, por ejemplo `com.cliente.crm.web`. Ese es el
   **Client ID**. Activa **Sign In with Apple** y en **Configure**:
   - *Primary App ID*: el del paso 1.
   - *Domains and Subdomains*: el dominio del **servidor de autenticacion**
     (`auth.tudominio.com`, o `TU_REF.supabase.co` en Supabase cloud), sin `https://`.
   - *Return URLs*:

     ```
     https://auth.tudominio.com/auth/v1/callback
     ```

     Apple no acepta `http` ni `localhost`: para probar en local hace falta un dominio
     publico con HTTPS.
3. **Keys**: crea una clave con **Sign In with Apple**, asociada al App ID del paso 1.
   Descarga el `AuthKey_XXXXXXXXXX.p8` (se baja una sola vez) y anota su **Key ID**.
   Guardala fuera del repo, en el gestor de contrasenas del cliente.
4. Opcional: en **Sign in with Apple for Email Communication**, registra el dominio desde
   el que el CRM manda correos, para que lleguen a las direcciones de relevo.

## Generar el secreto

```bash
npm run apple:secreto -- --team ABCDE12345 --key FGHIJ67890 \
  --client com.cliente.crm.web --p8 ~/claves/AuthKey_FGHIJ67890.p8
```

Imprime el JWT y la fecha en que vence (180 dias; `--dias` acorta, nunca alarga: Apple
no acepta mas de seis meses). Con `--env` imprime solo la linea
`GOTRUE_EXTERNAL_APPLE_SECRET=...`. El script no guarda ni manda la clave a ningun lado.

**Agenda la renovacion.** Cuando el secreto vence, el boton sigue apareciendo pero Apple
responde `invalid_client` y nadie entra con Apple. Email, contrasena y Google no se
afectan.

## Encenderlo

### Autoalojado (GoTrue en tu VPS)

```
GOTRUE_EXTERNAL_APPLE_ENABLED=true
GOTRUE_EXTERNAL_APPLE_CLIENT_ID=com.cliente.crm.web
GOTRUE_EXTERNAL_APPLE_SECRET=eyJ...
GOTRUE_EXTERNAL_APPLE_REDIRECT_URI=https://auth.tudominio.com/auth/v1/callback
```

Y la URL del CRM en `GOTRUE_URI_ALLOW_LIST` (si ya configuraste Google, ya esta):

```
GOTRUE_URI_ALLOW_LIST=https://crm.tudominio.com/**
```

Reinicia el contenedor de autenticacion.

### Supabase cloud

Panel -> **Authentication -> Providers -> Apple**: encendelo, pega el Services ID en
*Client IDs* (primero, si tambien hay apps nativas) y el JWT en *Secret Key*. En **URL
Configuration** tiene que estar `https://crm.tudominio.com/**` en las *Redirect URLs*.

## Comprobarlo

```bash
curl https://auth.tudominio.com/auth/v1/settings -H "apikey: TU_ANON_KEY" # gitleaks:allow
```

Tiene que traer `"apple": true` dentro de `"external"`. `npm run verificar` lo informa en
la linea **Formas de entrar**. El CRM cachea esa respuesta cinco minutos.

## Como funciona por dentro

Es el mismo camino que Google ([GOOGLE-AUTH.md](GOOGLE-AUTH.md#como-funciona-por-dentro)):
`signInWithOAuth` en el navegador, Apple vuelve al servidor de autenticacion (por POST),
este manda al CRM a `/auth/callback` con un codigo, y la ruta lo canjea por la sesion.
`team_members` decide si entra.

## Lo que se rompe y por que

- **`invalid_client`.** El secreto vencio, o el Team ID, Key ID o Services ID no
  coinciden. Generalo de nuevo con los tres datos de la consola.
- **`invalid_request` / "Invalid redirect_uri".** La Return URL o el dominio del paso 2 no
  coinciden caracter por caracter con los del servidor de autenticacion.
- **Entra y cae en `/sin-acceso` mostrando un `@privaterelay.appleid.com`.** Eligio
  ocultar su correo. Ver "Lo primero".
- **Entra y cae en `/sin-acceso` con su correo real.** Falta darlo de alta en Ajustes ->
  Equipo con ese correo.
