// ============================================================================
// Builder CRM - secreto de cliente para "Entrar con Apple"
// ============================================================================
// Apple no da un secreto fijo como Google: el "client secret" es un JWT ES256 que firma
// cada equipo con su clave .p8, y vale como maximo seis meses. Esta funcion lo arma; el
// script `scripts/apple-secreto.mjs` la usa desde la linea de comandos.
// Ver docs/APPLE-AUTH.md y specs/nucleo/12-entrar-con-apple.md.
// ============================================================================

import { createPrivateKey, sign } from "node:crypto";

/** Tope de Apple para `exp - iat`, en segundos (algo menos de 183 dias). */
export const MAXIMO_SEGUNDOS = 15_777_000;

/** Duracion por defecto y maxima que ofrece el script, en dias. */
export const DIAS_POR_DEFECTO = 180;

const base64url = (entrada) => Buffer.from(entrada).toString("base64url");

/**
 * Firma el secreto de cliente de Apple.
 *
 * @param {object} opciones
 * @param {string} opciones.teamId    Team ID de Apple Developer (10 caracteres).
 * @param {string} opciones.keyId     Key ID de la clave .p8 (10 caracteres).
 * @param {string} opciones.clientId  Services ID, por ejemplo `com.cliente.crm.web`.
 * @param {string} opciones.clavePem  Contenido del archivo .p8.
 * @param {number} [opciones.dias]    Cuanto vale. Por defecto 180; nunca mas que el tope.
 * @param {number} [opciones.ahora]   Segundos Unix de emision (para las pruebas).
 * @returns {{ secreto: string, vence: Date }}
 */
export function firmarSecretoApple({ teamId, keyId, clientId, clavePem, dias, ahora }) {
  for (const [nombre, valor] of Object.entries({ teamId, keyId, clientId, clavePem })) {
    if (!valor || typeof valor !== "string" || !valor.trim()) {
      throw new Error(`Falta ${nombre}.`);
    }
  }

  const duracionDias = dias ?? DIAS_POR_DEFECTO;
  if (!Number.isFinite(duracionDias) || duracionDias <= 0) {
    throw new Error("Los dias tienen que ser un numero mayor que cero.");
  }

  const iat = Math.floor(ahora ?? Date.now() / 1000);
  const exp = iat + Math.min(Math.round(duracionDias * 86_400), MAXIMO_SEGUNDOS);

  const clave = createPrivateKey(clavePem);
  if (clave.asymmetricKeyType !== "ec") {
    throw new Error("La clave no es de curva eliptica: tiene que ser el .p8 de Apple.");
  }

  const cabecera = base64url(JSON.stringify({ alg: "ES256", kid: keyId.trim() }));
  const cuerpo = base64url(
    JSON.stringify({
      iss: teamId.trim(),
      iat,
      exp,
      aud: "https://appleid.apple.com",
      sub: clientId.trim(),
    }),
  );
  // JWS pide la firma ECDSA como r||s (64 bytes), no en DER, que es lo que Node da por
  // defecto. Con DER Apple contesta `invalid_client` sin mas detalle.
  const firma = sign("sha256", Buffer.from(`${cabecera}.${cuerpo}`), {
    key: clave,
    dsaEncoding: "ieee-p1363",
  }).toString("base64url");

  return { secreto: `${cabecera}.${cuerpo}.${firma}`, vence: new Date(exp * 1000) };
}
