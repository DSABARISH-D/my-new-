"use server";
import { revalidatePath } from "next/cache";
import { appOrigin } from "@/lib/config";
import { sessionContext } from "@/lib/data";
import { incident } from "@/lib/monitor";
import { receiptType, MAX_RECEIPT_BYTES } from "@/lib/receipts";
import { serverClient, adminClient } from "@/lib/supabase";
import { dateSchema, schemas, requestIdSchema, type ActionKind } from "@/lib/validation";
import type { ActionResult, Context, Role } from "@/lib/types";

const permitted:Record<ActionKind,Role[]>={
  sales:["owner","manager","staff"],expense:["owner","manager","staff"],adjustment:["owner","manager","staff"],
  void_expense:["owner","manager"],lock:["owner","manager"],reopen:["owner"],business:["owner"],category:["owner"],
  member:["owner"],invite:["owner"],preferences:["owner","manager","staff","viewer"],
};
const expired={ok:false,error:"Your session or staff access has expired. Sign in again."};
const forbidden={ok:false,error:"Your role does not have permission for this action."};

type DbError={code?:string;message:string};
function writeError(error:DbError):ActionResult {
  const code=error.code;
  if(code==="P0001" || code==="40001" || code==="42501" || code==="55000") {
    // Only messages intentionally raised by the migration are displayed to the signed-in actor.
    if(error.message.length<200 && !error.message.includes("\n")) return {ok:false,error:error.message};
  }
  if(code==="23505") return {ok:false,error:"This record already exists. Refresh and check the latest entry."};
  if(code==="23514" || code==="22P02" || code==="22003" || code==="22023") return {ok:false,error:"One or more values are invalid. Review the entry before saving."};
  return {ok:false,error:"The change could not be confirmed. Retry using the same entry. Reference "+incident("save_record",code)};
}

async function invite(context:Context, input:unknown, requestId:string):Promise<ActionResult> {
  const values=schemas.invite.parse(input);
  const db=await serverClient();
  const payload={p_business_id:context.business.id,p_action:"member_email",p_data:{email:values.email,role:values.role,active:true},p_request_id:requestId};
  const reserve=await db.rpc("tracker_invite_allowed",{p_business_id:context.business.id});
  if(reserve.error) return writeError(reserve.error);
  if(!reserve.data) return {ok:false,error:"The invitation limit has been reached. Try again in 15 minutes."};
  // Also attaches an existing auth account without exposing an account directory to staff.
  const existing=await db.rpc("tracker_write",payload);
  if(!existing.error) return {ok:true};
  if(existing.error.message!=="Account not found") return writeError(existing.error);
  const {error}=await adminClient().auth.admin.inviteUserByEmail(values.email,{data:{full_name:values.full_name},redirectTo:appOrigin()+"/auth/confirm"});
  if(error && !["email_exists","user_already_exists"].includes(error.code||"")) {
    if(error.status===429) return {ok:false,error:"Email delivery is rate limited. Please try again later."};
    return {ok:false,error:"The invitation email could not be sent. Reference "+incident("send_invite",error.code)};
  }
  const linked=await db.rpc("tracker_write",payload);
  if(linked.error) return writeError(linked.error);
  return {ok:true};
}

export async function mutate(kind:ActionKind, input:unknown, requestId:string):Promise<ActionResult> {
  try {
    if(!Object.hasOwn(schemas,kind) || !requestIdSchema.safeParse(requestId).success) return {ok:false,error:"Invalid save request. Refresh the form and try again."};
    const {context}=await sessionContext();
    if(!context) return expired;
    if(!permitted[kind].includes(context.role)) return forbidden;
    const parsed=schemas[kind].safeParse(input);
    if(!parsed.success) return {ok:false,error:parsed.error.issues[0]?.message || "Check the entry values."};
    let result:ActionResult;
    if(kind==="invite") result=await invite(context,parsed.data,requestId);
    else {
      const db=await serverClient();
      const {data,error}=await db.rpc("tracker_write",{
        p_business_id:context.business.id,p_action:kind,p_data:parsed.data,p_request_id:requestId,
      });
      result=error ? writeError(error) : {ok:true,id:data?.id};
    }
    if(result.ok) revalidatePath("/","layout");
    return result;
  } catch {return {ok:false,error:"The change could not be confirmed. Reconnect and retry the same entry. Reference "+incident("write_action")};}
}

export async function uploadReceipt(form:FormData):Promise<ActionResult> {
  try {
    const {context}=await sessionContext();
    if(!context) return expired;
    if(!permitted.expense.includes(context.role)) return forbidden;
    const date=dateSchema.safeParse(form.get("date"));
    if(!date.success) return {ok:false,error:"Choose the expense date before attaching a receipt."};
    const file=form.get("file");
    if(!(file instanceof File) || file.size<8 || file.size>MAX_RECEIPT_BYTES) return {ok:false,error:"Choose a JPG, PNG, WebP or PDF receipt up to 3 MiB."};
    const bytes=new Uint8Array(await file.arrayBuffer());
    const detected=receiptType(bytes);
    if(!detected || (file.type && file.type!==detected.mime)) return {ok:false,error:"The receipt content does not match a supported file type."};
    const db=await serverClient();
    const closing=await db.from("daily_closings").select("status").eq("business_id",context.business.id).eq("business_date",date.data).maybeSingle();
    if(closing.error) return writeError(closing.error);
    if(closing.data?.status==="locked") return {ok:false,error:"This business day is locked."};
    const path=[context.business.id,context.user.id,crypto.randomUUID()+"."+detected.ext].join("/");
    const upload=await adminClient().storage.from("receipts").upload(path,bytes,{upsert:false,contentType:detected.mime,cacheControl:"0"});
    if(upload.error) return {ok:false,error:"Receipt upload failed. Please try again. Reference "+incident("upload_receipt")};
    return {ok:true,path};
  } catch {return {ok:false,error:"The receipt could not be uploaded. Reference "+incident("upload_receipt")};}
}
