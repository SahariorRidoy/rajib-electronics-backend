import { ZodError } from "zod";
function isMongoServerError(e) {
    return (typeof e === "object" &&
        e !== null &&
        e.name === "MongoServerError");
}
/** ZodError → লাইটওয়েট errors array (deprecated flatten এড়াতে) */
function zodIssues(err) {
    return err.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
        code: i.code,
    }));
}
export function errorMiddleware(err, _req, res, _next) {
    // 1) Validation errors (Zod)
    if (err instanceof ZodError) {
        return res.status(400).json({
            ok: false,
            code: "VALIDATION_ERROR",
            errors: zodIssues(err), // <-- flatten() নয়, তাই deprecated warning নেই
        });
    }
    // 2) Mongo duplicate key
    if (isMongoServerError(err) && err.code === 11000) {
        return res.status(409).json({
            ok: false,
            code: "DUPLICATE_KEY",
            details: err.keyValue ?? {}, // <-- keyValue safe access
        });
    }
    // 3) Generic/unknown
    const status = err.statusCode ?? 500;
    const message = err.message ?? "Something went wrong";
    return res.status(status).json({
        ok: false,
        code: "INTERNAL_ERROR",
        message,
    });
}
