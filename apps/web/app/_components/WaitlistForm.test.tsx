import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WaitlistForm } from "./WaitlistForm";

function mockReply(body: unknown) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ json: async () => body }));
}

function type(placeholder: string, value: string) {
  fireEvent.change(screen.getByPlaceholderText(placeholder), {
    target: { value },
  });
}

function fillAndSubmit() {
  type("FULL NAME", "Asha");
  type("EMAIL ADDRESS", "a@b.co");
  type("PHONE NUMBER", "9876543210");
  fireEvent.click(screen.getByRole("button", { name: /start my warm up/i }));
}

describe("WaitlistForm field errors", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("shows a duplicate phone error under the phone field", async () => {
    Element.prototype.scrollIntoView = vi.fn();
    mockReply({ ok: false, reason: "DUPLICATE_PHONE" });
    render(<WaitlistForm />);
    fillAndSubmit();
    const phone = screen.getByPlaceholderText("PHONE NUMBER");
    await waitFor(() => expect(phone).toHaveAttribute("aria-invalid", "true"));
    expect(screen.getByRole("alert")).toHaveTextContent(
      /phone number is already/i,
    );
    expect(phone).toHaveFocus();
    expect(screen.getByPlaceholderText("EMAIL ADDRESS")).toHaveAttribute(
      "aria-invalid",
      "false",
    );
  });

  it("clears the error when the field is edited", async () => {
    Element.prototype.scrollIntoView = vi.fn();
    mockReply({ ok: false, reason: "DUPLICATE_EMAIL" });
    render(<WaitlistForm />);
    fillAndSubmit();
    await screen.findByRole("alert");
    type("EMAIL ADDRESS", "a@b.com");
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
