"use client";
import {useTransition} from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {Banknote, BookOpen, ChartColumn, CircleDollarSign, Clock3, Coins, CreditCard, LockKeyhole, LockKeyholeOpen, Plus, ReceiptText, RefreshCw, ShoppingBag, TrendingUp, Wallet} from "lucide-react";
import {dailySeries,displayDate,money,shiftDate,summarize} from "@/lib/analytics";
import type {Context,Ledger} from "@/lib/types";
const Trends=dynamic(()=>import("./trends"),{ssr:false,loading:()=> <div className="dash-card chart-skeleton" aria-label="Loading chart"/>});
export function Dashboard({ctx,data,day,greeting}:{ctx:Context;data:Ledger;day:string;greeting:string}){
 const router=useRouter(), [refreshing,start]=useTransition();
 const total=summarize(data,day,day),previous=shiftDate(day,-1),before=summarize(data,previous,previous);
 const locked=data.closings.some(c=>c.business_date===day&&c.status==="locked");
 const hasPrevious=data.sales.some(s=>s.business_date===previous);
 const entries=[...data.sales,...data.expenses,...data.ledger,...data.reconciliations].filter(e=>e.business_date===day);
 const updated=entries.map(e=>"updated_at" in e?String(e.updated_at):e.created_at).sort().at(-1);
 const canWrite=ctx.role!=="viewer";
 const dateQuery="?date="+day;
 const stats=[{title:"Recorded expenses",value:total.recorded,sub:`${total.expenseCount} expense ${total.expenseCount===1?"entry":"entries"}`,icon:ReceiptText,tone:"orange"},{title:"Operating surplus",value:total.surplus,sub:"Estimate after recorded expenses",icon:TrendingUp,tone:"mint"},{title:"Cash collection",value:total.cash,sub:"Collected in cash",icon:Banknote,tone:"mint"},{title:"UPI collection",value:total.upi,sub:"Digital collections",icon:CreditCard,tone:"purple"},{title:"Petty cash balance",value:(Math.round(total.opening*100)+Math.round(total.adjustments*100))/100,sub:"Opening float plus adjustments",icon:Coins,tone:"amber"}];
 const series=dailySeries(data,shiftDate(day,-29),day);
 return <div className="dashboard"><div className="dashboard-title"><div><div className="date-kicker">{displayDate(day,{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</div><h1>{greeting}, {ctx.user.full_name.split(" ")[0] || "team"}<em>.</em></h1><p>{ctx.business.name} financial overview</p></div><div className="dash-tools"><label><span className="sr-only">Business date</span><input type="date" value={day} onChange={e=>{if(e.target.value)router.push("/dashboard?date="+e.target.value)}}/></label><button className="icon-button" aria-label="Refresh dashboard" disabled={refreshing} onClick={()=>start(()=>router.refresh())}><RefreshCw size={17} className={refreshing?"spin":""}/></button></div></div>
 <div className="dash-section-label"><h2>Daily snapshot</h2><span className={locked?"day-state locked":"day-state"}>{locked?<LockKeyhole size={13}/>:<LockKeyholeOpen size={13}/>} {locked?"Entries locked":"Day open"}</span></div>
 <div className="stats-grid"><article className="metric primary-metric"><div className="metric-label"><span className="metric-icon"><ShoppingBag size={19}/></span><h3>Collected sales</h3></div><strong>{money(total.sales)}</strong><p>{hasPrevious?`${money(total.sales-before.sales)} vs previous day`:"Cash and UPI collections"}</p></article>{stats.map(({title,value,sub,icon:Icon,tone})=><article key={title} className="metric"><div className="metric-label"><span className={"metric-icon "+tone}><Icon size={19}/></span><h3>{title}</h3></div><strong>{money(value)}</strong><p>{sub}</p></article>)}</div>
 <div className="action-strip">{canWrite && !locked&&<><Link href={"/sales"+dateQuery} className="primary-action"><Plus size={17}/> Add sales</Link><Link href={"/expenses"+dateQuery}><Plus size={17}/> Add expense</Link></>}<Link href={"/data-sheet"+dateQuery}><BookOpen size={17}/> Data Sheet</Link>{ctx.role!=="staff"&&<Link href={"/reports"+dateQuery}><ChartColumn size={17}/> View reports</Link>}</div>
 <div className="dashboard-panels"><Trends series={series} hasActivity={!!(data.sales.length||data.expenses.length)}/><section className="dash-card"><div className="panel-head"><div><h2>Expense breakdown</h2><p>Recorded by category</p></div><span className="soft-icon"><Wallet size={18}/></span></div>{total.categories.length?<div className="breakdown">{total.categories.map(c=><div key={c.id}><div className="category-line"><span>{c.name}</span><b>{money(c.amount)} · {Math.round(c.percent)}%</b></div><div className="category-track"><span style={{width:c.percent+"%",background:c.color}}/></div></div>)}</div>:<div className="empty-chart"><CircleDollarSign/><strong>No expenses yet</strong><span>Add the first expense for this date.</span></div>}</section></div>
 <div className="last-update"><Clock3 size={14}/>{updated?"Last entry updated "+new Intl.DateTimeFormat("en-IN",{timeZone:ctx.business.timezone,dateStyle:"medium",timeStyle:"short"}).format(new Date(updated)):"No entries recorded for this business date."}</div></div>;
}
