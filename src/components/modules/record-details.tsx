"use client";
import { useState } from "react";
import Link from "next/link";
import { Eye, Pencil } from "lucide-react";
import { Dialog } from "./shared";
export function RecordDetails({title,details,edit,receipt}:{title:string;details:[string,string][];edit?:string;receipt?:string}) {
  const [open,setOpen]=useState(false);
  return <><button className="mod-icon" aria-label={"View details for "+title} onClick={()=>setOpen(true)}><Eye size={16}/></button>{open&&<Dialog title={title} close={()=>setOpen(false)}><dl className="mod-defs">{details.map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v||"—"}</dd></div>)}</dl><div className="mod-tools">{receipt&&<a className="mod-btn" href={receipt} target="_blank" rel="noreferrer">View receipt</a>}{edit&&<Link className="mod-btn primary" href={edit}><Pencil size={15}/> Edit entry</Link>}</div></Dialog>}</>;
}

