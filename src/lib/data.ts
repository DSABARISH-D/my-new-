import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { supabaseConfig } from "./config";
import { serverClient } from "./supabase";
import { incident } from "./monitor";
import { validateRange } from "./validation";
import type { Business, Context, Ledger, Member, Person, Role, StaffData } from "./types";

type BackendError = { code?: string; message: string };
export function checked<T>(data:T|null,error:BackendError|null,operation:string):T {
  if(error || data===null) {
    const ref = incident(operation,error?.code);
    throw new Error("The database could not complete the request. Reference " + ref);
  }
  return data;
}

export const sessionContext = cache(async (): Promise<{context:Context|null;reason:"configuration"|"session"|"staff"|null}> => {
  if (!supabaseConfig()) return {context:null,reason:"configuration"};
  const db=await serverClient();
  const {data:{user},error:authError}=await db.auth.getUser();
  if (authError && "status" in authError && authError.status && authError.status >= 500) {
    throw new Error("The sign-in service is unavailable. Please try again.");
  }
  if (!user) return {context:null,reason:"session"};
  const [membership,profile,prefs] = await Promise.all([
    db.from("business_memberships").select("business_id,role").eq("user_id",user.id).eq("active",true).order("created_at").order("id").limit(1).maybeSingle(),
    db.from("profiles").select("id,email,full_name").eq("id",user.id).maybeSingle(),
    db.from("user_preferences").select("reminders_enabled,notifications_enabled").eq("user_id",user.id).maybeSingle(),
  ]);
  if(membership.error || profile.error || prefs.error) {
    checked(null,membership.error || profile.error || prefs.error,"read_session_context");
  }
  if (!membership.data) return {context:null,reason:"staff"};
  const business = await db.from("businesses").select("id,name,timezone,phone,address,gstin").eq("id",membership.data.business_id).single();
  return {context: {
    user: profile.data as Person ?? {id:user.id,email:user.email||"",full_name:user.email?.split("@")[0]||"Staff"},
    role:membership.data.role as Role,
    preferences: prefs.data ?? {reminders_enabled:true,notifications_enabled:true},
    business:checked(business.data,business.error,"read_business") as Business,
  },reason:null};
});

export const requireContext = cache(async ():Promise<Context> => {
  const result=await sessionContext();
  if (!result.context) redirect(result.reason==="session" ? "/login" : "/login?reason="+result.reason);
  return result.context;
});

type PageRequest = (start:number,end:number)=>PromiseLike<{data:unknown[]|null;error:BackendError|null}>;
async function readPages<T>(operation:string, query:PageRequest):Promise<T[]> {
  const rows:T[] = [];
  // Stay below PostgREST's default row cap, including on exports and high-volume days.
  const chunk=500;
  for(let start=0;;start+=chunk){
    const result=await query(start,start+chunk-1);
    const page=checked(result.data,result.error,operation) as T[];
    rows.push(...page);
    if(page.length<chunk) return rows;
  }
}

const directory = cache(async (businessId:string) => {
  const db=await serverClient();
  const members=await readPages<{user_id:string;role:Role;active:boolean}>("read_members", (a,b)=> db.from("business_memberships").select("user_id,role,active").eq("business_id",businessId).order("user_id").range(a,b));
  const people:Person[]=[];
  for(let i=0;i<members.length;i+=100){
    const result=await db.from("profiles").select("id,email,full_name").in("id",members.slice(i,i+100).map(m=>m.user_id));
    people.push(...checked(result.data,result.error,"read_people") as Person[]);
  }
  return {members,people};
});

export const loadLedger = cache(async (from:string,to:string):Promise<Ledger> => {
  validateRange(from,to);
  const [{business},db]=await Promise.all([requireContext(),serverClient()]);
  const readRange=<T>(table:string) => readPages<T>(table,(a,b)=>db.from(table).select("*").eq("business_id",business.id).gte("business_date",from).lte("business_date",to).order("business_date").order("id").range(a,b));
  const [sales,expenses,ledger,reconciliations,closings,categories,{people}]=await Promise.all([
    readRange<Ledger["sales"][number]>("daily_sales"),readRange<Ledger["expenses"][number]>("expenses"),
    readRange<Ledger["ledger"][number]>("petty_cash_ledger"),readRange<Ledger["reconciliations"][number]>("cash_reconciliations"),
    readRange<Ledger["closings"][number]>("daily_closings"),
    readPages<Ledger["categories"][number]>("read_categories",(a,b)=>db.from("expense_categories").select("id,name,color,active").eq("business_id",business.id).order("name").order("id").range(a,b)),
    directory(business.id),
  ]);
  return {sales,expenses,ledger,reconciliations,closings,categories,people};
});

export const loadStaff=cache(async ():Promise<StaffData> => {
  const {business,role}=await requireContext();
  if(role!=="owner") redirect("/dashboard");
  const db=await serverClient();
  const [{members,people},audit]=await Promise.all([
    directory(business.id),
    db.from("audit_logs").select("id,entity_type,action,actor_id,created_at,reason").eq("business_id",business.id).order("created_at",{ascending:false}).limit(100),
  ]);
  const profiles=new Map(people.map(person=>[person.id,person]));
  const team:Member[]=members.map(member=>({...member,email:profiles.get(member.user_id)?.email??"",full_name:profiles.get(member.user_id)?.full_name??"Former staff"}));
  return {members:team,audit:checked(audit.data,audit.error,"read_audit") as StaffData["audit"]};
});
