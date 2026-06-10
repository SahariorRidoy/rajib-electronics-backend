import z from "zod";


export const OrderCreatedDTO = z.object({
  customer: z.object({
    name: z.string().min(2),
    phone: z.string().min(6),
    address: z.string().min(5),
  }),
  lines: z
    .array(
      z.object({
        productId: z.string(),
        qty: z.number().int().positive(),
      })
    )
    .min(1),
});

export type TOrderCreate = z.infer<typeof OrderCreatedDTO>;