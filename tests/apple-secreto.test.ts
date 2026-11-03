import { describe, it, expect } from "vite-plus/test";
import { generateKeyPairSync, verify } from "node:crypto";
import { firmarSecretoApple, MAXIMO_SEGUNDOS } from "../scripts/lib/apple-secreto.mjs";
import { esCorreoRelevoApple } from "@/lib/auth-proveedores";

/**
 * El secreto de "Entrar con Apple" falla en silencio: si la firma o un claim estan mal,
 * Apple contesta `invalid_client` y el boton simplemente no entra. Estas pruebas fijan
 * el formato que Apple exige (specs/nucleo/12-entrar-con-apple.md, FR-002).
 */

const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
const clavePem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();

const base = {
  teamId: "TEAM123456",
  keyId: "KEY1234567",
  clientId: "com.cliente.crm.web",
  clavePem,
  ahora: 1_800_000_000,
};

function partes(jwt: string) {
  const [cabecera, cuerpo, firma] = jwt.split(".");
  return {
    cabecera: JSON.parse(Buffer.from(cabecera, "base64url").toString()),
    cuerpo: JSON.parse(Buffer.from(cuerpo, "base64url").toString()),
    firmado: `${cabecera}.${cuerpo}`,
    firma: Buffer.from(firma, "base64url"),
  };
}

describe("firmarSecretoApple", () => {
  it("arma los claims que pide Apple", () => {
    const { secreto } = firmarSecretoApple(base);
    const { cabecera, cuerpo } = partes(secreto);
    expect(cabecera).toEqual({ alg: "ES256", kid: "KEY1234567" });
    expect(cuerpo).toEqual({
      iss: "TEAM123456",
      iat: 1_800_000_000,
      exp: 1_800_000_000 + 180 * 86_400,
      aud: "https://appleid.apple.com",
      sub: "com.cliente.crm.web",
    });
  });

  it("firma en formato JOSE (r||s de 64 bytes) y verifica con la clave publica", () => {
    const { secreto } = firmarSecretoApple(base);
    const { firmado, firma } = partes(secreto);
    expect(firma.length).toBe(64);
    const valida = verify(
      "sha256",
      Buffer.from(firmado),
      { key: publicKey, dsaEncoding: "ieee-p1363" },
      firma,
    );
    expect(valida).toBe(true);
  });

  it("nunca pasa el tope de seis meses de Apple", () => {
    const { secreto, vence } = firmarSecretoApple({ ...base, dias: 365 });
    const { cuerpo } = partes(secreto);
    expect(cuerpo.exp - cuerpo.iat).toBe(MAXIMO_SEGUNDOS);
    expect(vence.getTime()).toBe(cuerpo.exp * 1000);
  });

  it("rechaza una clave que no es de curva eliptica", () => {
    const { privateKey: rsa } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const pem = rsa.export({ type: "pkcs8", format: "pem" }).toString();
    expect(() => firmarSecretoApple({ ...base, clavePem: pem })).toThrow(/curva eliptica/);
  });

  it("rechaza datos faltantes y dias invalidos", () => {
    expect(() => firmarSecretoApple({ ...base, teamId: "" })).toThrow(/teamId/);
    expect(() => firmarSecretoApple({ ...base, dias: 0 })).toThrow(/dias/);
  });
});

describe("esCorreoRelevoApple", () => {
  it("reconoce la direccion de relevo de 'Ocultar mi correo' y nada mas", () => {
    expect(esCorreoRelevoApple("abc123xyz@privaterelay.appleid.com")).toBe(true);
    expect(esCorreoRelevoApple(" ABC@PrivateRelay.AppleID.com ")).toBe(true);
    expect(esCorreoRelevoApple("ana@icloud.com")).toBe(false);
    expect(esCorreoRelevoApple("x@privaterelay.appleid.com.evil.io")).toBe(false);
    expect(esCorreoRelevoApple(null)).toBe(false);
  });
});
