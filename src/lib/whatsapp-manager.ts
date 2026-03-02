/**
 * WhatsApp session manager — singleton that owns all active Baileys sockets.
 *
 * • startSession(connectionId) — creates a new socket, waits for the first
 *   QR string and returns it as a data-URL (or null when the stored session
 *   auto-reconnects without a QR).
 * • sendMessage(connectionId, to, text) — sends a text message.
 * • stopSession(connectionId) — logs out and removes auth state.
 * • restoreAllSessions() — called on server boot to reconnect every
 *   "connected" row that has stored credentials in WaAuthState.
 *
 * The global variable trick keeps the singleton alive across Next.js
 * hot-reloads in development.
 */

import makeWASocket, {
  fetchLatestBaileysVersion,
  WASocket,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { loadWaAuthState, deleteWaAuthState } from "@/lib/wa-auth-state";

const QR_TIMEOUT_MS = 60_000; // 60 s to scan the QR

class WhatsAppManager {
  private sockets = new Map<string, WASocket>();
  /** Only contains connectionIds where Baileys has fired connection === 'open' AND NOT yet fired connection === 'close'. */
  private openSockets = new Set<string>();
  /** Per-connection reconnect attempt counter for exponential backoff. */
  private reconnectAttempts = new Map<string, number>();

  // ------------------------------------------------------------------ //
  //  Session lifecycle
  // ------------------------------------------------------------------ //

  /**
   * Start (or restart) a Baileys socket for `connectionId`.
   *
   * @returns base-64 PNG data-URL of the WhatsApp QR when a new login is
   *          needed, or `null` when the stored session reconnects silently.
   *          Returns `undefined` if the session failed to start (e.g. immediate logout).
   */
  async startSession(
    connectionId: string,
    clearCredentials = false,
  ): Promise<string | null | undefined> {
    // Close any existing socket first
    const existing = this.sockets.get(connectionId);
    if (existing) {
      try {
        // Cast to bypass Baileys' typed removeAllListeners (needs event arg)
        (
          existing.ev as unknown as { removeAllListeners: () => void }
        ).removeAllListeners();
        existing.ws.close();
      } catch {
        // ignore
      }
      this.openSockets.delete(connectionId);
      this.sockets.delete(connectionId);
    }

    if (clearCredentials) {
      await deleteWaAuthState(connectionId);
    }

    const { version } = await fetchLatestBaileysVersion();
    const { state, saveCreds } = await loadWaAuthState(connectionId);

    let qrSettled = false;
    let resolveQr!: (value: string | null | undefined) => void;
    const qrPromise = new Promise<string | null | undefined>((resolve) => {
      resolveQr = resolve;
    });

    const socket = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      // Suppress verbose Baileys logging
      logger: {
        level: "silent",
        trace: () => undefined,
        debug: () => undefined,
        info: () => undefined,
        warn: () => undefined,
        error: () => undefined,
        fatal: () => undefined,
        child: () => ({
          level: "silent",
          trace: () => undefined,
          debug: () => undefined,
          info: () => undefined,
          warn: () => undefined,
          error: () => undefined,
          fatal: () => undefined,
          child: () => undefined as unknown,
        }),
      } as Parameters<typeof makeWASocket>[0]["logger"],
    });

    this.sockets.set(connectionId, socket);

    // Persist updated credentials whenever Baileys rotates them
    socket.ev.on("creds.update", saveCreds);

    socket.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr && !qrSettled) {
        qrSettled = true;
        try {
          const dataUrl = await QRCode.toDataURL(qr, { margin: 1, width: 320 });
          resolveQr(dataUrl);
        } catch {
          resolveQr(null);
        }
      }

      if (connection === "open") {
        if (!qrSettled) {
          qrSettled = true;
          resolveQr(null); // reconnected silently — no QR needed
        }
        // Reset back-off counter on successful connection
        this.reconnectAttempts.delete(connectionId);
        // Mark this socket as truly ready for sending
        this.openSockets.add(connectionId);
        // Extract phone number from the connected account's JID (e.g. "1234567890:5@s.whatsapp.net" → "+1234567890")
        const rawId = socket.user?.id ?? "";
        const digits = rawId.split("@")[0]?.split(":")[0] ?? "";
        const connectedMobile = digits ? `+${digits}` : null;
        await prisma.gatewayConnection.update({
          where: { id: connectionId },
          data: {
            status: "connected",
            lastActiveAt: new Date(),
            connectedMobile,
          },
        });
        // console.log(
        //   `[WA PID:${process.pid}] ✅ ${connectionId} connected (${connectedMobile ?? "unknown"})`,
        // );
      }

      if (connection === "close") {
        // Immediately mark as not open — socket.user is NOT cleared by Baileys on close
        // so we cannot rely on it as a liveness check
        this.openSockets.delete(connectionId);

        const statusCode = (lastDisconnect?.error as Boom | undefined)?.output
          ?.statusCode;

        // ── IMPORTANT: We intentionally do NOT treat DisconnectReason.loggedOut
        // specially here.  Baileys can fire loggedOut (401) for many transient
        // reasons (server inactivity, credential rotation race, WA server
        // hiccup) even though the phone still shows the linked device as active.
        // The ONLY way a session should truly end is via the human-triggered
        // stopSession() → logoutConnection() flow in the dashboard.
        //
        // So regardless of the status code we always reconnect. ──────────────

        // Clean up the dead socket reference
        this.sockets.delete(connectionId);

        if (!qrSettled) {
          qrSettled = true;
          resolveQr(null); // release the caller; reconnect will happen below
        }

        // Back-off before reconnecting to avoid hammering WA servers.
        // Exponential back-off capped at 60 s.
        const attempt = (this.reconnectAttempts.get(connectionId) ?? 0) + 1;
        this.reconnectAttempts.set(connectionId, attempt);
        const delayMs = Math.min(2_000 * Math.pow(1.5, attempt - 1), 60_000);

        console.log(
          `[WA] ${connectionId} disconnected (code ${statusCode ?? "unknown"}). ` +
            `Reconnect attempt #${attempt} in ${Math.round(delayMs / 1000)}s…`,
        );

        setTimeout(() => {
          // Only skip reconnect if a human has explicitly logged out (stale).
          prisma.gatewayConnection
            .findUnique({
              where: { id: connectionId },
              select: { status: true },
            })
            .then((row) => {
              if (!row || row.status === "stale") {
                console.log(
                  `[WA] ${connectionId} is stale (human logout) — skipping auto-reconnect.`,
                );
                return;
              }
              this.startSession(connectionId).catch(console.error);
            })
            .catch(() => {
              // DB unavailable — still try to reconnect
              this.startSession(connectionId).catch(console.error);
            });
        }, delayMs);
      }
    });

    // Safety timeout: resolve if neither QR nor open fires in time
    setTimeout(() => {
      if (!qrSettled) {
        qrSettled = true;
        // In this case, assuming failure
        resolveQr(undefined);
      }
    }, QR_TIMEOUT_MS);

    return qrPromise;
  }

  getSocket(connectionId: string): WASocket | undefined {
    return this.sockets.get(connectionId);
  }

  isSocketOpen(connectionId: string): boolean {
    return this.openSockets.has(connectionId);
  }

  // ------------------------------------------------------------------ //
  //  Message sending
  // ------------------------------------------------------------------ //

  async sendTextMessage(
    connectionId: string,
    mobileNumber: string,
    text: string,
    options?: {
      attachment?: {
        name: string;
        url: string;
        type?: string;
        caption?: string;
      };
    },
  ): Promise<void> {
    // openSockets is our authoritative liveness tracker:
    // set on connection === 'open', cleared on connection === 'close'.
    // socket.user CANNOT be used — Baileys never clears it on disconnect.
    if (!this.openSockets.has(connectionId)) {
      throw new Error(
        `No open WhatsApp socket for connection ${connectionId}. ` +
          `Socket exists: ${this.sockets.has(connectionId)}, Open: false. ` +
          `The session may still be reconnecting.`,
      );
    }

    const socket = this.sockets.get(connectionId)!;

    // Strip leading + and any non-numeric characters
    let digits = mobileNumber.replace(/^\+/, "").replace(/\D/g, "");

    // If the number is exactly 10 digits, assume it's an Indian number
    if (digits.length === 10) {
      digits = "91" + digits;
    }

    if (!digits) {
      throw new Error(`Invalid mobile number: ${mobileNumber}`);
    }
    const jid = digits + "@s.whatsapp.net";

    // Verify if the number actually has a WhatsApp account
    try {
      const results = await socket.onWhatsApp(jid);
      if (!results || results.length === 0 || !results[0]?.exists) {
        throw new Error(`The number +${digits} is not registered on WhatsApp.`);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes("not registered")) {
        throw err;
      }
      // If the onWhatsApp check itself fails for network reasons, we'll log it
      // but still try to send the message just in case the check was flaky.
      console.warn(`[WA] onWhatsApp check failed for ${jid}:`, err);
    }

    // console.log(`[WA] Sending to ${jid} via connection ${connectionId}`);

    if (options?.attachment) {
      const { url, type, name, caption } = options.attachment;

      if (url) {
        const isDataUrl = url.startsWith("data:");
        let buffer: Buffer | undefined;

        if (isDataUrl) {
          // Extract base64 content
          const base64Data = url.split(",")[1];
          if (base64Data) {
            buffer = Buffer.from(base64Data, "base64");
          }
        }

        const mediaContent = buffer ? buffer : { url };

        // Send media
        if (type?.startsWith("image/")) {
          await socket.sendMessage(jid, {
            image: mediaContent,
            caption: caption || text,
          });
        } else if (type?.startsWith("video/")) {
          await socket.sendMessage(jid, {
            video: mediaContent,
            caption: caption || text,
          });
        } else if (type?.startsWith("audio/")) {
          await socket.sendMessage(jid, {
            audio: mediaContent,
            mimetype: type,
            ptt: false,
          });
        } else {
          // Default to document for everything else (pdf, zip, etc)
          await socket.sendMessage(jid, {
            document: mediaContent,
            mimetype: type || "application/octet-stream",
            fileName: name,
            caption: caption || text,
          });
        }
      } else {
        // Fallback if no URL provided but we have text
        await socket.sendMessage(jid, { text });
      }
    } else {
      // Plain text
      await socket.sendMessage(jid, { text });
    }

    // console.log(
    //   `[WA] Message delivered to ${jid} via connection ${connectionId}`,
    // );
  }

  // ------------------------------------------------------------------ //
  //  Logout / stop
  // ------------------------------------------------------------------ //

  /**
   * Human-triggered logout. This is the ONLY path that should end a session.
   * It actively logs out from WhatsApp (so the phone's linked-devices list
   * updates) and wipes stored credentials so the connection cannot auto-restore.
   */
  async stopSession(connectionId: string): Promise<void> {
    this.openSockets.delete(connectionId);
    this.reconnectAttempts.delete(connectionId);
    const socket = this.sockets.get(connectionId);
    this.sockets.delete(connectionId);

    if (socket) {
      try {
        (
          socket.ev as unknown as { removeAllListeners: () => void }
        ).removeAllListeners();

        // Actively notify WhatsApp to unlink this device
        await socket.logout();
      } catch {
        // Best-effort; if WA is unreachable the session is already dead
        try {
          socket.end(undefined);
        } catch {
          // ignore
        }
      }
    }

    // Delete stored credentials so restoreAllSessions won't revive this
    await deleteWaAuthState(connectionId);
  }

  // ------------------------------------------------------------------ //
  //  Boot restore
  // ------------------------------------------------------------------ //

  /**
   * On server start, restore Baileys sockets for every connection that has
   * stored WA credentials in WaAuthState.  Reconnects silently — no QR.
   */
  async restoreAllSessions(): Promise<void> {
    const pending = await prisma.waAuthState.findMany({
      include: { connection: true },
    });

    for (const row of pending) {
      // Never restore a stale (manually logged-out) session automatically.
      if (row.connection.status === "stale") {
        console.log(
          `[WA] Skipping stale connection ${row.connectionId} — requires manual re-activation.`,
        );
        continue;
      }
      this.startSession(row.connectionId).catch((err) => {
        console.error(`[WA] Failed to restore ${row.connectionId}:`, err);
      });
    }
  }
}

// Keep a single instance alive across Next.js hot-reloads
const globalForWA = global as unknown as { __waManager?: WhatsAppManager };
export const waManager: WhatsAppManager =
  globalForWA.__waManager ?? (globalForWA.__waManager = new WhatsAppManager());
