import type {Metadata,Viewport} from "next";
import "@fontsource-variable/inter";
import "@fontsource/barlow-condensed/latin-700.css";
import "./globals.css";
import {Connectivity} from "@/components/connectivity";
export const metadata:Metadata={title:{default:"Sabarish Fast Food · Business Tracker",template:"%s · Sabarish Fast Food"},description:"Sales, expenses and cash reconciliation for Sabarish Fast Food.",manifest:"/manifest.webmanifest",icons:{icon:"/icons/icon-192.png",apple:"/icons/icon-192.png"},appleWebApp:{capable:true,title:"Sabarish",statusBarStyle:"default"}};
export const viewport:Viewport={width:"device-width",initialScale:1,themeColor:"#EF402B",viewportFit:"cover"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><Connectivity/>{children}</body></html>}
