import { describe, it, expect } from "vitest";
import { safeStr, onlyDigits, safeLower, safeTrim } from "@/utils/safe";

// Replica normalizeCliente from Clientes.tsx
const normalizeCliente = (c: any) => ({
  ...c,
  id: c?.id ?? '',
  nome: safeStr(c?.nome),
  celular: safeStr(c?.celular),
  telefone: c?.telefone ?? null,
  email: c?.email ?? null,
  cpf: c?.cpf ?? null,
  cep: c?.cep ?? null,
  endereco: c?.endereco ?? null,
  numero: c?.numero ?? null,
  complemento: c?.complemento ?? null,
  bairro: c?.bairro ?? null,
  cidade: c?.cidade ?? null,
  estado: c?.estado ?? null,
  observacoes: c?.observacoes ?? null,
  data_nascimento: c?.data_nascimento ?? null,
  foto_url: c?.foto_url ?? null,
  ativo: c?.ativo ?? true,
  total_visitas: c?.total_visitas ?? 0,
  ultima_visita: c?.ultima_visita ?? null,
  created_at: c?.created_at ?? new Date().toISOString(),
  updated_at: c?.updated_at ?? new Date().toISOString(),
});

// Replica helpers from Clientes.tsx
const getInitials = (name: string | null | undefined) => {
  const safe = safeStr(name);
  if (!safe) return "?";
  return safe.split(" ").map((n) => n[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
};

const getAvatarColor = (name: string | null | undefined) => {
  const safe = safeStr(name);
  const colors = ["bg-primary", "bg-success", "bg-warning", "bg-pink-500", "bg-purple-500", "bg-cyan-500", "bg-orange-500"];
  const index = safe.length > 0 ? safe.charCodeAt(0) % colors.length : 0;
  return colors[index];
};

const formatPhone = (phone: string | null | undefined) => {
  if (!phone) return "-";
  const digits = safeStr(phone).replace(/\D/g, "");
  if (digits.length < 10) return safeStr(phone);
  return digits.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
};

const cleanPhoneForWhatsApp = (phone: string | null | undefined) => {
  if (!phone) return "55";
  const cleaned = safeStr(phone).replace(/\D/g, "");
  return cleaned.startsWith("55") ? cleaned : `55${cleaned}`;
};

const removeAccents = (str: string | null | undefined): string => {
  return safeStr(str).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

// 6 clientes fake com campos null/undefined
const fakeClientes = [
  { id: "1", nome: null, celular: null, telefone: null, cpf: null, email: null },
  { id: "2", nome: undefined, celular: undefined, telefone: undefined, cpf: undefined },
  { id: "3", nome: "", celular: "", cpf: "" },
  { id: null, nome: "João", celular: "(11) 99999-0000" },
  { id: "5" }, // objeto mínimo
  { id: "6", nome: "Maria Silva", celular: "11988887777", cpf: "123.456.789-00", email: "maria@test.com" },
];

describe("Clientes Safety Check", () => {
  describe("safeStr helpers", () => {
    it("safeStr handles null/undefined/number", () => {
      expect(safeStr(null)).toBe("");
      expect(safeStr(undefined)).toBe("");
      expect(safeStr(123)).toBe("123");
      expect(safeStr("abc")).toBe("abc");
    });

    it("onlyDigits strips non-digits safely", () => {
      expect(onlyDigits(null)).toBe("");
      expect(onlyDigits("(11) 9999-0000")).toBe("1199990000");
    });

    it("safeLower handles null", () => {
      expect(safeLower(null)).toBe("");
      expect(safeLower("ABC")).toBe("abc");
    });

    it("safeTrim handles null", () => {
      expect(safeTrim(null)).toBe("");
      expect(safeTrim("  hi  ")).toBe("hi");
    });
  });

  describe("normalizeCliente", () => {
    it("normalizes all 6 fake clients without throwing", () => {
      for (const fake of fakeClientes) {
        expect(() => normalizeCliente(fake)).not.toThrow();
      }
    });

    it("provides safe defaults for fully null client", () => {
      const normalized = normalizeCliente(fakeClientes[0]);
      expect(normalized.nome).toBe("");
      expect(normalized.celular).toBe("");
      expect(normalized.total_visitas).toBe(0);
      expect(normalized.ativo).toBe(true);
    });

    it("preserves valid data", () => {
      const normalized = normalizeCliente(fakeClientes[5]);
      expect(normalized.nome).toBe("Maria Silva");
      expect(normalized.celular).toBe("11988887777");
    });
  });

  describe("UI helper functions", () => {
    it("getInitials handles null/undefined/empty", () => {
      expect(getInitials(null)).toBe("?");
      expect(getInitials(undefined)).toBe("?");
      expect(getInitials("")).toBe("?");
      expect(getInitials("João Silva")).toBe("JS");
    });

    it("getAvatarColor handles null/undefined", () => {
      expect(() => getAvatarColor(null)).not.toThrow();
      expect(() => getAvatarColor(undefined)).not.toThrow();
      expect(getAvatarColor(null)).toBe("bg-primary"); // index 0 fallback
    });

    it("formatPhone handles null/undefined", () => {
      expect(formatPhone(null)).toBe("-");
      expect(formatPhone(undefined)).toBe("-");
      expect(formatPhone("11999990000")).toMatch(/\(\d{2}\)/);
    });

    it("cleanPhoneForWhatsApp handles null/undefined", () => {
      expect(cleanPhoneForWhatsApp(null)).toBe("55");
      expect(cleanPhoneForWhatsApp(undefined)).toBe("55");
      expect(cleanPhoneForWhatsApp("11999990000")).toBe("5511999990000");
    });

    it("removeAccents handles null/undefined", () => {
      expect(removeAccents(null)).toBe("");
      expect(removeAccents(undefined)).toBe("");
      expect(removeAccents("café")).toBe("cafe");
    });
  });

  describe("Full pipeline: normalize + all helpers", () => {
    it("processes all 6 fake clients through every helper without exception", () => {
      for (const fake of fakeClientes) {
        const c = normalizeCliente(fake);
        expect(() => {
          getInitials(c.nome);
          getAvatarColor(c.nome);
          formatPhone(c.celular);
          cleanPhoneForWhatsApp(c.celular);
          removeAccents(c.nome);
          safeStr(c.nome).split(" ")[0];
          safeStr(c.nome).localeCompare(safeStr(c.celular));
        }).not.toThrow();
      }
    });
  });
});
