import jwt from "jsonwebtoken";
import { env } from "../env.js";
export function requireAdmin(req, res, next) {
    try {
        const header = req.headers.authorization || "";
        if (!header.startsWith("Bearer ")) {
            return res.status(401).json({ ok: false, code: "NO_TOKEN" });
        }
        const token = header.slice(7).trim();
        const decoded = jwt.verify(token, env.JWT_SECRET);
        const role = decoded.role || "";
        if (role !== "ADMIN" && role !== "SUPERADMIN") {
            return res.status(403).json({ ok: false, code: "FORBIDDEN" });
        }
        // attach user for downstream routes
        req.user = {
            _id: decoded.sub ?? decoded.userId,
            email: decoded.email,
            role: role,
            accountId: decoded.accountId,
        };
        next();
    }
    catch (err) {
        return res.status(401).json({ ok: false, code: "INVALID_TOKEN" });
    }
}
export default requireAdmin;
