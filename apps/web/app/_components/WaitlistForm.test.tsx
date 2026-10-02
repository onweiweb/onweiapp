import {
  configure,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WaitlistForm } from "./WaitlistForm";

// The 1s default for waitFor/findBy is too tight when turbo runs every
// package's tests in parallel (and on Vercel's build machines): the success
// popup's exit animation alone can eat most of it. Only the failure case is
// slower; passing runs still resolve as soon as the condition is met.
configure({ asyncUtilTimeout: 5000 });

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
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: /start my warm up/i }));
}

describe("WaitlistForm consent", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("starts unticked and does not submit until the box is ticked", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<WaitlistForm />);
    const box = screen.getByRole("checkbox") as HTMLInputElement;
    expect(box.checked).toBe(false);
    expect(box.required).toBe(true);

    type("FULL NAME", "Asha");
    type("EMAIL ADDRESS", "a@b.co");
    type("PHONE NUMBER", "9876543210");
    fireEvent.click(screen.getByRole("button", { name: /start my warm up/i }));

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends consent: true once ticked", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ json: async () => ({ ok: true }) });
    vi.stubGlobal("fetch", fetchMock);
    render(<WaitlistForm />);

    fillAndSubmit();

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const sent = JSON.parse(
      (fetchMock.mock.calls[0]?.[1] as { body: string }).body,
    );
    expect(sent.consent).toBe(true);
  });
});

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

describe("WaitlistForm repeat sign-up", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("shows the already-on-the-list message in bold red", async () => {
    mockReply({ ok: true, alreadyJoined: true });
    render(<WaitlistForm />);
    fillAndSubmit();
    const status = await screen.findByText(/already on the list/i);
    expect(status).toHaveClass("font-bold", "text-[#b91c1c]");
  });
});

describe("WaitlistForm success popup", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("shows the welcome copy and an Instagram link", async () => {
    mockReply({ ok: true, alreadyJoined: false });
    render(<WaitlistForm instagramUrl="https://instagram.com/onwei" />);
    fillAndSubmit();
    await screen.findByText(/officially part of the movement/i);
    expect(screen.getByText(/watch your inbox/i)).toBeTruthy();
    expect(
      screen.getByRole("link", { name: /let's be friends/i }),
    ).toHaveAttribute("href", "https://instagram.com/onwei");
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() =>
      expect(screen.queryByText(/officially part of the movement/i)).toBeNull(),
    );
  });
});
