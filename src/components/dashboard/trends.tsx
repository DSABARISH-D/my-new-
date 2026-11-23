"use client";
import {useState} from "react";
import {Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis} from "recharts";
import {BarChart3} from "lucide-react";
import {displayDate,money} from "@/lib/analytics";
type Point={date:string;sales:number;recorded:number};
export default function Trends({series,hasActivity}:{series:Point[];hasActivity:boolean}){
 const [period,setPeriod]=useState<"Day"|"Week"|"Month">("Week");
 const count=period==="Week"?7:period==="Month"?30:1;
 const points=series.slice(-count).map(p=>({...p,label:displayDate(p.date,{day:"numeric",month:"short"})}));
 return <section className="dash-card trend"><div className="panel-head"><div><h2>Sales vs expenses</h2><p>{period==="Day"?"Selected business day":`Last ${count} days`}</p></div><div className="segmented">{(["Day","Week","Month"] as const).map(p=><button key={p} aria-pressed={p===period} onClick={()=>setPeriod(p)}>{p}</button>)}</div></div>
 {hasActivity && points.some(p=>p.sales||p.recorded)?<div className="chart-box"><ResponsiveContainer width="100%" height="100%" minWidth={1}><AreaChart data={points} margin={{left:0,right:12,top:12,bottom:0}}><defs><linearGradient id="sales-gradient" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#ef402b" stopOpacity=".22"/><stop offset="1" stopColor="#ef402b" stopOpacity="0"/></linearGradient></defs><CartesianGrid strokeDasharray="3 4" vertical={false} stroke="#e9e9ee"/><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fontSize:12,fill:"#696971"}} minTickGap={15}/><YAxis axisLine={false} tickLine={false} tick={{fontSize:12,fill:"#696971"}} width={58} tickFormatter={n=>n>=1000?"₹"+(n/1000)+"k":"₹"+n}/><Tooltip formatter={value=>money(Number(value))}/><Area name="Sales" type="monotone" dataKey="sales" stroke="#e2402c" strokeWidth={3} fill="url(#sales-gradient)" dot={points.length===1}/><Area name="Expenses" type="monotone" dataKey="recorded" stroke="#524bad" strokeWidth={2.5} fill="transparent" dot={points.length===1}/></AreaChart></ResponsiveContainer></div>:<div className="empty-chart"><BarChart3/><strong>No activity in this period</strong><span>Saved sales and expenses will appear here.</span></div>}
 <div className="chart-key"><i/>Sales <i/>Expenses</div></section>
}
