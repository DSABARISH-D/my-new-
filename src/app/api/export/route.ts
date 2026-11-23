import { loadLedger,sessionContext } from "@/lib/data";
import { incident } from "@/lib/monitor";
import { buildReport,tableCSV } from "@/lib/report";
import { validateRange } from "@/lib/validation";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(request:Request){
  const fail=(status:number,error:string)=>Response.json({error},{status,headers:{"Cache-Control":"private, no-store"}});
  try {
    const {context}=await sessionContext();
    if(!context) return fail(401,"Sign in to download reports.");
    if(!["manager","owner"].includes(context.role)) return fail(403,"Manager or owner access is required.");
    const p=new URL(request.url).searchParams;
    const from=p.get("from")||"",to=p.get("to")||"",format=p.get("format"),kind=p.get("kind")||"all";
    if(format!=="pdf"&&format!=="csv") return fail(400,"Choose a CSV or PDF report.");
    if(kind!=="sales"&&kind!=="expenses"&&kind!=="all"&&kind!=="reconciliation") return fail(400,"Choose a report type.");
    try{validateRange(from,to);}catch{return fail(400,"Choose a valid report period of up to two years.");}
    const data=await loadLedger(from,to);
    const report=buildReport(data,{from,to,title:p.get("title")?.slice(0,90)||"Financial report",business:context.business.name,report:kind==="reconciliation"?"reconciliation":p.get("report")||undefined,group:p.get("group")||"day",filters:{kind:kind==="reconciliation"?"all":kind,q:p.get("q")||"",status:p.get("status")||"",category:p.get("category")||"",sort:p.get("sort")||""}});
    const headers={"Content-Type":format==="csv"?"text/csv; charset=utf-8":"application/pdf","Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff","Content-Disposition":'attachment; filename="sabarish-'+kind+'-'+from+'-'+to+'.'+format+'"'};
    if(format==="csv") return new Response(tableCSV(report.tables[0]),{headers});
    const {reportPDF}=await import("@/lib/pdf");
    return new Response(new Uint8Array(await reportPDF(report)).buffer,{headers});
  } catch {return fail(503,"The report could not be generated. Reference "+incident("report_export"));}
}
