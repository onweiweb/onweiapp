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
  const task = async () => {
    try {
      await sendEmailSafely(to, await render());
    } catch (error) {
      console.error("[email] welcome render failed", error);
    }
  };
  try {
    after(task);
  } catch {
    void task();
  }
}
