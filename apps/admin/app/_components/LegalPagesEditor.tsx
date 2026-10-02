"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminButton, AdminCard, AdminInput, AdminTextarea } from "./ui";

export interface LegalSectionRow {
  id: string;
  heading: string;
  body: string;
  isActive: boolean;
}

export interface LegalPageRow {
  id: string;
  slug: string;
  title: string;
  intro: string | null;
  sections: LegalSectionRow[];
}

const PUBLIC_PATH: Record<string, string> = {
  privacy: "/privacy",
  terms: "/terms",
};

async function send(
  url: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: unknown,
): Promise<string | null> {
  try {
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = (await response.json()) as { ok: boolean; error?: string };
    return data.ok ? null : (data.error ?? "That didn't save. Try again.");
  } catch {
    return "Couldn't reach the server. Check your connection and try again.";
  }
}

function SectionEditor({
  section,
  isFirst,
  isLast,
}: {
  section: LegalSectionRow;
  isFirst: boolean;
  isLast: boolean;
}) {
  const router = useRouter();
  const [heading, setHeading] = useState(section.heading);
  const [body, setBody] = useState(section.body);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const changed = heading !== section.heading || body !== section.body;

  async function run(action: () => Promise<string | null>, done?: string) {
    setBusy(true);
    setMessage(null);
    const error = await action();
    setBusy(false);
    if (error) {
      setMessage(error);
      return;
    }
    if (done) setMessage(done);
    router.refresh();
  }

  const base = `/api/content/legal/sections/${section.id}`;

  return (
    <div
      className={`flex flex-col gap-2 rounded-[1.25rem] border border-onwei-beige p-4 ${
        section.isActive ? "" : "bg-onwei-beige/40"
      }`}
    >
      <AdminInput
        aria-label="Heading"
        value={heading}
        onChange={(e) => setHeading(e.target.value)}
      />
      <AdminTextarea
        aria-label="Text"
        rows={6}
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <div className="flex flex-wrap items-center gap-2">
        <AdminButton
          type="button"
          disabled={busy || !changed}
          onClick={() =>
            run(() => send(base, "PATCH", { heading, body }), "Saved.")
          }
        >
          Save changes
        </AdminButton>
        <AdminButton
          type="button"
          variant="secondary"
          disabled={busy}
          onClick={() =>
            run(() => send(base, "PATCH", { isActive: !section.isActive }))
          }
        >
          {section.isActive ? "Hide from site" : "Show on site"}
        </AdminButton>
        <AdminButton
          type="button"
          variant="secondary"
          disabled={busy || isFirst}
          onClick={() =>
            run(() => send(`${base}/move`, "POST", { direction: "up" }))
          }
        >
          Move up
        </AdminButton>
        <AdminButton
          type="button"
          variant="secondary"
          disabled={busy || isLast}
          onClick={() =>
            run(() => send(`${base}/move`, "POST", { direction: "down" }))
          }
        >
          Move down
        </AdminButton>
        <AdminButton
          type="button"
          variant="danger"
          disabled={busy}
          onClick={() => {
            if (
              window.confirm(
                "Remove this point? It disappears from the page and can't be brought back. Use Hide from site if you might want it later.",
              )
            ) {
              void run(() => send(base, "DELETE"));
            }
          }}
        >
          Remove
        </AdminButton>
        {!section.isActive ? (
          <span className="text-xs text-onwei-blue/70">
            Hidden, visitors can&apos;t see this point.
          </span>
        ) : null}
      </div>
      {message ? <p className="text-xs text-onwei-black">{message}</p> : null}
    </div>
  );
}

