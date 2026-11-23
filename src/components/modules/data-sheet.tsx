import Link from "next/link";
import { money } from "@/lib/analytics";
import { filterTransactions } from "@/lib/transactions";
import { type Context,type Ledger,type Query,param,titleCase,methodTitle,canManage,canWrite,displayDate } from "./model";
import { Heading,Panel,Field,RangeFilter,Metric,Empty,ExportButtons } from "./shared";
import { RecordDetails } from "./record-details";

export function DataSheet({ctx,data,today,dates,query}:{ctx:Context;data:Ledger;today:string;dates:{from:string;to:string};query:Query}) {
  const kind=param(query,"kind")==="expenses"?"expenses":"sales";
  const filters={category:param(query,"category"),status:param(query,"status"),q:param(query,"q"),sort:param(query,"sort")||"date-desc",kind} as const;
  const rows=filterTransactions(data,filters);
  const pageSize=15,pages=Math.max(1,Math.ceil(rows.length/pageSize)), page=Math.min(pages,Math.max(1,parseInt(param(query,"page"),10)||1));
  const buildUrl=(changes:Record<string,string>)=>{const p=new URLSearchParams();for(const [k,v] of Object.entries(query))if(typeof v==="string"&&v)p.set(k,v);for(const [k,v] of Object.entries(changes))if(v)p.set(k,v);else p.delete(k);return "/data-sheet?"+p;};
  const total=(onlyPaid=false)=>rows.filter(row=>!onlyPaid||row.status==="paid").reduce((sum,r)=>sum+Math.round(r.amount*100),0)/100;
  return <main className="mod"><Heading title="Data Sheet" description="Review, search and export recorded transactions.">{canManage(ctx)&&<ExportButtons params={{...dates,...filters,title:kind==="sales"?"Collected sales":"Expense transactions"}}/>}</Heading>
    <Panel title="Transaction history" aside={<nav className="mod-tabs" aria-label="Transaction type">{(["sales","expenses"] as const).map(t=><Link key={t} className={kind===t?"on":""} href={buildUrl({kind:t,status:"",category:"",page:""})}>{titleCase(t)}</Link>)}</nav>}>
      <RangeFilter today={today} query={query}><input type="hidden" name="kind" value={kind}/><Field label="Search"><input type="search" name="q" maxLength={100} placeholder="Find a transaction" defaultValue={filters.q}/></Field>
      <Field label={kind==="sales"?"Payment channel":"Category"}><select name="category" defaultValue={filters.category}><option value="">All</option>{kind==="sales"?<><option value="cash">Cash</option><option value="upi">UPI</option></>:data.categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></Field><Field label="Status"><select name="status" defaultValue={filters.status}><option value="">All statuses</option>{(kind==="sales"?["collected"]:["paid","pending","due"]).map(s=><option key={s} value={s}>{titleCase(s)}</option>)}</select></Field><Field label="Sort by"><select name="sort" defaultValue={filters.sort}><option value="date-desc">Newest first</option><option value="date-asc">Oldest first</option><option value="amount-desc">Highest amount</option><option value="amount-asc">Lowest amount</option></select></Field></RangeFilter>
      <div className="mod-meta">{displayDate(dates.from)} – {displayDate(dates.to)}<span>·</span>{rows.length} transactions</div>
      {!rows.length?<Empty title="No matching transactions" detail="Try a different date range or filter."/>:<div className="mod-scroll"><table><thead><tr><th>Date</th><th>{kind==="sales"?"Channel":"Category"}</th><th>Amount</th>{kind==="expenses"&&<th>Method</th>}<th>Status</th><th>Recorded by</th><th>Actions</th></tr></thead><tbody>{rows.slice((page-1)*pageSize,page*pageSize).map(row=>{
        const expense=kind==="expenses"?data.expenses.find(e=>e.id===row.id):undefined;
        const locked=data.closings.some(c=>c.business_date===row.date&&c.status==="locked");
        const edit=canWrite(ctx)&&!locked?(kind==="sales"?"/sales?date="+row.date:"/expenses?"+new URLSearchParams({date:row.date,edit:row.id})):undefined;
        const details:[string,string][]=[["Business date",displayDate(row.date)],["Amount",money(row.amount)],["Status",titleCase(row.status)],["Payment method",methodTitle(row.method)],["Recorded by",row.recordedBy],["Day status",locked?"Locked":"Open"],["Notes",row.notes||"—"]];
        if(expense){details.push(["Vendor",row.vendor||"—"],["Quantity",expense.quantity!=null?[String(expense.quantity),expense.unit].filter(Boolean).join(" "):"—"]);}
        return <tr key={row.id+row.categoryId}><td>{displayDate(row.date)}</td><td>{row.category}</td><td className="mod-currency">{money(row.amount)}</td>{kind==="expenses"&&<td>{methodTitle(row.method)}</td>}<td><span className={"mod-badge "+(["collected","paid"].includes(row.status)?"green":"amber")}>{titleCase(row.status)}</span></td><td>{row.recordedBy}</td><td><RecordDetails title={row.category} details={details} edit={edit} receipt={expense?.receipt_path?"/api/receipts/"+expense.id:undefined}/></td></tr>;
      })}</tbody></table></div>}
      <div className="mod-pager"><small>{rows.length?"Showing "+((page-1)*pageSize+1)+"–"+Math.min(page*pageSize,rows.length)+" of "+rows.length:"0 transactions"}</small><div className="mod-tools">{page>1&&<Link className="mod-btn" href={buildUrl({page:String(page-1)})}>Previous</Link>}{pages>1&&<span>Page {page} of {pages}</span>}{page<pages&&<Link className="mod-btn" href={buildUrl({page:String(page+1)})}>Next</Link>}</div></div>
      <div className="mod-metrics"><Metric tone="accent" label={kind==="sales"?"Total collected sales":"Total recorded expenses"} value={money(total())}/>{kind==="expenses"&&<Metric label="Total paid expenses" value={money(total(true))}/>}<Metric label="Transactions" value={String(rows.length)}/></div>
    </Panel></main>;
}

