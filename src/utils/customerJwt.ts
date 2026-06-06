import jwt, { type Secret, type SignOptions, type JwtPayload as LibJwtPayload } from "jsonwebtoken";
import { env } from "../env.js";

export type CustomerJwtPayload = {
  sub: string;
  email: string;
  role: "CUSTOMER";
};

const JWT_SECRET: Secret = (env.JWT_SECRET || "dev_secret") as Secret;
const DEFAULT_EXPIRES_IN: SignOptions["expiresIn"] = (env.JWT_EXPIRES_IN ?? "7d") as SignOptions["expiresIn"];

export function signCustomerToken(payload: CustomerJwtPayload): string {
  const opts: SignOptions = { expiresIn: DEFAULT_EXPIRES_IN };
  return jwt.sign(payload, JWT_SECRET, opts);
}

export function verifyCustomerToken(token: string): CustomerJwtPayload {
  const decoded = jwt.verify(token, JWT_SECRET) as LibJwtPayload | string;
  if (typeof decoded === "string")
    throw Object.assign(new Error("UNAUTHORIZED"), { statusCode: 401 });

  const { sub, email, role } = decoded as Partial<CustomerJwtPayload>;
  if (!sub || !email || role !== "CUSTOMER")
    throw Object.assign(new Error("FORBIDDEN"), { statusCode: 403 });

  return { sub, email, role: "CUSTOMER" };
}