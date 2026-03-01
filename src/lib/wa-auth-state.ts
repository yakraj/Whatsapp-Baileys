/**
 * Database-backed Baileys authentication state.
 * Stores WhatsApp session credentials (creds + signal keys) in PostgreSQL
 * so sessions survive server reboots.
 */

import {
  AuthenticationState,
  AuthenticationCreds,
  SignalDataTypeMap,
  initAuthCreds,
  BufferJSON,
} from "@whiskeysockets/baileys";
import { prisma } from "@/lib/prisma";

type KeyStore = Record<string, Record<string, unknown>>;

function revive(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value), BufferJSON.reviver);
}

function replace(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value, BufferJSON.replacer));
}

export async function loadWaAuthState(
  connectionId: string,
): Promise<{ state: AuthenticationState; saveCreds: () => Promise<void> }> {
  const record = await prisma.waAuthState.findUnique({
    where: { connectionId },
  });

  const creds: AuthenticationCreds = record?.creds
    ? (revive(record.creds) as AuthenticationCreds)
    : initAuthCreds();

  const keys: KeyStore = record?.keys ? (revive(record.keys) as KeyStore) : {};

  const persistCreds = async (): Promise<void> => {
    const data = {
      creds: replace(creds) as object,
      keys: replace(keys) as object,
    };

    await prisma.waAuthState.upsert({
      where: { connectionId },
      create: { connectionId, ...data },
      update: data,
    });
  };

  const state: AuthenticationState = {
    creds,
    keys: {
      get: async <T extends keyof SignalDataTypeMap>(
        type: T,
        ids: string[],
      ): Promise<{ [id: string]: SignalDataTypeMap[T] }> => {
        const typeKeys = (keys[type as string] ?? {}) as Record<
          string,
          SignalDataTypeMap[T]
        >;
        const result: { [id: string]: SignalDataTypeMap[T] } = {};
        for (const id of ids) {
          if (typeKeys[id] !== undefined) {
            result[id] = typeKeys[id];
          }
        }
        return result;
      },

      set: async (
        data: Partial<{
          [T in keyof SignalDataTypeMap]: Record<
            string,
            SignalDataTypeMap[T] | null
          >;
        }>,
      ): Promise<void> => {
        for (const typeStr of Object.keys(data)) {
          const entries = data[typeStr as keyof SignalDataTypeMap];
          if (!entries) continue;

          const typeKeys = (keys[typeStr] ?? {}) as Record<string, unknown>;
          for (const [id, val] of Object.entries(entries)) {
            if (val === null) {
              delete typeKeys[id];
            } else {
              typeKeys[id] = val;
            }
          }
          keys[typeStr] = typeKeys;
        }
        await persistCreds();
      },
    },
  };

  return { state, saveCreds: persistCreds };
}

export async function deleteWaAuthState(connectionId: string): Promise<void> {
  await prisma.waAuthState.deleteMany({ where: { connectionId } });
}
