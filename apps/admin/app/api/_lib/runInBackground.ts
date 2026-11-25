import { after } from "next/server";

/**
 * Runs a task after the response has gone out (Next's `after`), so sending
 * emails never delays or breaks the request. Errors are logged, not thrown.
 * Outside a request (route tests) it just runs the task.
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
