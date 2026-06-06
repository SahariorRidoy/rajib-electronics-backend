
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../env.js";

interface JwtPayloadCustom {
  sub?: string;
  userId?: string;
  email?: string;
  role?: string;
  accountId?: string;
  iat?: number;
  exp?: number;
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization || "";
    if (!header.startsWith("Bearer ")) {
      return res.status(401).json({ ok: false, code: "NO_TOKEN" });
    }

    const token = header.slice(7).trim();
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayloadCustom;

    const role = decoded.role || "";
    if (role !== "ADMIN" && role !== "SUPERADMIN") {
      return res.status(403).json({ ok: false, code: "FORBIDDEN" });
    }

    // attach user for downstream routes
    (req as any).user = {
      _id: decoded.sub ?? decoded.userId,
      email: decoded.email,
      role: role,
      accountId: decoded.accountId,
    };

    next();
  } catch (err) {
    return res.status(401).json({ ok: false, code: "INVALID_TOKEN" });
  }
}

export default requireAdmin;
