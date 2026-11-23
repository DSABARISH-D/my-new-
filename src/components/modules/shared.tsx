"use client";
import { useRef, useState, useEffect, useId, useCallback, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, CheckCircle2, CircleAlert, Download, FileText, Inbox, LoaderCircle, LockKeyhole, LockKeyholeOpen, X } from "lucide-react";
import { mutate } from "@/app/actions/business";
import { money } from "@/lib/analytics";
import { fullDays, type Context, type Query, range } from "./model";
import "@/styles/modules.css";

export function Heading({title,description,children}:{title:string;description?:string;children?:ReactNode}) {
  return <header className="mod-heading"><div><h1>{title}</h1>{description && <p>{description}</p>}</div><div className="mod-tools">{children}</div></header>;
}
export function Panel({title,children,aside,className=""}:{title:string;children:ReactNode;aside?:ReactNode;className?:string}) {
  return <section className={"mod-panel "+className}><div className="mod-panel-head"><h2>{title}</h2>{aside}</div>{children}</section>;
}
export function Empty({title,detail}:{title:string;detail?:string}) {
  return <div className="mod-empty"><span><Inbox size={22}/></span><strong>{title}</strong>{detail && <p>{detail}</p>}</div>;
}
export function Field({label,children,error}:{label:string;children:ReactNode;error?:string}) {
  return <label className="mod-field"><span>{label}</span>{children}{error && <small role="alert">{error}</small>}</label>;
}
export function Metric({label,value,tone,children}:{label:string;value:string;tone?:string;children?:ReactNode}) {
  return <div className={"mod-metric "+(tone??"")}><span>{label}</span><strong>{value}</strong>{children && <small>{children}</small>}</div>;
}
export function LockBadge({locked}:{locked:boolean}) {
  const Icon=locked?LockKeyhole:LockKeyholeOpen;
  return <span className={"mod-badge "+(locked?"amber":"green")}><Icon size={13}/>{locked?"Day locked":"Day open"}</span>;
}
type WriteKind = Parameters<typeof mutate>[0];
export type Feedback = { ok:boolean; message:string };
export function Status({value}:{value:Feedback|null}) {
  if (!value) return null;
  const Icon=value.ok?CheckCircle2:CircleAlert;
  return <div className={"mod-status "+(value.ok?"ok":"fail")} role={value.ok?"status":"alert"}><Icon size={17}/>{value.message}</div>;
}
export function useWrite() {
  const router=useRouter();
  const [pending,setPending]=useState(false);
  const [feedback,setFeedback]=useState<Feedback|null>(null);
  const busy=useRef(false), attempt=useRef({key:"",id:""});
  async function save(kind:WriteKind,payload:Record<string,unknown>,message:string) {
    if (busy.current) return false;
    busy.current=true; setPending(true); setFeedback(null);
    const key=JSON.stringify([kind,payload]);
    if (attempt.current.key!==key) attempt.current={key,id:crypto.randomUUID()};
    try {
      const result=await mutate(kind,payload,attempt.current.id);
      if (!result.ok) throw new Error(result.error ?? "The change could not be saved.");
      attempt.current={key:"",id:""};
      setFeedback({ok:true,message});
      router.refresh();
      return true;
    } catch(error) {
      setFeedback({ok:false,message:navigator.onLine?(error instanceof Error?error.message:"Unable to save. Try again."):"You are offline. Reconnect and save again."});
      return false;
    } finally {busy.current=false;setPending(false);}
  }
  return {save,pending,feedback,setFeedback};
}

