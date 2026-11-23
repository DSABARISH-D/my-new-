import { NextRequest, NextResponse } from "next/server";
import { serverClient } from "@/lib/supabase";
import { appOrigin } from "@/lib/config";
import { incident } from "@/lib/monitor";

export async function GET(request:NextRequest) {
  const url=request.nextUrl;
  const next = (path:string) => {
    const response=NextResponse.redirect(new URL(path,appOrigin()));
    response.headers.set("Cache-Control","private, no-store");
    response.headers.set("Referrer-Policy","no-referrer");
    return response;
  };
  const type=url.searchParams.get("type");
  const hash=url.searchParams.get("token_hash");
  const code=url.searchParams.get("code");
  try {
    const db=await serverClient();
    if(hash && (type==="recovery" || type==="invite")) {
      const {error}=await db.auth.verifyOtp({token_hash:hash,type});
      if(!error) return next("/reset-password");
    } else if(code) {
      const {error}=await db.auth.exchangeCodeForSession(code);
      if(!error) return next("/reset-password");
    }
  } catch {incident("verify_email_link");}
  return next("/login?reason=link");
}
