// import { NextFunction, Request, Response } from "express";
// import { z } from "zod";
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
        }
        catch (err) {
            return res.status(400).json({ ok: false, code: "VALIDATION_ERROR", message: err.message });
        }
    };
}
