import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseConfig } from "./lib/config";

export async function proxy(request:NextRequest) {
  let response=NextResponse.next({request});
  const config=supabaseConfig();
  if(config && request.cookies.getAll().some(cookie=>cookie.name.startsWith("sb-"))) {
    const client=createServerClient(config.url,config.key,{
      cookieOptions:{httpOnly:true,sameSite:"lax",secure:config.url.startsWith("https://")},
      cookies:{
        getAll:()=>request.cookies.getAll(),
        setAll:values=>{
          for(const {name,value} of values) request.cookies.set(name,value);
          response=NextResponse.next({request});
          for(const {name,value,options} of values) response.cookies.set(name,value,options);
        },
      },
    });
    // Refresh cookie sessions before Server Components render. Every private read also verifies the user and membership.
    await client.auth.getClaims();
  }
  response.headers.set("Cache-Control","private, no-store");
  return response;
}
export const config={matcher:["/dashboard/:path*","/sales/:path*","/expenses/:path*","/data-sheet/:path*","/reports/:path*","/settings/:path*","/staff/:path*","/api/export","/api/receipts/:path*","/reset-password","/login","/"]};
