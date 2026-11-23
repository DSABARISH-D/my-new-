"use client";
import { useState, type FormEvent } from "react";
import { Building2, Palette, BellRing, LogOut } from "lucide-react";
import { logout } from "@/app/actions/auth";
import type { Context, Category } from "@/lib/types";
import { Dialog, Field, Heading, Panel, SaveButton, Status, useDirtyGuard, useWrite } from "./shared";

export function Settings({ctx,categories}:{ctx:Context;categories:Category[];date:string}) {
  const business=useWrite(),category=useWrite(),preferences=useWrite();
  const [categoryDialog,setCategoryDialog]=useState<Category|"new"|null>(null);
  const [dirty,setDirty]=useState(false);
  useDirtyGuard(dirty);

  async function saveBusiness(e:FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data=Object.fromEntries(new FormData(e.currentTarget));
    if(await business.save("business",{name:data.name,phone:data.phone||null,address:data.address||null,gstin:data.gstin||null},"Business settings saved."))setDirty(false);
  }
  async function savePreferences(e:FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data=new FormData(e.currentTarget);
    await preferences.save("preferences",{reminders_enabled:data.has("reminders"),notifications_enabled:data.has("notifications")},"Preferences saved.");
  }
  async function saveCategory(e:FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data=new FormData(e.currentTarget);
    const active=categoryDialog&&categoryDialog!=="new"?data.has("active"):true;
    const payload={id:categoryDialog&&categoryDialog!=="new"?categoryDialog.id:undefined,name:data.get("name"),color:data.get("color"),active};
    if(await category.save("category",payload,"Expense category saved.")){setCategoryDialog(null);setDirty(false);}
  }
  const closeCategory=()=>{if(!category.pending&&(!dirty||window.confirm("Discard category changes?"))){setCategoryDialog(null);setDirty(false);}};

  return <main className="mod">
    <Heading title="Settings" description="Manage business details, categories and notifications."/>
    <div className="mod-settings-grid">
      <Panel title="Business profile" aside={<Building2 size={18}/>}>
        <form className="mod-fields" onSubmit={saveBusiness} onChange={()=>setDirty(true)}>
          <Field label="Business name"><input name="name" required maxLength={100} defaultValue={ctx.business.name}/></Field>
          <div className="mod-grid2">
            <Field label="Phone"><input name="phone" type="tel" maxLength={180} defaultValue={ctx.business.phone||""}/></Field>
            <Field label="GSTIN"><input name="gstin" maxLength={15} defaultValue={ctx.business.gstin||""} style={{textTransform:"uppercase"}}/></Field>
          </div>
          <Field label="Address"><textarea name="address" maxLength={500} defaultValue={ctx.business.address||""}/></Field>
          <Status value={business.feedback}/><SaveButton pending={business.pending} label="Save business settings"/>
        </form>
      </Panel>
      <Panel title="Notifications" aside={<BellRing size={18}/>}>
        <form className="mod-fields" onSubmit={savePreferences}>
          <div className="mod-switches">
            <Field label="Day closing reminders"><input className="mod-switch" type="checkbox" name="reminders" defaultChecked={ctx.preferences.reminders_enabled}/></Field>
            <Field label="Header notifications"><input className="mod-switch" type="checkbox" name="notifications" defaultChecked={ctx.preferences.notifications_enabled}/></Field>
          </div>
          <Status value={preferences.feedback}/><SaveButton pending={preferences.pending} label="Save preferences"/>
        </form>
      </Panel>
    </div>
    {ctx.role==="owner"&&<Panel title="Expense categories" aside={<Palette size={18}/>}>
      <div className="mod-tools" style={{marginBottom:"12px"}}><button className="mod-btn primary" type="button" onClick={()=>{category.setFeedback(null);setCategoryDialog("new");setDirty(false);}}>Add category</button></div>
      {!categories.length?<p className="mod-desc">No expense categories configured.</p>:<div className="mod-scroll"><table><thead><tr><th>Category</th><th>Color</th><th>Status</th><th>Action</th></tr></thead><tbody>{categories.map(item=><tr key={item.id}><td>{item.name}</td><td><span className="mod-dot" style={{display:"inline-block",background:item.color}}/> {item.color}</td><td><span className={"mod-badge "+(item.active?"green":"neutral")}>{item.active?"Active":"Inactive"}</span></td><td><button className="mod-btn" type="button" onClick={()=>{category.setFeedback(null);setCategoryDialog(item);setDirty(false);}}>Edit</button></td></tr>)}</tbody></table></div>}
      <Status value={category.feedback}/>
    </Panel>}
    <Panel title="Account">
      <form action={logout}><button className="mod-btn" type="submit"><LogOut size={15}/> Sign out</button></form>
    </Panel>
    {categoryDialog&&<Dialog title={categoryDialog==="new"?"Add expense category":"Edit expense category"} close={closeCategory}>
      <form className="mod-fields" onSubmit={saveCategory} onChange={()=>setDirty(true)}>
        <Field label="Category name"><input name="name" required maxLength={80} defaultValue={categoryDialog==="new"?"":categoryDialog.name}/></Field>
        <Field label="Color"><input name="color" type="color" required defaultValue={categoryDialog==="new"?"#EF402B":categoryDialog.color}/></Field>
        {categoryDialog!=="new"&&<Field label="Active"><input name="active" type="checkbox" defaultChecked={categoryDialog.active}/></Field>}
        <Status value={category.feedback?.ok?null:category.feedback}/><SaveButton pending={category.pending} label="Save category"/>
      </form>
    </Dialog>}
  </main>;
}
