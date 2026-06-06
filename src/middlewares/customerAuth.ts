import { Request, Response, NextFunction } from "express";
import { verifyCustomerToken } from "../utils/customerJwt.js";

export function requireCustomer(req: Request, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization || "";
    if (!header.startsWith("Bearer ")) {
      return res.status(401).json({ ok: false, code: "NO_TOKEN" });
    }

    const token = header.slice(7).trim();
    const decoded = verifyCustomerToken(token);

    (req as any).customer = {
      _id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (err) {
    return res.status(401).json({ ok: false, code: "INVALID_TOKEN" });
  }
}