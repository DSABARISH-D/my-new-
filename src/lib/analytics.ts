import type { Ledger } from "./types";

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0, maximumFractionDigits: 2 });
export const money = (rupees: number) => inr.format(rupees);
export const paise = (rupees: number) => Math.round(rupees * 100);
export function todayISO(timezone = "Asia/Kolkata", now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {timeZone: timezone, year:"numeric", month:"2-digit", day:"2-digit"}).format(now);
}
export function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const stamp = new Date(value + "T12:00:00Z");
  return !Number.isNaN(+stamp) && stamp.toISOString().slice(0,10) === value;
}
export function shiftDate(date: string, days: number) {
  const d = new Date(date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate()+days);
  return d.toISOString().slice(0,10);
}
export function displayDate(iso: string, options: Intl.DateTimeFormatOptions = {day:"numeric", month:"short", year:"numeric"}) {
  return new Intl.DateTimeFormat("en-IN",{...options,timeZone:"UTC"}).format(new Date(iso+"T12:00:00Z"));
}
export function summarize(data: Ledger, from: string, to: string) {
  const included = (d: string) => d >= from && d <= to;
  let cash=0, upi=0, opening=0, adjustments=0, paid=0, due=0, pending=0, cashPaid=0, expenseCount=0;
  const byCategory = new Map<string,number>();
  for (const row of data.sales) {
    if (!included(row.business_date)) continue;
    cash += paise(row.cash_collected);
    upi += paise(row.upi_collected);
    opening += paise(row.opening_float);
  }
  for (const row of data.expenses) {
    if (row.voided_at || !included(row.business_date)) continue;
    const amount = paise(row.amount);
    expenseCount++;
    byCategory.set(row.category_id,(byCategory.get(row.category_id)??0)+amount);
    if (row.payment_status==="paid") {
      paid += amount;
      if(row.payment_method==="cash") cashPaid += amount;
    } else if(row.payment_status==="pending") pending += amount;
    else due += amount;
  }
  for (const row of data.ledger) if (included(row.business_date)) {
    adjustments += paise(row.amount) * (row.transaction_type==="cash_in" ? 1 : -1);
  }
  const recorded = paid + pending + due;
  const expected = opening + cash - cashPaid + adjustments;
  const counts = data.reconciliations.filter(row=>included(row.business_date));
  const activeDates = new Set([...data.sales,...data.ledger,...data.expenses.filter(row=>!row.voided_at),...counts].map(row=>row.business_date).filter(included));
  const actual = counts.length && counts.length === activeDates.size ? counts.reduce((sum,row)=>sum+paise(row.actual_amount),0) : null;
  const index = new Map(data.categories.map(c=>[c.id,c]));
  const categories = Array.from(byCategory,([id,amount])=>({id,name:index.get(id)?.name??"Archived category",color:index.get(id)?.color??"#767988",amount:amount/100,percent:recorded?amount*100/recorded:0})).sort((a,b)=>b.amount-a.amount || a.name.localeCompare(b.name));
  return {cash:cash/100,upi:upi/100,sales:(cash+upi)/100,opening:opening/100,adjustments:adjustments/100,recorded:recorded/100,paid:paid/100,pending:pending/100,due:due/100,cashPaid:cashPaid/100,surplus:(cash+upi-recorded)/100,expected:expected/100,actual:actual===null?null:actual/100,variance:actual===null?null:(actual-expected)/100,expenseCount,categories};
}
export function dailySeries(data: Ledger, from: string, to: string) {
  const buckets = new Map<string,{date:string;cash:number;upi:number;sales:number;recorded:number;paid:number;surplus:number}>();
  for(let date=from;date<=to;date=shiftDate(date,1)) buckets.set(date,{date,cash:0,upi:0,sales:0,recorded:0,paid:0,surplus:0});
  for(const sale of data.sales) {
    const point=buckets.get(sale.business_date);
    if(point) { point.cash+=paise(sale.cash_collected); point.upi+=paise(sale.upi_collected); }
  }
  for(const expense of data.expenses) {
    const point=buckets.get(expense.business_date);
    if(point && !expense.voided_at) { point.recorded+=paise(expense.amount); if(expense.payment_status==="paid") point.paid+=paise(expense.amount); }
  }
  return Array.from(buckets.values(),p=>({...p,cash:p.cash/100,upi:p.upi/100,sales:(p.cash+p.upi)/100,recorded:p.recorded/100,paid:p.paid/100,surplus:(p.cash+p.upi-p.recorded)/100}));
}
