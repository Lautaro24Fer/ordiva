import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { verifyPassword } from "@/lib/password";
import { createPrismaRepositories } from "@/lib/repositories/prisma";
import { registerUser, verifyCredentials } from "@/modules/auth/auth.service";
import { loginSchema, registerSchema } from "@/schemas/auth";
import { createTestPrisma, resetDatabase } from "./test-db";

const prisma = createTestPrisma();

beforeEach(async () => {
  await resetDatabase(prisma);
});

afterAll(async () => {
  await prisma.$disconnect();
});

const repos = createPrismaRepositories(prisma);
const register = (input: unknown) => registerUser(repos, registerSchema.parse(input));
const login = (input: unknown) => verifyCredentials(repos, loginSchema.parse(input));

describe("registerUser", () => {
  it("guarda el email normalizado y la contraseña con Argon2id", async () => {
    const user = await register({ name: "Ana", email: "  Ana@Example.COM ", password: "una-clave-segura" });
    expect(user).toEqual({ id: expect.any(Number), name: "Ana", email: "ana@example.com" });

    const stored = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(stored.passwordHash).toMatch(/^\$argon2id\$/);
    expect(stored.passwordHash).not.toContain("una-clave-segura");
    expect(await verifyPassword(stored.passwordHash!, "una-clave-segura")).toBe(true);
  });

  it("rechaza un email ya registrado (sin importar mayúsculas) con 409", async () => {
    await register({ name: "Ana", email: "ana@example.com", password: "una-clave-segura" });
    await expect(register({ name: "Otra", email: "ANA@example.com", password: "otra-clave-segura" })).rejects.toMatchObject({
      status: 409,
      code: "EMAIL_TAKEN",
    });
    expect(await prisma.user.count()).toBe(1);
  });

  it("exige contraseñas de al menos 10 caracteres", () => {
    expect(registerSchema.safeParse({ name: "Ana", email: "ana@example.com", password: "corta" }).success).toBe(false);
  });
});

describe("verifyCredentials", () => {
  beforeEach(async () => {
    await register({ name: "Ana", email: "ana@example.com", password: "una-clave-segura" });
  });

  it("devuelve el usuario con credenciales correctas (email sin normalizar incluido)", async () => {
    expect(await login({ email: " ANA@example.com", password: "una-clave-segura" })).toMatchObject({
      name: "Ana",
      email: "ana@example.com",
    });
  });

  it("devuelve null con contraseña incorrecta", async () => {
    expect(await login({ email: "ana@example.com", password: "otra-clave" })).toBeNull();
  });

  it("devuelve null para un email inexistente, sin distinguir el motivo", async () => {
    expect(await login({ email: "nadie@example.com", password: "una-clave-segura" })).toBeNull();
  });

  it("devuelve null para usuarios sin contraseña", async () => {
    await prisma.user.create({ data: { name: "Sin clave", email: "sinclave@example.com" } });
    expect(await login({ email: "sinclave@example.com", password: "cualquier-cosa" })).toBeNull();
  });
});
