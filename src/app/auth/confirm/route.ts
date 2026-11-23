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
  const purpose=url.searchParams.get("purpose");
  try {
    const db=await serverClient();
    if(hash && (type==="recovery" || type==="invite" || type==="signup" || type==="email")) {
      const otpType=type==="signup"||type==="email"?"email":type;
      const {error}=await db.auth.verifyOtp({token_hash:hash,type:otpType});
      if(!error && (type==="signup"||type==="email")) return next("/login?reason=confirmed");
      if(!error) return next("/reset-password");
    } else if(code) {
      const {error}=await db.auth.exchangeCodeForSession(code);
      if(!error) return next(purpose==="recovery"||purpose==="invite" ? "/reset-password" : "/reset-password");
    }
  } catch {incident("verify_email_link");}
  return next("/login?reason=link");
}
