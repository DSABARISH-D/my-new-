"use client";
import { useState, type FormEvent } from "react";
import { Pencil, UserPlus, UsersRound, ShieldCheck } from "lucide-react";
import { titleCase,type Context,type Staff } from "./model";
import { Dialog,Empty,Field,Heading,Panel,SaveButton,Status,useWrite,useDirtyGuard } from "./shared";
type Member=Staff["members"][number];
export function StaffPage({ctx,staff}:{ctx:Context;staff:Staff}){
  const [dialog,setDialog]=useState<"invite"|Member|null>(null),[dirty,setDirty]=useState(false),[search,setSearch]=useState("");
  const [memberPage,setMemberPage]=useState(1),[auditPage,setAuditPage]=useState(1);
  const update=useWrite();
  useDirtyGuard(dirty);
  const close=()=>{if(!update.pending&&(!dirty||window.confirm("Discard these staff changes?"))){setDialog(null);setDirty(false);}};
  const show=(value:"invite"|Member)=>{setDialog(value);setDirty(false);update.setFeedback(null);};
  const filtered=staff.members.filter(m=>(m.full_name+" "+m.email+" "+m.role).toLowerCase().includes(search.toLowerCase()));
  const maxPage=Math.max(1,Math.ceil(filtered.length/15)),page=Math.min(maxPage,memberPage);
  const auditMax=Math.max(1,Math.ceil(staff.audit.length/15)),auditCurrent=Math.min(auditMax,auditPage);
  const names=new Map(staff.members.map(m=>[m.user_id,m.full_name||m.email]));
  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();if(!dialog)return;
    const fields=Object.fromEntries(new FormData(e.currentTarget));
    let ok:boolean;
    if(dialog==="invite")ok=await update.save("invite",fields,"Staff access granted. New staff receive an invitation by email.");
    else {
      const active=fields.active==="active";
      if(dialog.active&&!active&&!window.confirm("Deactivate access for "+(dialog.full_name||dialog.email)+"?"))return;
      ok=await update.save("member",{user_id:dialog.user_id,role:fields.role,active},"Staff access updated.");
    }
    if(ok){setDialog(null);setDirty(false);}
  }
  return <main className="mod"><Heading title="Staff management" description="Manage team access and review recent activity."><button className="mod-btn primary" onClick={()=>show("invite")}><UserPlus size={16}/> Invite staff</button></Heading>
    <Status value={dialog?null:update.feedback}/><Panel title="Team members" aside={<UsersRound size={19}/>}><div className="mod-filter"><Field label="Find staff"><input type="search" placeholder="Name, email or role" value={search} onChange={e=>{setSearch(e.target.value);setMemberPage(1);}}/></Field></div>
    {!filtered.length?<Empty title="No matching team members"/>:<div className="mod-scroll"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Access</th></tr></thead><tbody>{filtered.slice((page-1)*15,page*15).map(m=><tr key={m.user_id}><td><strong>{m.full_name||m.email}</strong>{m.user_id===ctx.user.id?" (you)":""}</td><td>{m.email}</td><td>{titleCase(m.role)}</td><td><span className={"mod-badge "+(m.active?"green":"neutral")}>{m.active?"Active":"Inactive"}</span></td><td>{m.role==="owner"?<span className="mod-meta"><ShieldCheck size={15}/> Owner</span>:<button className="mod-icon" aria-label={"Edit access for "+(m.full_name||m.email)} onClick={()=>show(m)}><Pencil size={15}/></button>}</td></tr>)}</tbody></table></div>}
    {maxPage>1&&<div className="mod-pager"><button className="mod-btn" disabled={page===1} onClick={()=>setMemberPage(page-1)}>Previous</button><span>Page {page} of {maxPage}</span><button className="mod-btn" disabled={page===maxPage} onClick={()=>setMemberPage(page+1)}>Next</button></div>}</Panel>
    <Panel title="Recent audit history">{!staff.audit.length?<Empty title="No activity recorded"/>:<div className="mod-scroll"><table><thead><tr><th>Time</th><th>Staff member</th><th>Action</th><th>Record</th><th>Reason</th></tr></thead><tbody>{staff.audit.slice((auditCurrent-1)*15,auditCurrent*15).map(a=><tr key={a.id}><td>{new Intl.DateTimeFormat("en-IN",{dateStyle:"medium",timeStyle:"short",timeZone:ctx.business.timezone}).format(new Date(a.created_at))}</td><td>{names.get(a.actor_id)||"System"}</td><td>{titleCase(a.action)}</td><td>{titleCase(a.entity_type)}</td><td>{a.reason||"—"}</td></tr>)}</tbody></table></div>}
    {auditMax>1&&<div className="mod-pager"><button className="mod-btn" disabled={auditCurrent===1} onClick={()=>setAuditPage(auditCurrent-1)}>Previous</button><span>Page {auditCurrent} of {auditMax}</span><button className="mod-btn" disabled={auditCurrent===auditMax} onClick={()=>setAuditPage(auditCurrent+1)}>Next</button></div>}</Panel>
    {dialog&&<Dialog title={dialog==="invite"?"Invite staff":"Edit staff access"} close={close}><form className="mod-fields" onSubmit={submit} onChange={()=>setDirty(true)}><fieldset disabled={update.pending} className="mod-fields">{dialog==="invite"?<><Field label="Full name"><input autoComplete="name" name="full_name" maxLength={100} required/></Field><Field label="Email"><input type="email" autoComplete="email" name="email" maxLength={254} required/></Field></>:<p className="mod-desc">{dialog.full_name} · {dialog.email}</p>}
      <Field label="Role"><select name="role" defaultValue={dialog==="invite"?"staff":dialog.role}><option value="staff">Staff</option><option value="manager">Manager</option><option value="viewer">Viewer</option></select></Field>{dialog!=="invite"&&<Field label="Account status"><select name="active" defaultValue={dialog.active?"active":"inactive"}><option value="active">Active</option><option value="inactive">Inactive</option></select></Field>}
      <Status value={update.feedback?.ok?null:update.feedback}/><SaveButton pending={update.pending} label={dialog==="invite"?"Send invitation":"Save access"}/></fieldset></form></Dialog>}
  </main>;
}

