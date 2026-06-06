import jwt from "jsonwebtoken";
import { env } from "../env.js";
const JWT_SECRET = (env.JWT_SECRET || "dev_secret");
const DEFAULT_EXPIRES_IN = (env.JWT_EXPIRES_IN ?? "7d");
export function signCustomerToken(payload) {
    const opts = { expiresIn: DEFAULT_EXPIRES_IN };
    return jwt.sign(payload, JWT_SECRET, opts);
}
export function verifyCustomerToken(token) {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (typeof decoded === "string")
        throw Object.assign(new Error("UNAUTHORIZED"), { statusCode: 401 });
    const { sub, email, role } = decoded;
    if (!sub || !email || role !== "CUSTOMER")
        throw Object.assign(new Error("FORBIDDEN"), { statusCode: 403 });
    return { sub, email, role: "CUSTOMER" };
}
