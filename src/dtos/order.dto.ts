import z from "zod";


export const OrderCreatedDTO = z.object({
  customer: z.object({
    name: z.string().min(2),
    
    phone: z.string().min(6),
    houseOrVillage: z.string().min(2),
    roadOrPostOffice: z.string().min(2),
    blockOrThana: z.string().min(2),
    district: z.string().min(2),
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