// Keep dirty forms on screen when a navigation or date change would discard them.
export function useDirtyGuard(dirty:boolean) {
  useEffect(()=>{
    if(!dirty) return;
    const unload=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue="";};
    const link=(e:MouseEvent)=>{
      const anchor=e.target instanceof Element?e.target.closest("a[href]"):null;
      if(!anchor||e.defaultPrevented||e.metaKey||e.ctrlKey||anchor.getAttribute("target")==="_blank"||anchor.hasAttribute("download"))return;
      if(!window.confirm("Discard your unsaved changes?")){e.preventDefault();e.stopPropagation();}
    };
    window.addEventListener("beforeunload",unload);
    document.addEventListener("click",link,true);
    return ()=>{window.removeEventListener("beforeunload",unload);document.removeEventListener("click",link,true);};
  },[dirty]);
}
export function SaveButton({pending,label,disabled=false}:{pending:boolean;label:string;disabled?:boolean}) {
  return <button type="submit" className="mod-btn primary" disabled={pending||disabled}>{pending && <LoaderCircle size={15} className="mod-spin"/>}{pending?"Saving…":label}</button>;
}
export function DatePicker({date,extra={}}:{date:string;extra?:Record<string,string>}) {
  return <form method="get" className="mod-inline"><CalendarDays size={16}/><input aria-label="Business date" type="date" required defaultValue={date} name="date"/>{Object.entries(extra).map(([k,v])=><input key={k} type="hidden" name={k} value={v}/>)}<button className="mod-text" type="submit">Apply</button></form>;
}
export function RangeFilter({today,query,children}:{today:string;query:Query;children?:ReactNode}) {
  const [preset,setPreset]=useState(typeof query.preset==="string"?query.preset:"week");
  const current=range(preset,today,String(query.from??""),String(query.to??""));
  const [error,setError]=useState("");
  const validate=(e:FormEvent<HTMLFormElement>)=>{
    const fd=new FormData(e.currentTarget), from=String(fd.get("from")??""), to=String(fd.get("to")??"");
    if(preset==="custom"&&(from>to||fullDays(from,to)>365)){e.preventDefault();setError("Choose an ordered date range of up to 365 days.");}
  };
  return <form className="mod-filter" method="get" onSubmit={validate}><Field label="Date range"><select name="preset" value={preset} onChange={e=>setPreset(e.target.value)}>
    <option value="today">Today</option><option value="yesterday">Yesterday</option><option value="week">Last 7 days</option><option value="month">This month</option><option value="previous">Previous month</option><option value="custom">Custom date range</option></select></Field>
    {preset==="custom" && <><Field label="From"><input type="date" name="from" defaultValue={current.from} required/></Field><Field label="To"><input type="date" name="to" defaultValue={current.to} required/></Field></>}
    {children}<button className="mod-btn" type="submit">Apply filters</button>{error&&<p role="alert">{error}</p>}</form>;
}
export function ExportButtons({params}:{params:Record<string,string>}) {
  const [pending,setPending]=useState(""), [err,setErr]=useState("");
  async function download(format:string) {
    setPending(format);setErr("");
    try {
      const res=await fetch("/api/export?"+new URLSearchParams({...params,format}));
      if(!res.ok)throw new Error("Export failed. Check your access and try again.");
      const blob=await res.blob(),url=URL.createObjectURL(blob),a=document.createElement("a");
      a.href=url;a.download="sabarish-"+params.from+"-"+params.to+"."+format;a.click();
      setTimeout(()=>URL.revokeObjectURL(url),5000);
    } catch(e){setErr(e instanceof Error?e.message:"Could not download report.");} finally{setPending("");}
  }
  return <div className="mod-tools">{["csv","pdf"].map(format=><button key={format} type="button" className="mod-btn" onClick={()=>download(format)} disabled={!!pending}>{format==="csv"?<Download size={15}/>:<FileText size={15}/>} {pending===format?"Preparing…":format.toUpperCase()}</button>)}{err&&<span role="alert">{err}</span>}</div>;
}
export function Dialog({title,children,close}:{title:string;children:ReactNode;close:()=>void}){
  const ref=useRef<HTMLDialogElement>(null), id=useId(), stableClose=useCallback(()=>close(),[close]);
  useEffect(()=>{const node=ref.current;node?.showModal();return()=>node?.close();},[]);
  return <dialog ref={ref} className="mod-dialog" aria-labelledby={id} onCancel={e=>{e.preventDefault();stableClose();}}><div className="mod-panel-head"><h2 id={id}>{title}</h2><button type="button" aria-label="Close dialog" className="mod-icon" onClick={stableClose}><X size={18}/></button></div>{children}</dialog>;
}
export function Breakdown({categories}:{categories:{name:string;color:string;amount:number;percent:number}[]}) {
  if(!categories.length)return <Empty title="No expenses recorded"/>;
  return <div><div className="mod-stack" aria-hidden>{categories.map(c=><span key={c.name} style={{width:c.percent+"%",background:c.color}}/>)}</div>{categories.map(c=><div className="mod-breakdown" key={c.name}><span className="mod-dot" style={{background:c.color}}/>{c.name}<small>{c.percent.toFixed(1)}%</small><strong>{money(c.amount)}</strong></div>)}</div>;
}
export function Actor({ctx}:{ctx:Context}) {return <span className="mod-actor">{ctx.user.full_name || ctx.user.email}</span>;}

