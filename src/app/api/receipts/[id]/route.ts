import { sessionContext } from "@/lib/data";
import { serverClient } from "@/lib/supabase";
import { requestIdSchema } from "@/lib/validation";
import { incident } from "@/lib/monitor";

export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const fail=(status:number,message:string)=>Response.json({error:message},{status,headers:{"Cache-Control":"private, no-store"}});
  if(!requestIdSchema.safeParse(id).success) return fail(400,"Invalid expense.");
  try {
    const {context}=await sessionContext();
    if(!context) return fail(401,"Sign in to view receipts.");
    const db=await serverClient();
    const receipt=await db.from("expenses").select("receipt_path").eq("business_id",context.business.id).eq("id",id).maybeSingle();
    if(receipt.error) return fail(503,"Unable to load the receipt.");
    const path=receipt.data?.receipt_path;
    if(typeof path!=="string" || !path.startsWith(context.business.id+"/")) return fail(404,"Receipt not found.");
    const signed=await db.storage.from("receipts").createSignedUrl(path,60,{download:true});
    if(signed.error || !signed.data) return fail(503,"Receipt download is unavailable.");
    return new Response(null,{status:303,headers:{Location:signed.data.signedUrl,"Cache-Control":"private, no-store","Referrer-Policy":"no-referrer"}});
  } catch { incident("download_receipt");return fail(503,"Receipt download is unavailable."); }
}
