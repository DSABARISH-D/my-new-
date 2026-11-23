"use client";
import {useEffect} from "react";
export default function ErrorBoundary({error,reset}:{error:Error&{digest?:string};reset:()=>void}) {useEffect(()=>{console.error(JSON.stringify({event:"workspace_render_error",digest:error.digest??"unavailable"}))},[error]);return <main className="fault"><h1>Couldn’t load this page</h1><p>Check your connection and try again.</p><button className="button button-brand" onClick={reset}>Try again</button></main>}
