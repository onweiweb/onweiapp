import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
  it("verifies a correct password against its hash", async () => {
    const hash = await hashPassword("correct horse battery staple");

    expect(await verifyPassword("correct horse battery staple", hash)).toBe(
      true,
    );
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword("correct horse battery staple");

    expect(await verifyPassword("wrong password", hash)).toBe(false);
  });

  it("never stores the plaintext password in the hash", async () => {
    const plain = "correct horse battery staple";
    const hash = await hashPassword(plain);

    expect(hash).not.toContain(plain);
  });

  it("produces a different hash each time (random salt)", async () => {
    const plain = "correct horse battery staple";
    const [hashA, hashB] = await Promise.all([
      hashPassword(plain),
      hashPassword(plain),
    ]);

    expect(hashA).not.toEqual(hashB);
  });
});
