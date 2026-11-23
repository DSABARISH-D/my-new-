import { AuthScreen } from "@/components/auth-screen";
import { sessionContext } from "@/lib/data";
import {redirect} from "next/navigation";
export const metadata={title:"Staff sign in"};
export default async function LoginPage({searchParams}:{searchParams:Promise<{reason?:string}>}){const result=await sessionContext();if(result.context)redirect("/dashboard");return <AuthScreen reason={(await searchParams).reason}/>}
