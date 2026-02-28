import jwt from "jsonwebtoken";

const TOKEN_LIFETIME = "30d";
const DEFAULT_SECRET = "replace-this-in-production";

export interface ConnectionTokenClaims {
  connectionId: string;
  customerId: string;
  customerName: string;
  tokenType: "gateway_connection";
}

function getJwtSecret(): string {
  return process.env.GATEWAY_JWT_SECRET || DEFAULT_SECRET;
}

export function signConnectionToken(claims: ConnectionTokenClaims): {
  token: string;
  expiresAt: string;
} {
  const token = jwt.sign(claims, getJwtSecret(), {
    algorithm: "HS256",
    expiresIn: TOKEN_LIFETIME,
    issuer: "baileys-gateway",
    subject: claims.customerId,
  });

  const decoded = jwt.decode(token);
  const exp =
    typeof decoded === "object" && decoded && typeof decoded.exp === "number"
      ? decoded.exp
      : Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

  return {
    token,
    expiresAt: new Date(exp * 1000).toISOString(),
  };
}

export function verifyConnectionToken(token: string): ConnectionTokenClaims | null {
  try {
    const verified = jwt.verify(token, getJwtSecret(), {
      issuer: "baileys-gateway",
      algorithms: ["HS256"],
    });

    if (typeof verified !== "object" || !verified) {
      return null;
    }

    const { connectionId, customerId, customerName, tokenType } = verified as Partial<ConnectionTokenClaims>;

    if (
      typeof connectionId !== "string" ||
      typeof customerId !== "string" ||
      typeof customerName !== "string" ||
      tokenType !== "gateway_connection"
    ) {
      return null;
    }

    return { connectionId, customerId, customerName, tokenType };
  } catch {
    return null;
  }
}
