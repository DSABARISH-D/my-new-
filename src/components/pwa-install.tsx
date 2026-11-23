"use client";

import {useEffect,useState} from "react";
import {Download,X} from "lucide-react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{outcome:"accepted"|"dismissed";platform:string}>;
};

export function PwaInstall() {
  const [promptEvent,setPromptEvent]=useState<InstallPromptEvent|null>(null);
  const [open,setOpen]=useState(false);
  const [installed,setInstalled]=useState(()=>typeof window==="undefined"?false:
    window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & {standalone?:boolean}).standalone===true);
  const [ios]=useState(()=>typeof window==="undefined"?false:/iphone|ipad|ipod/i.test(navigator.userAgent));
  const [iosDismissed,setIosDismissed]=useState(()=>typeof window==="undefined"?false:sessionStorage.getItem("sabarish-pwa-dismissed")==="true");

  useEffect(()=>{
    const capture=(event:Event)=>{
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
      setOpen(sessionStorage.getItem("sabarish-pwa-dismissed")!=="true");
    };
    const installedHandler=()=>{setInstalled(true);setOpen(false);sessionStorage.removeItem("sabarish-pwa-dismissed");};
    window.addEventListener("beforeinstallprompt",capture);
    window.addEventListener("appinstalled",installedHandler);
    return ()=>{
      window.removeEventListener("beforeinstallprompt",capture);
      window.removeEventListener("appinstalled",installedHandler);
    };
  },[]);

  async function install() {
    if(!promptEvent)return;
    await promptEvent.prompt();
    const choice=await promptEvent.userChoice;
    if(choice.outcome==="accepted"){setInstalled(true);setOpen(false);}
    else sessionStorage.setItem("sabarish-pwa-dismissed","true");
    setPromptEvent(null);
  }

  function dismiss() {
    sessionStorage.setItem("sabarish-pwa-dismissed","true");
    setOpen(false);
    setIosDismissed(true);
  }

  if(installed||iosDismissed||(!open&&!ios))return null;

  return <aside className="pwa-install" role="region" aria-label="Install Sabarish Fast Food">
    <span className="pwa-install-icon"><Download size={18}/></span>
    <div>
      <strong>Install Sabarish</strong>
      <p>{promptEvent?"Add the app to your home screen for quick access.":"On iPhone or iPad, open Share and choose Add to Home Screen."}</p>
    </div>
    {promptEvent?<button type="button" className="pwa-install-action" onClick={install}>Install</button>:ios?<button type="button" className="pwa-install-action" onClick={dismiss}>Got it</button>:null}
    <button type="button" className="pwa-install-close" aria-label="Dismiss install prompt" onClick={dismiss}><X size={16}/></button>
  </aside>;
}
