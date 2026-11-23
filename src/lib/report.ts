import { paise, shiftDate, summarize } from "./analytics";
import { filterTransactions, type TransactionFilters } from "./transactions";
import type { Ledger } from "./types";

export type Cell = string | number;
export type ReportTable = { title:string; headers:string[]; rows:Cell[][] };
export type Report = { title:string; business:string; from:string; to:string; generated:string; summary:[string,string][]; tables:ReportTable[] };
export type ReportOptions = { title:string; business:string; from:string; to:string; filters:TransactionFilters; report?:string; group?:string };
const displayINR = (value:number)=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR"}).format(value);
const periodKey=(date:string,group?:string)=>group==="month"?date.slice(0,7):group==="week"?shiftDate(date,-((new Date(date+"T12:00:00Z").getUTCDay()+6)%7)):date;
export function buildReport(data:Ledger, options:ReportOptions, now=new Date()):Report {
  const {from,to,filters}=options;
  const rows=filterTransactions(data,filters).filter(r=>r.date>=from && r.date<=to);
  const totals={sales:0,expenses:0,paid:0};
  const periods=new Map<string,{sales:number;cash:number;upi:number;expenses:number;paid:number}>();
  const categories=new Map<string,number>();
  for(const row of rows) {
    const cents=paise(row.amount);
    totals[row.kind]+=cents;
    const key=periodKey(row.date,options.group);
    const period=periods.get(key)??{sales:0,cash:0,upi:0,expenses:0,paid:0};
    period[row.kind]+=cents;
    if(row.kind==="sales") {
      if(row.method==="cash") period.cash+=cents;
      else period.upi+=cents;
    } else {
      categories.set(row.category,(categories.get(row.category)??0)+cents);
      if(row.status==="paid") {totals.paid+=cents;period.paid+=cents;}
    }
    periods.set(key,period);
  }
  const summary:Report["summary"]=[];
  if(filters.kind!=="expenses") summary.push(["Collected sales",displayINR(totals.sales/100)]);
  if(filters.kind!=="sales") summary.push(["Recorded expenses",displayINR(totals.expenses/100)],["Paid expenses",displayINR(totals.paid/100)]);
  if(filters.kind==="all") summary.push(["Estimated operating surplus",displayINR((totals.sales-totals.expenses)/100)]);
  const tables:ReportTable[]=[];
  const dates=Array.from(periods.keys()).sort();
  if(options.report==="reconciliation") {
    const cashDates=new Set([...data.sales,...data.ledger,...data.reconciliations,...data.expenses.filter(e=>!e.voided_at && e.payment_status==="paid" && e.payment_method==="cash")].map(r=>r.business_date));
    const detail=Array.from(cashDates).sort().filter(d=>d>=from&&d<=to).map(date=>{
      const day=summarize(data,date,date);
      return [date,day.opening,day.cash,day.cashPaid,day.adjustments,day.expected,day.actual??"",day.variance??""];
    });
    tables.push({title:"Cash reconciliation (INR)",headers:["Date","Opening","Cash sales","Cash paid","Adjustments","Expected","Actual","Variance"],rows:detail});
    const total=summarize(data,from,to);
    summary.splice(0,summary.length,["Cash sales",displayINR(total.cash)],["Cash-paid expenses",displayINR(total.cashPaid)],["Days counted",String(detail.filter(row=>row[6]!=="").length)]);
  } else if(options.report==="categories") {
    tables.push({title:"Category breakdown",headers:["Category","Recorded INR","Share %"],rows:Array.from(categories,([category,cents])=>[category,cents/100,(totals.expenses?100*cents/totals.expenses:0).toFixed(2)]).sort((a,b)=>Number(b[1])-Number(a[1]))});
  } else if(options.report) {
    const expense=options.report==="expenses", surplus=options.report==="surplus";
    tables.push({title:"Period totals (INR)",headers:expense?["Period","Recorded","Paid"]:surplus?["Period","Sales","Expenses","Estimated surplus"]:["Period","Cash","UPI","Collected"],rows:dates.map(date=>{
      const period=periods.get(date)!;
      return expense?[date,period.expenses/100,period.paid/100]:surplus?[date,period.sales/100,period.expenses/100,(period.sales-period.expenses)/100]:[date,period.cash/100,period.upi/100,period.sales/100];
    })});
  }
  tables.push({title:"Transaction detail",headers:["Date","Type","Category / channel","Amount INR","Method","Status","Recorded by","Vendor"],rows:rows.map(r=>[r.date,r.kind,r.category,r.amount,r.method.replaceAll("_"," "),r.status,r.recordedBy,r.vendor])});
  return {business:options.business,title:options.title,from,to,generated:now.toISOString(),summary,tables};
}

export function tableCSV(table:ReportTable) {
  function cell(value:Cell) {
    if(typeof value==="number") return value.toFixed(2);
    let text=value.replaceAll("\u0000","");
    // Spreadsheet software can execute formula prefixes even in quoted CSV cells.
    if(/^\s*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text)) text="'"+text;
    return '"'+text.replaceAll('"','""')+'"';
  }
  return "\uFEFF"+[table.headers,...table.rows].map(row=>row.map(cell).join(",")).join("\r\n")+"\r\n";
}
