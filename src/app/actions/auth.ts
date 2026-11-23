"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { appOrigin, supabaseConfig } from "@/lib/config";
import { serverClient } from "@/lib/supabase";
import { incident } from "@/lib/monitor";
import type { ActionResult } from "@/lib/types";

const email = z.string().trim().email().max(254);
const credentials = z.object({email,password:z.string().min(1).max(512)});
const unavailable = {ok:false,error:"The sign-in service is unavailable. Please try again shortly."};
function loginError(error:{code?:string;status?:number}|null|undefined):ActionResult {
  if(error?.status===429) return {ok:false,error:"Too many attempts. Please try again later."};
  if(error?.code==="email_not_confirmed") return {ok:false,error:"Confirm your email address before signing in. Check your inbox or request a fresh invitation."};
  if(error?.code==="invalid_credentials") return {ok:false,error:"The email or password is incorrect. Check for extra spaces and try again."};
  if(error?.status && error.status>=500) return unavailable;
  if(error?.status===400) return {ok:false,error:"Supabase could not validate this sign-in request. Verify the email and password, then try again."};
  return unavailable;
}

export async function login(input:unknown):Promise<ActionResult> {
  const parsed=credentials.safeParse(input);
  if(!parsed.success) return {ok:false,error:"Enter your work email and password."};
  if(!supabaseConfig()) return {ok:false,error:"The database connection is not configured. Contact the business owner."};
  try {
    const db=await serverClient();
    const credentialsWithNormalizedEmail={email:parsed.data.email.toLowerCase(),password:parsed.data.password};
    const {data,error}=await db.auth.signInWithPassword(credentialsWithNormalizedEmail);
    if(error || !data.user) {
      return loginError(error);
    }
    const {data:{user:confirmedUser},error:userError}=await db.auth.getUser();
    if(userError || confirmedUser?.id!==data.user.id) {
      await db.auth.signOut({scope:"local"});
      return unavailable;
    }
    const membership=await db.from("business_memberships").select("id").eq("user_id",data.user.id).eq("active",true).limit(1);
    if(membership.error || !membership.data?.length) {
      await db.auth.signOut({scope:"local"});
      if(membership.error) { incident("login_membership",membership.error.code); return unavailable; }
      return {ok:false,error:"This account has no active business access. Contact the owner."};
    }
    return {ok:true};
  } catch {incident("login");return unavailable;}
}

export async function recover(input:unknown):Promise<ActionResult> {
  const parsed=z.object({email}).safeParse(input);
  if(!parsed.success) return {ok:false,error:"Enter a valid work email."};
  try {
    const db=await serverClient();
    const {error}=await db.auth.resetPasswordForEmail(parsed.data.email.toLowerCase(),{redirectTo:appOrigin()+"/auth/confirm?purpose=recovery"});
    if(error?.status===429) return {ok:false,error:"Please wait before requesting another link."};
    if(error && (!error.status || error.status>=500)) {incident("recover",error.code);return unavailable;}
    // Acknowledgement is identical for known and unknown addresses.
    return {ok:true};
  } catch {incident("recover");return unavailable;}
}

export async function setPassword(input:unknown):Promise<ActionResult> {
  const parsed=z.object({password:z.string().min(12).max(128)}).safeParse(input);
  if(!parsed.success) return {ok:false,error:"Choose a password with 12 to 128 characters."};
  try {
    const db=await serverClient();
    const {data:{user}}=await db.auth.getUser();
    if(!user) return {ok:false,error:"This link has expired. Request another password email."};
    const {error}=await db.auth.updateUser({password:parsed.data.password});
    if(error) return {ok:false,error:"The password could not be saved. Try a new password or request a fresh link."};
    return {ok:true};
  } catch {incident("set_password");return unavailable;}
}

export async function logout():Promise<void> {
  if(supabaseConfig()) {
    const db=await serverClient();
    const {error}=await db.auth.signOut({scope:"local"});
    if(error) throw new Error("Sign out could not be confirmed. Reconnect and try again.");
  }
  redirect("/login");
}
