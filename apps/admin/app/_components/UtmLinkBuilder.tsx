"use client";

import { useActionState, useState } from "react";
import {
  buildLinkAction,
  type LinkBuilderState,
} from "../analytics/links/actions";
import { AdminButton, AdminCard, AdminInput, AdminSelect } from "./ui";

const INITIAL: LinkBuilderState = { status: "idle" };

export function UtmLinkBuilder({
  channels,
  pages,
}: {
  channels: readonly { id: string; label: string }[];
  pages: readonly { value: string; label: string }[];
}) {
  const [state, action, pending] = useActionState(buildLinkAction, INITIAL);
  const [copied, setCopied] = useState(false);

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <form action={action} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm">
          Where will you share it?
          <AdminSelect name="channel" required defaultValue="">
            <option value="" disabled>
              Pick one
            </option>
            {channels.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </AdminSelect>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          Which page should it open?
          <AdminSelect name="page" defaultValue={pages[0]?.value}>
            {pages.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </AdminSelect>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          Campaign name
          <AdminInput
            name="campaign"
            required
            placeholder="e.g. launch week"
            maxLength={64}
          />
          <span className="text-xs text-onwei-blue/70">
            A short name so you can tell this push apart from the next one.
          </span>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          Extra label (optional)
          <AdminInput
            name="content"
            placeholder="e.g. story 2"
            maxLength={64}
          />
          <span className="text-xs text-onwei-blue/70">
            Use this to compare two versions of the same post.
          </span>
        </label>
        <AdminButton type="submit" disabled={pending} className="w-fit">
          {pending ? "Making link..." : "Make link"}
        </AdminButton>
      </form>

      {state.status === "error" ? (
        <p role="alert" className="text-sm font-medium text-red-700">
          {state.message}
        </p>
      ) : null}

      {state.status === "done" ? (
        <AdminCard className="flex flex-col gap-3">
          <p className="text-sm text-onwei-blue/70">Your link</p>
          <p className="break-all font-mono text-sm">{state.url}</p>
          <AdminButton
            type="button"
            variant="secondary"
            className="w-fit"
            onClick={() => copy(state.url)}
          >
            {copied ? "Copied" : "Copy link"}
          </AdminButton>
        </AdminCard>
      ) : null}
    </div>
  );
}
