import jwt, {
  type Secret,
  type SignOptions,
  type JwtPayload as LibJwtPayload,
} from "jsonwebtoken";
import { env } from "../env.js";


export type AdminJwtPayload = {
  sub: string;
  email: string;
  role: "ADMIN" | "SUPER_ADMIN";
};

const JWT_SECRET: Secret = (env.JWT_SECRET || "dev_secret") as Secret;
const REFRESH_SECRET: Secret = env.REFRESH_SECRET as Secret;
const DEFAULT_EXPIRES_IN: SignOptions["expiresIn"] = (env.JWT_EXPIRES_IN ?? "1d") as SignOptions["expiresIn"];
const REFRESH_EXPIRES_IN: SignOptions["expiresIn"] = "7d";

export function signAccessToken(payload: AdminJwtPayload): string {
  const opts: SignOptions = { expiresIn: DEFAULT_EXPIRES_IN };
  return jwt.sign(payload, JWT_SECRET, opts);
}

export function verifyAccessToken(token: string): AdminJwtPayload {
  const decoded = jwt.verify(token, JWT_SECRET) as LibJwtPayload | string;
  if (typeof decoded === "string")
    throw Object.assign(new Error("UNAUTHORIZED"), { statusCode: 401 });

  const { sub, email, role } = decoded as Partial<AdminJwtPayload>;
  if (!sub || !email || !["ADMIN", "SUPER_ADMIN"].includes(role || ""))
    throw Object.assign(new Error("FORBIDDEN"), { statusCode: 403 });

  return { sub, email, role: role as "ADMIN" | "SUPER_ADMIN" };
}

export function signRefreshToken(payload: AdminJwtPayload): string {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES_IN });
}

export function verifyRefreshToken(token: string): AdminJwtPayload {
  const decoded = jwt.verify(token, REFRESH_SECRET) as LibJwtPayload | string;
  if (typeof decoded === "string")
    throw Object.assign(new Error("UNAUTHORIZED"), { statusCode: 401 });

  const { sub, email, role } = decoded as Partial<AdminJwtPayload>;
  if (!sub || !email || !["ADMIN", "SUPER_ADMIN"].includes(role || ""))
    throw Object.assign(new Error("FORBIDDEN"), { statusCode: 403 });

  return { sub, email, role: role as "ADMIN" | "SUPER_ADMIN" };
}
