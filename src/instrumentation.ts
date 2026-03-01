/**
 * Next.js instrumentation hook.
 *
 * Called once when the server process starts.  We use it to restore all
 * WhatsApp Baileys sessions that have stored credentials in the database,
 * so active connections come back online automatically after a reboot.
 *
 * See: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only run in the Node.js runtime (not Edge)
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  try {
    // Lazy-import to avoid bundling issues
    const { waManager } = await import("@/lib/whatsapp-manager");
    await waManager.restoreAllSessions();
  } catch (error) {
    console.error(
      "[instrumentation] Failed to restore WhatsApp sessions:",
      error,
    );
  }
}
