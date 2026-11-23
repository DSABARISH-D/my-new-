"use client";
import dynamic from "next/dynamic";
import type { Point } from "./charts";
const TrendChart=dynamic(()=>import("./charts").then(m=>m.TrendChart),{ssr:false});
const CategoryChart=dynamic(()=>import("./charts").then(m=>m.CategoryChart),{ssr:false});
export function ReportChart({kind,rows,categories}:{kind:string;rows:Point[];categories:{name:string;amount:number;color:string}[]}) {
  switch(kind){
    case "categories":return <CategoryChart categories={categories}/>;
    case "channels":return <TrendChart rows={rows} series={[{key:"cash",name:"Cash",color:"#39805c"},{key:"upi",name:"UPI",color:"#7368c5"}]}/>;
    case "expenses":return <TrendChart rows={rows} series={[{key:"recorded",name:"Recorded expenses",color:"#ef402b"}]}/>;
    case "surplus":return <TrendChart line rows={rows} series={[{key:"surplus",name:"Estimated operating surplus",color:"#227657"}]}/>;
    case "comparison":return <TrendChart rows={rows} series={[{key:"sales",name:"Collected sales",color:"#39805c"},{key:"recorded",name:"Recorded expenses",color:"#ef402b"}]}/>;
    default:return <TrendChart line rows={rows} series={[{key:"sales",name:"Collected sales",color:"#ef402b"}]}/>;
  }
}

