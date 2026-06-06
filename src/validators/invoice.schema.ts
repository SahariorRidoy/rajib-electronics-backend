import { z } from "zod";

export const InvoiceItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  taxPercent: z.number().nonnegative().optional(),
});

export const CreateInvoiceSchema = z.object({
  accountId: z.string(),
  customerName: z.string().optional(),
  customerEmail: z.string().optional(),
  billingAddress: z.string().optional(),
  dueDate: z.string().optional(),
  currency: z.string().optional(),
  discountAmount: z.number().optional(),
  notes: z.string().optional(),
  items: z.array(InvoiceItemSchema).min(1),
});
