"use client";
import { useEffect,useRef,useState, type FormEvent } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useForm } from "react-hook-form";
import { Banknote, Landmark, Wallet, Smartphone, ReceiptText, LockKeyhole, LockKeyholeOpen, Plus } from "lucide-react";
import { summarize, dailySeries, money } from "@/lib/analytics";
import { schemas } from "@/lib/validation";
import { type Context,type Ledger, salesRange,fullDays,displayDate,canWrite,canManage } from "./model";
import { Actor,DatePicker,Dialog,Empty,Field,Heading,LockBadge,Metric,Panel,SaveButton,Status,useWrite,useDirtyGuard } from "./shared";
const TrendChart=dynamic(()=>import("./charts").then(m=>m.TrendChart),{ssr:false});

type Inputs={cash_collected:string;upi_collected:string;opening_float:string;actual_amount:string;notes:string;reason:string};
const amountRule={required:"Enter an amount.",pattern:{value:/^\d{1,10}(\.\d{1,2})?$/,message:"Enter a non-negative amount with up to two decimals."}};
const formatValue=(v:number|undefined|null)=>v===null||v===undefined?"":String(v);
export function Sales({ctx,data,date,period}:{ctx:Context;data:Ledger;date:string;period:string}){
  const sale=data.sales.find(s=>s.business_date===date);
  const sums=summarize(data,date,date);
  const closing=data.closings.find(c=>c.business_date===date),locked=closing?.status==="locked";
  const editable=!locked&&canWrite(ctx);
  const mutation=useWrite(), state=useWrite(), adj=useWrite();
  const [lockDialog,setLockDialog]=useState(false),[adjustDialog,setAdjustDialog]=useState(false);
  const [adjustDirty,setAdjustDirty]=useState(false);
  const [adjustmentKey,setAdjustmentKey]=useState(0);
  const defaults=():Inputs=>({cash_collected:formatValue(sale?.cash_collected),upi_collected:formatValue(sale?.upi_collected),opening_float:formatValue(sale?.opening_float??0),actual_amount:formatValue(sums.actual),notes:sale?.notes??"",reason:""});
  const form=useForm<Inputs>({defaultValues:defaults()});
  const version=useRef(sale?.version??0);
  const {register,handleSubmit,setError,reset,formState:{errors,isDirty}}=form;
  useDirtyGuard(isDirty||adjustDirty);
  useEffect(()=>{
    if(!isDirty && (sale?.version??0)!==version.current){version.current=sale?.version??0;reset(defaults());}
    // A concurrent change must leave the original version attached to a dirty form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[sale?.version,isDirty,reset]);
  async function submit(values:Inputs) {
    const p={...values,business_date:date,version:version.current,actual_amount:values.actual_amount||null};
    const valid=schemas.sales.safeParse(p);
    if(!valid.success){const err=valid.error.issues[0];setError(err.path[0] as keyof Inputs,{message:err.message});return;}
    if(await mutation.save("sales",valid.data,"Sales saved.")) reset({...values,reason:""});
  }
  const r=salesRange(date,period), summary=summarize(data,r.from,r.to), prev=summarize(data,r.prevFrom,r.prevTo);
  const points=dailySeries(data,r.from,r.to).map(d=>({...d,label:displayDate(d.date).split(" ").slice(0,2).join(" ")}));
  const inputs=[{k:"opening_float",label:"Opening petty cash",Icon:Wallet,tone:"orange"},{k:"cash_collected",label:"Cash sales",Icon:Banknote,tone:"green"},{k:"upi_collected",label:"UPI sales",Icon:Smartphone,tone:"indigo"}] as const;
  const periodTitle=period==="month"?"Monthly":period==="week"?"Weekly":"Daily";
  async function changeLock(e:FormEvent<HTMLFormElement>){
    e.preventDefault();const fd=new FormData(e.currentTarget);
    if(await state.save(locked?"reopen":"lock",{business_date:date,...(locked?{reason:String(fd.get("reason"))}:{})},locked?"Day reopened.":"Entries locked."))setLockDialog(false);
  }
  return <main className="mod"><Heading title="Sales" description="Record collections and balance the cash drawer."><DatePicker date={date} extra={{period:period||"day"}}/></Heading>
    <div className="mod-split"><Panel title="Payment collections" aside={<LockBadge locked={locked}/>}>
      <div className="mod-meta">{displayDate(date)}<span>·</span><Actor ctx={ctx}/></div>
      {/* react-hook-form reads this ref during submit, not during rendering. */}
      {/* eslint-disable-next-line react-hooks/refs */}
      <form onSubmit={handleSubmit(submit)}><fieldset disabled={!editable||mutation.pending} className="mod-fields">
        {inputs.map(({k,label,Icon,tone})=><div className="mod-payrow" key={k}><span className={"mod-symbol "+tone}><Icon size={20}/></span><Field label={label} error={errors[k]?.message}><div className="mod-amount"><span>₹</span><input aria-label={label} inputMode="decimal" type="text" placeholder="0.00" {...register(k,amountRule)}/></div></Field></div>)}
        <div className="mod-payrow"><span className="mod-symbol red"><ReceiptText size={20}/></span><div className="mod-read"><span>Cash-paid expenses</span><strong>{money(sums.cashPaid)}</strong></div></div>
        <div className="mod-grid2"><Field label="Actual closing cash (optional)" error={errors.actual_amount?.message}><input inputMode="decimal" placeholder="₹ 0.00" {...register("actual_amount",{pattern:amountRule.pattern})}/></Field><Field label="Notes (optional)"><input maxLength={2000} {...register("notes")}/></Field></div>
        {!!sale&&<Field label="Correction reason" error={errors.reason?.message}><input {...register("reason",{required:"Explain the correction.",minLength:{value:3,message:"Enter at least three characters."}})} maxLength={500}/></Field>}
        {editable && <div className="mod-submit"><SaveButton pending={mutation.pending} label="Save sales"/></div>}
      </fieldset><Status value={mutation.feedback}/></form>
    </Panel>
    <div className="mod-column"><Panel title="Cash reconciliation" aside={<Landmark size={18}/>}><div className="mod-large"><span>Expected closing cash</span><strong>{money(sums.expected)}</strong></div>
      <dl className="mod-defs"><div><dt>Opening float</dt><dd>{money(sums.opening)}</dd></div><div><dt>Cash collections</dt><dd>{money(sums.cash)}</dd></div><div><dt>Cash-paid expenses</dt><dd>−{money(sums.cashPaid)}</dd></div><div><dt>Other adjustments</dt><dd>{money(sums.adjustments)}</dd></div><div><dt>Actual cash count</dt><dd>{sums.actual===null?"Awaiting count":money(sums.actual)}</dd></div><div><dt>Variance</dt><dd>{sums.variance===null?"—":money(sums.variance)}</dd></div></dl>
      {editable&&<button className="mod-btn" onClick={()=>{adj.setFeedback(null);setAdjustDialog(true);}}><Plus size={15}/> Cash adjustment</button>}<Status value={adj.feedback?.ok?adj.feedback:null}/>
      {data.ledger.some(a=>a.business_date===date)&&<details className="mod-details"><summary>Cash adjustment history</summary>{data.ledger.filter(a=>a.business_date===date).map(a=><div className="mod-breakdown" key={a.id}>{a.notes}<strong>{a.transaction_type==="cash_out"?"−":"+"}{money(a.amount)}</strong></div>)}</details>}
    </Panel><Panel title="Day closing"><p className="mod-desc">{locked?"Entries for this date are locked.":"Lock the day once the collections and cash count have been reviewed."}</p>
      {((!locked&&canManage(ctx))||(locked&&ctx.role==="owner"))&&<button className="mod-btn" onClick={()=>{state.setFeedback(null);setLockDialog(true);}}>{locked?<LockKeyholeOpen size={15}/>:<LockKeyhole size={15}/>} {locked?"Reopen day":"Lock entries"}</button>}
      {closing?.reopen_reason&&<p className="mod-desc">Last reopening reason · {closing.reopen_reason}</p>}<Status value={state.feedback?.ok?state.feedback:null}/>
    </Panel></div></div>
    <Panel title={periodTitle+" sales"} aside={<nav className="mod-tabs" aria-label="Sales period">{["day","week","month"].map(p=><Link key={p} className={p===(period||"day")?"on":""} href={"/sales?"+new URLSearchParams({date,period:p})}>{p[0].toUpperCase()+p.slice(1)}</Link>)}</nav>}>
      <p className="mod-meta">{displayDate(r.from)}{r.to!==r.from?" – "+displayDate(r.to):""}</p><div className="mod-metrics"><Metric label="Collected sales" value={money(summary.sales)} tone="accent">{money(summary.sales-prev.sales)} vs previous period</Metric><Metric label="Cash" value={money(summary.cash)}/><Metric label="UPI" value={money(summary.upi)}/>{r.from!==r.to&&<Metric label="Average per calendar day" value={money(summary.sales/fullDays(r.from,r.to))}/>}</div>
      {data.sales.some(s=>s.business_date>=r.from&&s.business_date<=r.to)?<TrendChart rows={points} series={[{key:"cash",name:"Cash",color:"#32885c"},{key:"upi",name:"UPI",color:"#7771c9"}]}/>:<Empty title="No sales recorded for this period"/>}
    </Panel>
    {lockDialog&&<Dialog title={locked?"Reopen this business day?":"Lock this business day?"} close={()=>{if(!state.pending)setLockDialog(false);}}><form className="mod-fields" onSubmit={changeLock}><p>{displayDate(date)} · {locked?"Team members will be able to edit this date again.":"This will prevent further financial entries for the selected date."}</p>{locked&&<Field label="Reopening reason"><textarea name="reason" required minLength={3} maxLength={500}/></Field>}<Status value={state.feedback?.ok?null:state.feedback}/><SaveButton label={locked?"Reopen day":"Confirm lock"} pending={state.pending}/></form></Dialog>}
    {adjustDialog&&<Dialog title="Cash adjustment" close={()=>{if(!adj.pending&&(!adjustDirty||window.confirm("Discard the cash adjustment?"))){setAdjustDialog(false);setAdjustDirty(false);}}}><form key={adjustmentKey} className="mod-fields" onChange={()=>setAdjustDirty(true)} onSubmit={async e=>{e.preventDefault();const fields=Object.fromEntries(new FormData(e.currentTarget));if(await adj.save("adjustment",{...fields,business_date:date},"Cash adjustment saved.")){setAdjustDialog(false);setAdjustDirty(false);setAdjustmentKey(k=>k+1);}}}><Field label="Adjustment type"><select name="transaction_type"><option value="cash_in">Cash in</option><option value="cash_out">Cash out</option></select></Field><Field label="Amount"><input name="amount" type="number" step="0.01" min="0.01" max="9999999999.99" inputMode="decimal" required/></Field><Field label="Reason for adjustment"><textarea name="notes" minLength={3} maxLength={2000} required/></Field><Status value={adj.feedback?.ok?null:adj.feedback}/><SaveButton label="Save adjustment" pending={adj.pending}/></form></Dialog>}
  </main>;
}

