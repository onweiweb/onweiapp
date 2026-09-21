import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dir, "..");

describe("shared config files", () => {
  it("tsconfig/base.json is valid JSON", () => {
    const content = readFileSync(
      path.join(root, "tsconfig/base.json"),
      "utf-8",
    );
    expect(() => JSON.parse(content)).not.toThrow();
  });

  it("tsconfig/nextjs.json is valid JSON", () => {
    const content = readFileSync(
      path.join(root, "tsconfig/nextjs.json"),
      "utf-8",
    );
    expect(() => JSON.parse(content)).not.toThrow();
  });

  it("eslint/base.js exports a config array", async () => {
    const { default: config } = await import(path.join(root, "eslint/base.js"));
    expect(Array.isArray(config)).toBe(true);
  });

  it("tailwind/base.css imports tailwindcss", () => {
    const content = readFileSync(path.join(root, "tailwind/base.css"), "utf-8");
    expect(content).toContain('@import "tailwindcss"');
  });
});
