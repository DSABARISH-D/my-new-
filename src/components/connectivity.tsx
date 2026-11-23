"use client";
import {useEffect,useState} from "react";
import {WifiOff} from "lucide-react";
export function Connectivity(){
 const [offline,setOffline]=useState(false);
 useEffect(()=>{const update=()=>setOffline(!navigator.onLine);update();window.addEventListener("online",update);window.addEventListener("offline",update);
 if("serviceWorker" in navigator && process.env.NODE_ENV==="production")navigator.serviceWorker.register("/sw.js").catch(()=>console.warn("service_worker_registration_failed"));
 return ()=>{window.removeEventListener("online",update);window.removeEventListener("offline",update)}},[]);
 return offline?<div className="offline-banner" role="alert"><WifiOff size={16}/> Offline. Reconnect to load records or save changes.</div>:null;
}
