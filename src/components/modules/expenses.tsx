"use client";
import { useState, useRef, useEffect, type FormEvent } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { FileText, Pencil, Receipt, Ban, Paperclip } from "lucide-react";
import { money, summarize } from "@/lib/analytics";
import { schemas } from "@/lib/validation";
import { uploadReceipt } from "@/app/actions/business";
import { canManage,canWrite,displayDate,methods,methodTitle,titleCase,type Context,type Expense,type Ledger } from "./model";
import { Actor,Breakdown,DatePicker,Dialog,Empty,Field,Heading,LockBadge,Metric,Panel,SaveButton,Status,useDirtyGuard,useWrite } from "./shared";
type Values = {category_id:string;amount:string;payment_method:Expense["payment_method"];payment_status:Expense["payment_status"];vendor_name:string;quantity:string;unit:string;notes:string;reason:string};
const defaults=(exp:Expense|undefined,category:string):Values=>({category_id:exp?.category_id??category,amount:exp?String(exp.amount):"",payment_method:exp?.payment_method??"cash",payment_status:exp?.payment_status??"paid",vendor_name:exp?.vendor_name??"",quantity:exp?.quantity!=null?String(exp.quantity):"",unit:exp?.unit??"",notes:exp?.notes??"",reason:""});

function ExpenseForm({data,date,entry}:{data:Ledger;date:string;entry?:Expense}){
  const categories=data.categories.filter(c=>c.active||c.id===entry?.category_id);
  const base=defaults(entry,categories[0]?.id??"");
  const {register,handleSubmit,reset,setError,formState:{isDirty,errors}}=useForm<Values>({defaultValues:base});
  const mutation=useWrite();
  const [file,setFile]=useState<File|null>(null),[uploading,setUploading]=useState(false);
  const [showDetails,setShowDetails]=useState(Boolean(entry?.vendor_name||entry?.notes||entry?.receipt_path||entry?.quantity!=null));
  const version=useRef(entry?.version??0), receiptPath=useRef<string|null>(entry?.receipt_path??null), fileInput=useRef<HTMLInputElement>(null), busy=useRef(false);
  const dirty=isDirty||!!file;
  useDirtyGuard(dirty);
  useEffect(()=>{
    if(!dirty && (entry?.version??0)!==version.current){
      version.current=entry?.version??0;
      receiptPath.current=entry?.receipt_path??null;
      reset(defaults(entry,categories[0]?.id??""));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[entry?.version,dirty,reset]);
  async function submit(values:Values){
    if(busy.current)return;
    const p={...values,business_date:date,id:entry?.id,version:version.current,quantity:values.quantity||null,receipt_path:receiptPath.current};
    const parsed=schemas.expense.safeParse(p);
    if(!parsed.success){const issue=parsed.error.issues[0];setError(issue.path[0] as keyof Values,{message:issue.message});return;}
    busy.current=true;
    try{
      if(file && !receiptPath.current){
        setUploading(true);
        const fd=new FormData();fd.set("file",file);fd.set("date",date);
        const res=await uploadReceipt(fd);
        if(!res.ok||!res.path) throw new Error(res.error||"Could not upload receipt.");
        receiptPath.current=res.path;
      }
      if(await mutation.save("expense",{...parsed.data,receipt_path:receiptPath.current},entry?"Expense updated.":"Expense saved.")){
        setFile(null);if(fileInput.current)fileInput.current.value="";
        reset(entry?{...values,reason:""}:defaults(undefined,values.category_id));
        if(!entry)receiptPath.current=null;
      }
    }catch(e){mutation.setFeedback({ok:false,message:e instanceof Error?e.message:"Upload failed. Reconnect and try again."});}
    finally{setUploading(false);busy.current=false;}
  }
  return <form onSubmit={handleSubmit(submit)}><fieldset className="mod-fields" disabled={mutation.pending||uploading}>
    <div className="mod-grid2"><Field label="Category" error={errors.category_id?.message}><select {...register("category_id",{required:"Select an expense category."})} required>{!categories.length&&<option value="">No active categories</option>}{categories.map(c=><option key={c.id} value={c.id}>{c.name}{!c.active?" (disabled)":""}</option>)}</select></Field>
      <Field label="Amount" error={errors.amount?.message}><div className="mod-amount"><span>₹</span><input aria-label="Amount" inputMode="decimal" type="text" placeholder="0.00" {...register("amount",{required:"Enter the expense amount.",pattern:{value:/^\d{1,10}(\.\d{1,2})?$/,message:"Enter a non-negative amount with up to two decimals."}})}/></div></Field></div>
    <div className="mod-grid2"><Field label="Payment method"><select {...register("payment_method")}>{Object.entries(methods).map(([v,n])=><option key={v} value={v}>{n}</option>)}</select></Field><Field label="Payment status"><select {...register("payment_status")}><option value="paid">Paid</option><option value="pending">Pending</option><option value="due">Due</option></select></Field></div>
    <details className="mod-details" open={showDetails} onToggle={e=>setShowDetails(e.currentTarget.open)}><summary><Paperclip size={15}/> Vendor, quantity, notes and receipt</summary><div className="mod-fields"><Field label="Vendor or supplier"><input maxLength={180} {...register("vendor_name")}/></Field>
      <div className="mod-grid2"><Field label="Quantity" error={errors.quantity?.message}><input inputMode="decimal" placeholder="0" {...register("quantity",{pattern:{value:/^\d{1,9}(\.\d{1,3})?$/,message:"Use up to three decimals."}})}/></Field><Field label="Unit"><input {...register("unit")} maxLength={180} placeholder="e.g. kg, litre, piece"/></Field></div>
      <Field label="Notes"><textarea {...register("notes")} maxLength={2000}/></Field>
      <Field label="Receipt attachment"><input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp,application/pdf" onChange={e=>{const f=e.target.files?.[0]??null;if(f&&f.size>3*1024*1024){mutation.setFeedback({ok:false,message:"Choose a receipt under 3 MiB."});e.target.value="";setFile(null);receiptPath.current=entry?.receipt_path??null;return;}setFile(f);receiptPath.current=f?null:entry?.receipt_path??null;}}/></Field><small>PDF, JPG, PNG or WebP. Maximum 3 MiB.</small>
      {entry?.receipt_path&&<a className="mod-text" href={"/api/receipts/"+entry.id} target="_blank" rel="noreferrer">View saved receipt</a>}
    </div></details>
    {entry&&<Field label="Correction reason" error={errors.reason?.message}><input {...register("reason",{required:"Explain the correction.",minLength:{value:3,message:"Enter at least three characters."}})} maxLength={500}/></Field>}
    <div className="mod-submit">{entry&&<Link className="mod-btn" href={"/expenses?date="+date}>Cancel edit</Link>}<SaveButton label={entry?"Save changes":"Save expense"} pending={mutation.pending||uploading} disabled={!categories.length}/></div>
  </fieldset><Status value={mutation.feedback}/></form>;
}
export function Expenses({ctx,data,date,editId}:{ctx:Context;data:Ledger;date:string;editId:string}){
  const [toVoid,setToVoid]=useState<Expense|null>(null),[category,setCategory]=useState(""),[status,setStatus]=useState("");
  const mutation=useWrite();
  const locked=data.closings.some(d=>d.business_date===date&&d.status==="locked"),editable=!locked&&canWrite(ctx);
  const all=data.expenses.filter(e=>!e.voided_at&&e.business_date===date), entry=all.find(e=>e.id===editId);
  const list=all.filter(e=>(!category||e.category_id===category)&&(!status||e.payment_status===status)).sort((a,b)=>b.created_at.localeCompare(a.created_at));
  const [page,setPage]=useState(1);const maxPage=Math.max(1,Math.ceil(list.length/15)), currentPage=Math.min(page,maxPage);
  const s=summarize(data,date,date), cat=(id:string)=>data.categories.find(c=>c.id===id)?.name??"Expense";
  async function confirmVoid(e:FormEvent<HTMLFormElement>){
    e.preventDefault();if(!toVoid)return;const fd=new FormData(e.currentTarget);
    if(await mutation.save("void_expense",{id:toVoid.id,business_date:date,version:toVoid.version,reason:String(fd.get("reason"))},"Expense voided."))setToVoid(null);
  }
  return <main className="mod"><Heading title="Expenses" description="Track purchases, supplier payments and outstanding expenses."><DatePicker date={date}/></Heading><div className="mod-split">
    <Panel title={entry?"Edit expense":editable?"Add expense":"Expense entry"} aside={<LockBadge locked={locked}/>}><div className="mod-meta">{displayDate(date)}<span>·</span><Actor ctx={ctx}/></div>
      {editable?<ExpenseForm key={entry?.id??"new"} entry={entry} data={data} date={date}/>:<p className="mod-desc">{locked?"Financial entries are locked for this date.":"You have read-only access to expenses."}</p>}
    </Panel><Panel title="Expense breakdown" aside={<Receipt size={18}/>}><div className="mod-metrics compact"><Metric label="Total recorded" value={money(s.recorded)} tone="accent"/><Metric label="Total paid" value={money(s.paid)}/></div><div className="mod-meta">{s.categories.length} categories used · {s.expenseCount} expenses</div><Breakdown categories={s.categories}/><dl className="mod-defs"><div><dt>Pending</dt><dd>{money(s.pending)}</dd></div><div><dt>Due</dt><dd>{money(s.due)}</dd></div></dl></Panel>
  </div><Panel title="Expense entries"><div className="mod-tools"><select aria-label="Filter by category" value={category} onChange={e=>{setCategory(e.target.value);setPage(1);}}><option value="">All categories</option>{data.categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><select aria-label="Filter by status" value={status} onChange={e=>{setStatus(e.target.value);setPage(1);}}><option value="">All statuses</option>{["paid","pending","due"].map(v=><option key={v} value={v}>{titleCase(v)}</option>)}</select></div>
    {!list.length?<Empty title={all.length?"No matching expenses":"No expenses recorded"} detail={all.length?"Choose another category or status.":undefined}/>:<><div className="mod-scroll"><table><thead><tr>{["Category","Amount","Payment method","Status","Vendor","Actions"].map(col=><th key={col}>{col}</th>)}</tr></thead><tbody>{list.slice((currentPage-1)*15,currentPage*15).map(e=><tr key={e.id}><td>{cat(e.category_id)}</td><td className="mod-currency">{money(e.amount)}</td><td>{methodTitle(e.payment_method)}</td><td><span className={"mod-badge "+(e.payment_status==="paid"?"green":"amber")}>{titleCase(e.payment_status)}</span></td><td>{e.vendor_name||"—"}</td><td><div className="mod-tools">{editable&&<Link className="mod-icon" aria-label={"Edit "+cat(e.category_id)} href={"/expenses?"+new URLSearchParams({date,edit:e.id})}><Pencil size={15}/></Link>}{e.receipt_path&&<a aria-label="View receipt" className="mod-icon" href={"/api/receipts/"+e.id} target="_blank" rel="noreferrer"><FileText size={15}/></a>}{editable&&canManage(ctx)&&<button className="mod-icon" aria-label={"Void "+cat(e.category_id)} onClick={()=>{mutation.setFeedback(null);setToVoid(e);}}><Ban size={15}/></button>}</div></td></tr>)}</tbody></table></div>{maxPage>1&&<div className="mod-pager"><button className="mod-btn" disabled={currentPage===1} onClick={()=>setPage(currentPage-1)}>Previous</button><span>Page {currentPage} of {maxPage}</span><button className="mod-btn" disabled={currentPage===maxPage} onClick={()=>setPage(currentPage+1)}>Next</button></div>}</>}
    <Status value={mutation.feedback?.ok?mutation.feedback:null}/>
    </Panel>{toVoid&&<Dialog title="Void this expense?" close={()=>{if(!mutation.pending)setToVoid(null);}}><form className="mod-fields" onSubmit={confirmVoid}><p>{cat(toVoid.category_id)} · {money(toVoid.amount)}. Voiding removes this expense from financial totals and preserves its audit history.</p><Field label="Void reason"><textarea name="reason" required minLength={3} maxLength={500}/></Field><Status value={mutation.feedback?.ok?null:mutation.feedback}/><SaveButton label="Confirm void" pending={mutation.pending}/></form></Dialog>}</main>;
}

