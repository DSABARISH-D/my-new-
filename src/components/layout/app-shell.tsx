"use client";
import {useState} from "react";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {BarChart3, Bell, BookOpen, ChevronRight, CircleUserRound, LayoutDashboard, Menu, PanelLeftClose, ReceiptText, Settings, UsersRound, Wallet, X} from "lucide-react";
import { Brand } from "@/components/brand";
import type {Context} from "@/lib/types";
const destinations=[
 {href:"/dashboard",label:"Dashboard",mobile:"Home",icon:LayoutDashboard},
 {href:"/sales",label:"Sales",mobile:"Sales",icon:Wallet},
 {href:"/expenses",label:"Expenses",mobile:"Expenses",icon:ReceiptText},
 {href:"/data-sheet",label:"Data Sheet",mobile:"Data Sheet",icon:BookOpen},
 {href:"/reports",label:"Reports",mobile:"Reports",icon:BarChart3},
 {href:"/staff",label:"Staff management",mobile:"Staff",icon:UsersRound},
 {href:"/settings",label:"Settings",mobile:"Settings",icon:Settings}];
export function AppShell({ctx,children}:{ctx:Context;children:React.ReactNode}) {
 const path=usePathname(), [small,setSmall]=useState(false),[drawer,setDrawer]=useState(false),[alerts,setAlerts]=useState(false);
 const nav=destinations.filter(item=>(item.href!=="/staff"||ctx.role==="owner") && (item.href!=="/reports"||ctx.role!=="staff"));
 const name=ctx.user.full_name||ctx.user.email;
 const initials=name.split(/\s+/).slice(0,2).map(word=>word.slice(0,1).toUpperCase()).join("");
 return <div className={`workspace ${small?"compact":""} ${drawer?"drawer-open":""}`}>
  <a href="#workspace-content" className="skip">Skip to content</a>
  {drawer&&<button className="drawer-scrim" aria-label="Close navigation" onClick={()=>setDrawer(false)}/>}
  <aside className="side">
   <div className="side-brand"><Link href="/dashboard" aria-label={ctx.business.name} onClick={()=>setDrawer(false)}><Brand compact={small && !drawer}/></Link><button className="mobile-close" aria-label="Close navigation" onClick={()=>setDrawer(false)}><X size={20}/></button></div>
   <div className="side-inner"><div className="nav-group-label">Workspace</div><nav aria-label="Main navigation">{nav.map(({href,label,icon:Icon})=><Link key={href} href={href} aria-current={path===href?"page":undefined} title={label} onClick={()=>setDrawer(false)}><Icon size={19}/><span>{label}</span></Link>)}</nav></div>
   <button className="collapse" aria-label={small?"Expand navigation":"Collapse navigation"} onClick={()=>setSmall(!small)}>{small?<ChevronRight size={18}/>:<PanelLeftClose size={18}/>}<span>Collapse sidebar</span></button>
  </aside>
  <div className="workspace-main"><header className="workspace-header"><div className="header-crumb"><button className="mobile-menu" aria-label="Open navigation" onClick={()=>setDrawer(true)}><Menu size={22}/></button><span>Workspace</span><ChevronRight size={13}/><strong>{nav.find(n=>n.href===path)?.label??"Dashboard"}</strong></div>
   <div className="header-profile">{ctx.preferences.notifications_enabled && <div className="alert-wrap"><button className="bell" onClick={()=>setAlerts(!alerts)} aria-label="Day closing reminders" aria-expanded={alerts}><Bell size={19}/></button>{alerts&&<div className="alert-pop"><strong>Day closing</strong><p>{ctx.preferences.reminders_enabled?"Review the cash count and lock entries when the shift ends.":"End-of-day reminders are turned off."}</p><Link href="/sales" onClick={()=>setAlerts(false)}>View cash reconciliation</Link></div>}</div>}<span className="header-divider"/><Link className="user-link" href="/settings" aria-label="Profile settings"><span className="avatar">{initials||<CircleUserRound size={17}/>}</span><span className="user-label"><strong>{name}</strong><small>{ctx.role}</small></span></Link></div>
  </header><main id="workspace-content" className="content">{children}</main></div>
  <nav className="bottom-nav" aria-label="Mobile navigation">{nav.filter(n=>n.href!=="/reports" && n.href!=="/staff").map(({href,mobile,icon:Icon})=><Link key={href} href={href} aria-current={path===href?"page":undefined}><Icon size={19}/><span>{mobile}</span></Link>)}</nav>
 </div>
}
