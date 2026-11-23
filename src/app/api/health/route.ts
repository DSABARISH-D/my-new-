import { supabaseConfig } from "@/lib/config";
export const dynamic="force-dynamic";
export async function GET(){
  const config=supabaseConfig();
  let ready=false;
  if(config) {
    try {
      const result=await fetch(config.url+"/auth/v1/health",{headers:{apikey:config.key},cache:"no-store",signal:AbortSignal.timeout(3500)});
      ready=result.ok;
    } catch { /* No internal addresses or service errors are exposed. */ }
  }
  return Response.json({service:"sabarish-tracker",status:ready?"ready":"unavailable"},{status:ready?200:503,headers:{"Cache-Control":"no-store"}});
}
