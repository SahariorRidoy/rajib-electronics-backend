import { z } from "zod";
export const PaginationQuery = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(60).default(12)
});
export const ProductListQuery = PaginationQuery.extend({
    category: z.string().optional(),
    tag: z.string().optional(),
    q: z.string().optional(),
    discounted: z.enum(["true", "false"]).optional()
});
