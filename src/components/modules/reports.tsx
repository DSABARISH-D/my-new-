import Link from "next/link";
import { dailySeries, money,shiftDate,summarize } from "@/lib/analytics";
import { type Context,type Ledger,type Query,param,canManage,displayDate } from "./model";
import { Breakdown,Empty,ExportButtons,Field,Heading,Metric,Panel,RangeFilter } from "./shared";
import { ReportChart } from "./report-charts";
const reports={
  "daily-sales":["Daily sales","sales","day"],"weekly-sales":["Weekly sales","sales","week"],"monthly-sales":["Monthly sales","sales","month"],
  "daily-expenses":["Daily expenses","expenses","day"],"monthly-expenses":["Monthly expenses","expenses","month"],
  "categories":["Expenses by category","categories","day"],"channels":["Cash vs UPI","channels","day"],"reconciliation":["Cash reconciliation","reconciliation","day"],"surplus":["Operating surplus","surplus","month"],
} as const;
function bucket(date:string,group:string) {
  if(group==="month")return date.slice(0,7)+"-01";
  if(group==="week")return shiftDate(date,-((new Date(date+"T12:00:00Z").getUTCDay()+6)%7));
  return date;
}
function label(date:string,group:string){
  if(group==="month")return new Intl.DateTimeFormat("en-IN",{month:"short",year:"numeric",timeZone:"UTC"}).format(new Date(date+"T12:00:00Z"));
  return displayDate(date);
}
export function Reports({ctx,data,today,dates,query}:{ctx:Context;data:Ledger;today:string;dates:{from:string;to:string};query:Query}){
  const selected=param(query,"report"),reportKey=Object.hasOwn(reports,selected)?selected as keyof typeof reports:"daily-sales";
  const [name,kind,group]=reports[reportKey], summary=summarize(data,dates.from,dates.to), series=dailySeries(data,dates.from,dates.to);
  const groups=new Map<string,{cash:number;upi:number;sales:number;recorded:number;paid:number;surplus:number}>();
  for(const d of series){const key=bucket(d.date,group);const row=groups.get(key)??{cash:0,upi:0,sales:0,recorded:0,paid:0,surplus:0};for(const field of ["cash","upi","sales","recorded","paid","surplus"] as const)row[field]+=Math.round(d[field]*100);groups.set(key,row);}
  const items=Array.from(groups,([date,values])=>({label:label(date,group),cash:values.cash/100,upi:values.upi/100,sales:values.sales/100,recorded:values.recorded/100,paid:values.paid/100,surplus:values.surplus/100}));
  const expense=kind==="expenses"||kind==="categories",recon=kind==="reconciliation",surplus=kind==="surplus",sales=kind==="sales"||kind==="channels";
  const kindFilter=expense?"expenses":sales?"sales":recon?"reconciliation":"all";
  const datesWithCash=new Set([...data.sales,...data.ledger,...data.reconciliations,...data.expenses.filter(e=>!e.voided_at&&e.payment_method==="cash"&&e.payment_status==="paid")].map(e=>e.business_date));
  const reconRows=recon?Array.from(datesWithCash).sort().map(date=>({date,...summarize(data,date,date)})):[];
  const hasData=sales?data.sales.length>0:expense?summary.expenseCount>0:recon?reconRows.length>0:data.sales.length>0||summary.expenseCount>0;
  let headers:string[], rows:string[][];
  if(recon){headers=["Date","Opening float","Cash collected","Cash-paid expenses","Adjustments","Expected","Actual","Variance"];rows=reconRows.map(r=>[displayDate(r.date),money(r.opening),money(r.cash),money(r.cashPaid),money(r.adjustments),money(r.expected),r.actual==null?"Awaiting count":money(r.actual),r.variance==null?"—":money(r.variance)]);}
  else if(kind==="categories"){headers=["Category","Recorded expenses","Share"];rows=summary.categories.map(c=>[c.name,money(c.amount),c.percent.toFixed(1)+"%"]);}
  else if(expense){headers=[group==="month"?"Month":"Date","Recorded expenses","Paid expenses"];rows=items.map(r=>[r.label,money(r.recorded),money(r.paid)]);}
  else if(surplus){headers=["Month","Sales","Recorded expenses","Estimated operating surplus"];rows=items.map(r=>[r.label,money(r.sales),money(r.recorded),money(r.surplus)]);}
  else{headers=[group==="week"?"Week starting":group==="month"?"Month":"Date","Cash","UPI","Collected sales"];rows=items.map(r=>[r.label,money(r.cash),money(r.upi),money(r.sales)]);}
  const pageSize=31,pages=Math.max(1,Math.ceil(rows.length/pageSize)), page=Math.max(1,Math.min(parseInt(param(query,"page"),10)||1,pages));
  const url=(n:number)=>{const p=new URLSearchParams();for(const [k,v] of Object.entries(query))if(typeof v==="string")p.set(k,v);p.set("page",String(n));return "/reports?"+p;};
  return <main className="mod"><Heading title="Reports" description="Explore sales, spending and cash reconciliation.">{canManage(ctx)&&<ExportButtons params={{...dates,kind:kindFilter,report:kind,title:name+" report"}}/>}</Heading>
    <Panel title="Report options"><RangeFilter today={today} query={query}><Field label="Report type"><select name="report" defaultValue={reportKey}>{Object.entries(reports).map(([k,[n]])=><option value={k} key={k}>{n}</option>)}</select></Field></RangeFilter></Panel>
    <Panel title={name+" report"}><p className="mod-meta">{displayDate(dates.from)} – {displayDate(dates.to)}</p><div className="mod-metrics">
    {expense?<><Metric tone="accent" label="Recorded expenses" value={money(summary.recorded)}/><Metric label="Paid" value={money(summary.paid)}/><Metric label="Pending" value={money(summary.pending)}/><Metric label="Due" value={money(summary.due)}/></>:recon?<><Metric label="Cash collected" value={money(summary.cash)}/><Metric label="Cash-paid expenses" value={money(summary.cashPaid)}/><Metric label="Days with closing counts" value={String(reconRows.filter(r=>r.actual!=null).length)}/></>:surplus?<><Metric label="Collected sales" value={money(summary.sales)}/><Metric label="Recorded expenses" value={money(summary.recorded)}/><Metric tone="accent" label="Estimated operating surplus" value={money(summary.surplus)}/></>:<><Metric tone="accent" label="Collected sales" value={money(summary.sales)}/><Metric label="Cash" value={money(summary.cash)}/><Metric label="UPI" value={money(summary.upi)}/></>}</div>
    {!hasData?<Empty title="No records in this period" detail="Change the date range to review another period."/>:!recon&&<><ReportChart kind={kind} rows={items} categories={summary.categories}/>{kind==="categories"&&<Breakdown categories={summary.categories}/>}</>}
    </Panel>{surplus&&hasData&&<Panel title="Sales vs expenses"><ReportChart kind="comparison" rows={items} categories={[]}/></Panel>}
    {hasData&&<Panel title={recon?"Cash counts by day":"Report detail"}><div className="mod-scroll"><table><thead><tr>{headers.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{rows.slice((page-1)*pageSize,page*pageSize).map(r=><tr key={r[0]}>{r.map((v,i)=><td key={headers[i]} className={i?"mod-currency":""}>{v}</td>)}</tr>)}</tbody></table></div>{pages>1&&<div className="mod-pager">{page>1&&<Link className="mod-btn" href={url(page-1)}>Previous</Link>}<span>Page {page} of {pages}</span>{page<pages&&<Link className="mod-btn" href={url(page+1)}>Next</Link>}</div>}</Panel>}
  </main>;
}

