import type { Ledger } from "./types";

export type TransactionKind = "sales" | "expenses";
export type Transaction = {
  id:string; date:string; kind:TransactionKind; category:string; categoryId:string;
  amount:number; method:string; status:string; recordedBy:string; notes:string; vendor:string;
};
export type TransactionFilters = {kind:TransactionKind|"all";category?:string;status?:string;q?:string;sort?:string};
export function filterTransactions(data:Ledger,filters:TransactionFilters):Transaction[] {
  const people=new Map(data.people.map(p=>[p.id,p.full_name]));
  const categories=new Map(data.categories.map(c=>[c.id,c.name]));
  const query=(filters.q??"").trim().toLocaleLowerCase("en-IN");
  const rows:Transaction[]=[];
  if(filters.kind!=="expenses") {
    for(const sale of data.sales) {
      for(const method of ["cash","upi"] as const) {
        const amount=method==="cash"?sale.cash_collected:sale.upi_collected;
        if(amount<=0) continue;
        rows.push({id:sale.id,date:sale.business_date,kind:"sales",category:method==="cash"?"Cash":"UPI",categoryId:method,amount,method,status:"collected",recordedBy:people.get(sale.recorded_by)??"Former staff",notes:sale.notes??"",vendor:""});
      }
    }
  }
  if(filters.kind!=="sales") {
    for(const expense of data.expenses) {
      if(expense.voided_at) continue;
      rows.push({id:expense.id,date:expense.business_date,kind:"expenses",category:categories.get(expense.category_id)??"Archived category",categoryId:expense.category_id,amount:expense.amount,method:expense.payment_method,status:expense.payment_status,recordedBy:people.get(expense.recorded_by)??"Former staff",notes:expense.notes??"",vendor:expense.vendor_name??""});
    }
  }
  const ascending=filters.sort?.endsWith("-asc");
  return rows.filter(row=>
    (!filters.category || filters.category==="all" || row.categoryId===filters.category) &&
    (!filters.status || filters.status==="all" || row.status===filters.status) &&
    (!query || [row.date,row.category,row.method.replaceAll("_"," "),row.status,row.recordedBy,row.vendor,row.notes,row.amount.toString()].some(v=>v.toLocaleLowerCase("en-IN").includes(query)))
  ).sort((a,b)=>{
    const compared=filters.sort?.startsWith("amount-")?a.amount-b.amount:a.date.localeCompare(b.date);
    return (ascending?compared:-compared) || a.id.localeCompare(b.id) || a.method.localeCompare(b.method);
  });
}
