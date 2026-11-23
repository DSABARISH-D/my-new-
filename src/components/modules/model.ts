import { shiftDate, validDate } from "@/lib/analytics";
import type { loadLedger, requireContext, loadStaff } from "@/lib/data";

export type Ledger = Awaited<ReturnType<typeof loadLedger>>;
export type Context = Awaited<ReturnType<typeof requireContext>>;
export type Staff = Awaited<ReturnType<typeof loadStaff>>;
export type Expense = Ledger["expenses"][number];
export type Query = Record<string, string | string[] | undefined>;
export const param = (query: Query, key: string) => typeof query[key] === "string" ? query[key] as string : "";
export const methods = { cash: "Cash", upi: "UPI", bank_transfer: "Bank transfer", other: "Other" } as const;
export const titleCase = (str: string) => str.replaceAll("_", " ").replace(/^./, c => c.toUpperCase());
export const methodTitle = (str: string) => methods[str as keyof typeof methods] ?? titleCase(str);
export const displayDate = (date: string) => new Intl.DateTimeFormat("en-IN",{day:"numeric",month:"short",year:"numeric",timeZone:"UTC"}).format(new Date(date + "T12:00:00Z"));
export const canManage = (ctx: Context) => ["owner","manager"].includes(ctx.role);
export const canWrite = (ctx: Context) => ctx.role !== "viewer";
export const fullDays = (start: string, end: string) => Math.round((Date.parse(end)-Date.parse(start))/86400000)+1;
export function range(preset: string, today: string, from?: string, to?: string) {
  const first = today.slice(0,7)+"-01";
  switch (preset) {
    case "today": return {from:today,to:today};
    case "yesterday": return {from:shiftDate(today,-1),to:shiftDate(today,-1)};
    case "month": return {from:first,to:today};
    case "previous": {
      const last = shiftDate(first,-1);
      return {from:last.slice(0,7)+"-01",to:last};
    }
    case "custom":
      if (from && to && validDate(from) && validDate(to) && from <= to && fullDays(from,to)<=365) return {from,to};
      break;
  }
  return {from:shiftDate(today,-6), to:today};
}
export function salesRange(date:string, period:string) {
  if (period === "month") {
    const from = date.slice(0,7)+"-01";
    const year=Number(from.slice(0,4)), month=Number(from.slice(5,7));
    const to = new Date(Date.UTC(year,month,0)).toISOString().slice(0,10);
    const prevTo=shiftDate(from,-1);
    return {from,to,prevFrom:prevTo.slice(0,7)+"-01",prevTo};
  }
  const mondayOffset=(new Date(date+"T12:00:00Z").getUTCDay()+6)%7;
  const from=period==="week"?shiftDate(date,-mondayOffset):date;
  const to=period==="week"?shiftDate(from,6):date;
  const n=fullDays(from,to);
  return {from,to,prevFrom:shiftDate(from,-n),prevTo:shiftDate(from,-1)};
}

