import { Request, Response, NextFunction } from "express";
import { ZodError, ZodIssue } from "zod";

/** Mongo duplicate key সহ MongoServerError টাইপ গার্ড */
type MongoServerError = Error & {
  code?: number;
  keyValue?: Record<string, unknown>;
};

function isMongoServerError(e: unknown): e is MongoServerError {
  return (
    typeof e === "object" &&
    e !== null &&
    (e as { name?: string }).name === "MongoServerError"
  );
}

/** ZodError → লাইটওয়েট errors array (deprecated flatten এড়াতে) */
function zodIssues(
  err: ZodError
): Array<{ path: string; message: string; code: ZodIssue["code"] }> {
  return err.issues.map((i) => ({
    path: i.path.join("."),
    message: i.message,
    code: i.code,
  }));
}

export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
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
  const status = (err as { statusCode?: number }).statusCode ?? 500;
  const message =
    (err as { message?: string }).message ?? "Something went wrong";
  return res.status(status).json({
    ok: false,
    code: "INTERNAL_ERROR",
    message,
  });
}
