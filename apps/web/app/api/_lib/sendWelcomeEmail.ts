import { sendEmailSafely, type RenderedEmail } from "@onwei/emails";
import { after } from "next/server";

/**
 * Sends a welcome email after the response has gone out, so a slow or
 * failing provider never delays or breaks the signup. Rendering errors are
 * swallowed too. Outside a request (unit tests) it just runs the task.
 */
export function sendWelcomeEmailInBackground(
  to: string,
  render: () => RenderedEmail | Promise<RenderedEmail>,
): void {
  runInBackground(async () => {
    try {
      await sendEmailSafely(to, await render());
    } catch (error) {
      console.error("[email] welcome render failed", error);
    }
  });
}

/**
 * Runs a task after the response has gone out (Next's `after`), so it never
 * delays or breaks the request. Errors are logged, not thrown. Outside a
 * request (unit tests) it just runs the task.
 */
export function runInBackground(task: () => Promise<unknown>): void {
  const safe = async () => {
    try {
      await task();
    } catch (error) {
      console.error("[background] task failed", error);
    }
  };
  try {
    after(safe);
  } catch {
    void safe();
  }
}
