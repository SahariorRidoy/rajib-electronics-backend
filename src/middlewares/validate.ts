// import { NextFunction, Request, Response } from "express";
// import { z } from "zod";



// export const validateQuery =
//   <T extends z.ZodTypeAny>(schema: T) =>
//   (req: Request, res: Response, next: NextFunction) => {
//     const parsed = schema.parse(req.query);
//     res.locals.query = parsed as z.infer<T>;
//     next();
//   };

// export const validateBody =
//   <T extends z.ZodTypeAny>(schema: T) =>
//   (req: Request, res: Response, next: NextFunction) => {
//     const parsed = schema.parse(req.body);
//     res.locals.body = parsed as z.infer<T>;
//     next();
//   };

import { z } from "zod";

/**
 * validateQuery(schema) -> middleware that parses req.query and sets res.locals.query
 * Usage: router.get("/products", validateQuery(ProductListQuery), handler)
 */
export function validateQuery(schema) {
  return (req, res, next) => {
    try {
      const raw = req.query || {};
      const parsed = schema.parse(raw);
      res.locals.query = parsed;
      return next();
    } catch (err) {
      return res.status(400).json({ ok: false, code: "VALIDATION_ERROR", message: err.message });
    }
  };
}
