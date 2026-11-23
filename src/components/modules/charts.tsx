"use client";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend, ReferenceLine } from "recharts";
import { money } from "@/lib/analytics";
export type Point={ label:string; sales?:number; recorded?:number; cash?:number; upi?:number; surplus?:number };
type Series={key:"sales"|"recorded"|"cash"|"upi"|"surplus";name:string;color:string};
const shortINR=(n:number)=>new Intl.NumberFormat("en-IN",{notation:"compact",maximumFractionDigits:1}).format(n);
export function TrendChart({rows,series,line=false}:{rows:Point[];series:Series[];line?:boolean}) {
  const axis=<><CartesianGrid vertical={false} stroke="#ecebf0" strokeDasharray="3 3"/><XAxis dataKey="label" tick={{fill:"#625f69",fontSize:11}} axisLine={false} tickLine={false} minTickGap={20}/><YAxis tickFormatter={shortINR} tick={{fill:"#625f69",fontSize:11}} width={44} axisLine={false} tickLine={false}/><Tooltip formatter={value=>money(Number(value))} contentStyle={{borderRadius:10,borderColor:"#e9e9ee",fontSize:13}}/><Legend iconType="circle" wrapperStyle={{fontSize:12}}/><ReferenceLine y={0} stroke="#bdbbc4"/></>;
  return <div className="mod-chart" role="img" aria-label={series.map(s=>s.name).join(" and ")+" by period"}><ResponsiveContainer width="100%" height="100%">{line?<LineChart data={rows} margin={{top:12,right:16,left:0,bottom:4}}>{axis}{series.map(s=><Line key={s.key} dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={3} dot={rows.length<40} type="linear" isAnimationActive={false}/>)}</LineChart>:<BarChart data={rows} margin={{top:12,right:16,left:0,bottom:4}}>{axis}{series.map(s=><Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} radius={[4,4,0,0]} maxBarSize={38} isAnimationActive={false}/>)}</BarChart>}</ResponsiveContainer></div>;
}
export function CategoryChart({categories}:{categories:{name:string;amount:number;color:string}[]}) {
  return <div className="mod-donut" role="img" aria-label="Share of recorded expenses by category"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={categories} dataKey="amount" nameKey="name" innerRadius="55%" outerRadius="82%" paddingAngle={2} isAnimationActive={false}>{categories.map(c=><Cell key={c.name} fill={c.color}/>)}</Pie><Tooltip formatter={value=>money(Number(value))}/></PieChart></ResponsiveContainer></div>;
}

