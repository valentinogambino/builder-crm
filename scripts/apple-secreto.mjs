#!/usr/bin/env node
// ============================================================================
// Builder CRM - generar el secreto de cliente de "Entrar con Apple"
// ============================================================================
//   npm run apple:secreto -- --team ABCDE12345 --key FGHIJ67890 \
//     --client com.cliente.crm.web --p8 ./AuthKey_FGHIJ67890.p8
//   npm run apple:secreto -- ... --dias 90 --env
//
// Imprime el JWT y la fecha en que vence (como maximo seis meses: Apple no acepta mas).
// Con --env imprime solo la linea para GoTrue. La clave .p8 no se copia ni se manda a
// ningun lado; guardala fuera del repo. Paso a paso en docs/APPLE-AUTH.md.
// ============================================================================

import { readFileSync } from "node:fs";
import { DIAS_POR_DEFECTO, firmarSecretoApple } from "./lib/apple-secreto.mjs";

const args = process.argv.slice(2);
const valor = (bandera) => {
  const i = args.indexOf(bandera);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : undefined;
};

const teamId = valor("--team") ?? process.env.APPLE_TEAM_ID;
const keyId = valor("--key") ?? process.env.APPLE_KEY_ID;
const clientId = valor("--client") ?? process.env.APPLE_CLIENT_ID;
const rutaP8 = valor("--p8") ?? process.env.APPLE_P8_PATH;
const dias = Number(valor("--dias") ?? DIAS_POR_DEFECTO);
const soloEnv = args.includes("--env");

if (!teamId || !keyId || !clientId || !rutaP8) {
  console.error(
    "Faltan datos. Uso:\n" +
      "  npm run apple:secreto -- --team <Team ID> --key <Key ID> " +
      "--client <Services ID> --p8 <ruta al .p8> [--dias 180] [--env]\n" +
      "Tambien se leen de APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_CLIENT_ID y APPLE_P8_PATH.",
  );
  process.exit(1);
}

let clavePem;
try {
  clavePem = readFileSync(rutaP8, "utf8");
} catch (e) {
  console.error(`No se pudo leer el .p8 (${rutaP8}): ${e.message}`);
  process.exit(1);
}

let resultado;
try {
  resultado = firmarSecretoApple({ teamId, keyId, clientId, clavePem, dias });
} catch (e) {
  console.error(`No se pudo firmar el secreto: ${e.message}`);
  process.exit(1);
}

const { secreto, vence } = resultado;
const fecha = vence.toISOString().slice(0, 10);

if (soloEnv) {
  console.log(`GOTRUE_EXTERNAL_APPLE_SECRET=${secreto}`);
} else {
  console.log("Secreto de cliente de Apple (va en GOTRUE_EXTERNAL_APPLE_SECRET,");
  console.log("o en Authentication -> Providers -> Apple -> Secret Key en Supabase cloud):\n");
  console.log(secreto);
  console.log(`\nVence el ${fecha}. Agenda generarlo de nuevo antes de esa fecha:`);
  console.log("cuando vence, entrar con Apple falla con invalid_client y nada mas avisa.");
}
