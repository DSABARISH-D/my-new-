"use client";
import Image from "next/image";
import {useState} from "react";
import {useRouter} from "next/navigation";
import {ArrowLeft, BadgeCheck, Eye, EyeOff, KeyRound, LoaderCircle, LockKeyhole, Mail, ShieldCheck, Utensils, LogIn} from "lucide-react";
import {login,recover,setPassword} from "@/app/actions/auth";
import {Brand} from "./brand";
import {Button} from "./ui/button";

type Mode = "login"|"recover"|"reset";
export function AuthScreen({initialMode="login",reason}:{initialMode?:Mode;reason?:string}){
 const router=useRouter();
 const [mode,setMode]=useState(initialMode);
 const [visible,setVisible]=useState(false),[busy,setBusy]=useState(false),[email,setEmail]=useState(""),[password,setValue]=useState("");
 const [error,setError]=useState(reason==="staff"?"Your account needs an active staff assignment. Contact the owner.":reason==="link"?"This link has expired. Request another password email.":reason==="configuration"?"The database connection is not configured. Contact the business owner.":reason==="confirmed"?"Your email is confirmed. Sign in with your password.":"");
 const [sent,setSent]=useState(false);
 function changeMode(newMode:Mode){setMode(newMode);setValue("");setError("");setSent(false);setVisible(false)}
 async function submit(event:React.FormEvent){
  event.preventDefault();
  if(busy)return;
  setError("");setBusy(true);
  try{
   if(!navigator.onLine){setError("Reconnect to continue.");return}
   const result=mode==="login"?await login({email,password}):mode==="recover"?await recover({email}):await setPassword({password});
   if(!result.ok){setError(result.error??"Please try again.");return}
   if(mode==="recover")setSent(true);
   else {router.replace("/dashboard");router.refresh();}
  }catch{setError("Couldn’t reach the sign-in service. Please try again.")}
  finally{setBusy(false)}
 }
 const title=mode==="reset"?"Set your password":mode==="recover"?"Reset password":"Welcome back";
 return <main className="auth-page">
  <div className="auth-top"><Brand/><span className="top-label">Business Tracker</span></div>
  <div className="auth-grid">
   <section className="auth-art" aria-label="Sabarish Fast Food">
     <Image src="/images/wok.webp" alt="A chef tossing noodles in a flame-heated wok" fill priority sizes="(min-width: 851px) 49vw, 100vw" className="wok-image"/>
     <div className="photo-shade"/>
     <div className="art-caption"><span className="art-kicker"><span/>RESTAURANT WORKSPACE</span><div className="art-title">Sabarish<br/>Fast Food<span>.</span></div><div className="art-foot"><Utensils size={16}/><span>Sales &amp; expense management</span></div></div>
   </section>
   <section className="auth-form-column">
    <div className="auth-box">
     <div className="access-icon">{mode==="login"?<LogIn size={23}/>:<KeyRound size={23}/>}</div>
     <h1>{title}<em>.</em></h1>
     <p className="auth-intro">{mode==="reset"?"Choose a password for your staff account.":mode==="recover"?"We’ll send a recovery link to your work email.":"Sign in to your restaurant workspace."}</p>
     <form onSubmit={submit} className="login-form">
      {mode!=="reset" && <label className="login-label">Email address<span className="input-wrap"><Mail size={18}/><input type="email" autoComplete="username" required maxLength={254} placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)}/></span></label>}
      {mode!=="recover" && <div><div className="password-label"><label htmlFor="login-password">{mode==="reset"?"New password":"Password"}</label>{mode==="login" && <button type="button" disabled={busy} onClick={()=>changeMode("recover")}>Forgot password?</button>}</div><div className="input-wrap"><LockKeyhole size={18}/><input id="login-password" type={visible?"text":"password"} autoComplete={mode==="reset"?"new-password":"current-password"} required minLength={mode==="reset"?12:1} maxLength={mode==="reset"?128:512} placeholder={mode==="reset"?"At least 12 characters":"Enter your password"} value={password} onChange={e=>setValue(e.target.value)}/><button type="button" className="reveal" aria-label={visible?"Hide password":"Show password"} onClick={()=>setVisible(!visible)}>{visible?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></div>}
      {error && <p className="auth-message error" role="alert">{error}</p>}
      {sent && <p className="auth-message" role="status">If your account is active, a recovery link will arrive in your inbox.</p>}
      <Button className="auth-submit" disabled={busy || sent} type="submit">{busy?<><LoaderCircle className="spin" size={17}/> Please wait</>:mode==="recover"?"Send recovery link":mode==="reset"?"Save password":"Sign in"}</Button>
      {mode==="recover" && <button className="back-link" type="button" disabled={busy} onClick={()=>changeMode("login")}><ArrowLeft size={15}/> Back to sign in</button>}
     </form>
     <div className="access-note"><ShieldCheck size={19}/><div><strong>Staff access only</strong><p>Contact the owner if you need an account.</p></div></div>
    </div>
   </section>
  </div>
  <footer className="auth-footer"><span>© {new Date().getFullYear()} Sabarish Fast Food</span><span><BadgeCheck size={14}/> Staff workspace</span></footer>
 </main>
}
