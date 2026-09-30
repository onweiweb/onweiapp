import { parseJsonBody } from "@onwei/core";
import { NextResponse } from "next/server";
import type { z } from "zod";
import { requireStaffSession } from "./requireStaffSession";
import type { StaffContext } from "./requireStaffSession";

type RouteContext<P> = { params: Promise<P> };

/**
 * Wraps an admin API handler with the three things every route repeated by
 * hand: the session and permission check, reading the JSON body, and
 * validating it against a zod schema. A bad body gets a 400 with the first
 * problem's message, so write schema messages the way the admin UI should
 * show them (see .claude/skills/cms-plain-language).
 *
 * Domain errors (unique constraint, not found, illegal transition) stay in
 * the handler, because each route words them differently.
 */
export function defineAdminRoute<TSchema extends z.ZodType, TParams = object>(
  options: {
    /** Permission key required to call this route. Omit for any signed-in staff. */
    permission?: string;
    /** Schema for the JSON body. Omit for routes with no body (DELETE, etc). */
    body?: TSchema;
    /** Message when the body is missing or isn't valid JSON. */
    emptyBodyMessage?: string;
  },
  handler: (args: {
    request: Request;
    staff: StaffContext;
    body: z.output<TSchema>;
    params: TParams;
  }) => Promise<Response>,
) {
  return async function route(
    request: Request,
    routeContext?: RouteContext<TParams>,
  ): Promise<Response> {
    const session = await requireStaffSession(request, options.permission);
    if (!session.ok) return session.response;

    let body = undefined as z.output<TSchema>;
    if (options.body) {
      const parsed = await parseJsonBody(request, options.body);
      if (!parsed.ok) {
        return NextResponse.json(
          {
            ok: false,
            error:
              parsed.kind === "EMPTY"
                ? (options.emptyBodyMessage ?? parsed.message)
                : parsed.message,
          },
          { status: 400 },
        );
      }
      body = parsed.data;
    }

    const params = (routeContext ? await routeContext.params : {}) as TParams;
    return handler({ request, staff: session.context, body, params });
  };
}
