import { z } from "zod";

export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date.").refine(value => {
  const date = new Date(value + "T00:00:00.000Z");
  return Number.isFinite(+date) && date.toISOString().slice(0, 10) === value && value >= "1900-01-01";
}, "Choose a valid date.");

const money = z.union([z.string(), z.number()]).transform(String).pipe(
  z.string().regex(/^\d{1,10}(\.\d{1,2})?$/, "Enter a non-negative INR amount with up to two decimal places.")
);
const id = z.string().uuid("Invalid record identifier.");
const notes = z.string().trim().max(2000).nullish();
const short = z.string().trim().max(180).nullish();
const reason = z.string().trim().max(500).optional();
const requiredReason = z.string().trim().min(3, "Give a correction reason (at least three characters).").max(500);
const version = z.number().int().nonnegative().optional();
const staffRole = z.enum(["manager", "staff", "viewer"]);
export const schemas = {
  sales: z.object({ business_date: dateSchema, cash_collected: money, upi_collected: money, opening_float: money, actual_amount: money.nullish(), notes, version, reason }),
  expense: z.object({ id: id.optional(), business_date: dateSchema, category_id: id, amount: money, payment_method: z.enum(["cash","upi","bank_transfer","other"]), payment_status: z.enum(["paid","due","pending"]), vendor_name: short, notes, quantity: z.union([z.string(), z.number()]).transform(String).pipe(z.string().regex(/^\d{1,9}(\.\d{1,3})?$/,"Enter a valid quantity.")).nullish(), unit: short, receipt_path: z.string().max(300).nullish(), version, reason }),
  void_expense: z.object({ id, business_date: dateSchema, version: z.number().int().positive(), reason: requiredReason }),
  adjustment: z.object({ business_date: dateSchema, transaction_type: z.enum(["cash_in","cash_out"]), amount: money.refine(v => Number(v)>0, "Enter an amount greater than zero."), notes: z.string().trim().min(3,"Describe the cash adjustment.").max(2000) }),
  lock: z.object({ business_date: dateSchema }),
  reopen: z.object({ business_date: dateSchema, reason: requiredReason }),
  business: z.object({ name: z.string().trim().min(1).max(100), phone: short, address: z.string().trim().max(500).nullish(), gstin: z.string().trim().toUpperCase().regex(/^$|^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/, "Check the GSTIN.").nullish() }),
  category: z.object({ id: id.optional(), name: z.string().trim().min(1).max(80), color: z.string().regex(/^#[0-9a-f]{6}$/i), active: z.boolean() }),
  member: z.object({ user_id: id, role: staffRole, active: z.boolean() }),
  invite: z.object({ email: z.string().trim().email().max(254).toLowerCase(), full_name: z.string().trim().min(1).max(100), role: staffRole }),
  preferences: z.object({ reminders_enabled: z.boolean(), notifications_enabled: z.boolean() }),
};
export type ActionKind = keyof typeof schemas;
export const requestIdSchema = id;
export function validateRange(from: string, to: string) {
  if (!dateSchema.safeParse(from).success || !dateSchema.safeParse(to).success || from > to || Date.parse(to)-Date.parse(from) > 731*86400000) {
    throw new Error("Choose a valid date range of up to two years.");
  }
}