function PageEditor({ page }: { page: LegalPageRow }) {
  const router = useRouter();
  const [title, setTitle] = useState(page.title);
  const [intro, setIntro] = useState(page.intro ?? "");
  const [newHeading, setNewHeading] = useState("");
  const [newBody, setNewBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const headChanged = title !== page.title || intro !== (page.intro ?? "");

  async function saveHead() {
    setBusy(true);
    setMessage(null);
    const error = await send(`/api/content/legal/pages/${page.id}`, "PATCH", {
      title,
      intro,
    });
    setBusy(false);
    setMessage(error ?? "Saved.");
    if (!error) router.refresh();
  }

  async function addPoint() {
    setBusy(true);
    setMessage(null);
    const error = await send(
      `/api/content/legal/pages/${page.id}/sections`,
      "POST",
      { heading: newHeading, body: newBody },
    );
    setBusy(false);
    if (error) {
      setMessage(error);
      return;
    }
    setNewHeading("");
    setNewBody("");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <AdminCard className="flex flex-col gap-3">
        <p className="text-sm text-onwei-blue/70">
          Shown on the site at{" "}
          <span className="font-mono">{PUBLIC_PATH[page.slug]}</span>. Changes
          go live within a minute.
        </p>
        <AdminInput
          aria-label="Page title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <AdminTextarea
          aria-label="Opening paragraph"
          placeholder="Opening paragraph (shown under the title, optional)"
          rows={3}
          value={intro}
          onChange={(e) => setIntro(e.target.value)}
        />
        <AdminButton
          type="button"
          className="w-fit"
          disabled={busy || !title.trim() || !headChanged}
          onClick={saveHead}
        >
          Save title and opening
        </AdminButton>
      </AdminCard>

      <p className="text-sm text-onwei-blue/70">
        Each point below is a heading with text. In the text, leave a blank line
        to start a new paragraph, and start a line with &quot;- &quot; to make a
        bullet point. Anything in [square brackets] is a placeholder to replace
        with your real details.
      </p>

      {page.sections.length === 0 ? (
        <p className="text-sm text-onwei-blue/70">
          No points yet. Add the first one below.
        </p>
      ) : (
        page.sections.map((section, index) => (
          <SectionEditor
            key={`${section.id}-${section.heading}-${section.body}`}
            section={section}
            isFirst={index === 0}
            isLast={index === page.sections.length - 1}
          />
        ))
      )}

      <div className="flex flex-col gap-3 sm:max-w-xl">
        <h3 className="text-sm font-semibold uppercase">Add a point</h3>
        <AdminInput
          placeholder="Heading"
          value={newHeading}
          onChange={(e) => setNewHeading(e.target.value)}
        />
        <AdminTextarea
          placeholder="Text"
          rows={5}
          value={newBody}
          onChange={(e) => setNewBody(e.target.value)}
        />
        <AdminButton
          type="button"
          className="w-fit"
          disabled={busy || !newHeading.trim() || !newBody.trim()}
          onClick={addPoint}
        >
          Add point to the end of the page
        </AdminButton>
      </div>
      {message ? <p className="text-xs text-onwei-black">{message}</p> : null}
    </div>
  );
}

// Backs apps/web's /privacy and /terms. Every point of both pages is a row
// here, so staff can reword, hide, reorder, add and remove any of them.
export function LegalPagesEditor({ pages }: { pages: LegalPageRow[] }) {
  const [activeSlug, setActiveSlug] = useState(pages[0]?.slug ?? "privacy");
  const active = pages.find((page) => page.slug === activeSlug);

  if (pages.length === 0) {
    return (
      <p className="text-sm text-onwei-blue/70">
        The legal pages aren&apos;t set up yet. Refresh this page to create
        them.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        {pages.map((page) => (
          <AdminButton
            key={page.id}
            type="button"
            variant={page.slug === activeSlug ? "primary" : "secondary"}
            onClick={() => setActiveSlug(page.slug)}
          >
            {page.slug === "privacy" ? "Privacy Policy" : "Terms"}
          </AdminButton>
        ))}
      </div>
      {active ? <PageEditor key={active.id} page={active} /> : null}
    </div>
  );
}
