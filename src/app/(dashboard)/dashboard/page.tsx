import {Dashboard} from "@/components/dashboard/dashboard";
import {requireContext,loadLedger} from "@/lib/data";
import {validDate,todayISO,shiftDate} from "@/lib/analytics";
export const metadata={title:"Dashboard"};
export default async function DashboardPage({searchParams}:{searchParams:Promise<{date?:string}>}){
 const ctx=await requireContext(),query=await searchParams,now=new Date();
 const day=validDate(query.date)?query.date:todayISO(ctx.business.timezone,now);
 const hour=Number(new Intl.DateTimeFormat("en-GB",{hour:"2-digit",hourCycle:"h23",timeZone:ctx.business.timezone}).format(now));
 const data=await loadLedger(shiftDate(day,-29),day);
 return <Dashboard ctx={ctx} data={data} day={day} greeting={hour<12?"Good morning":hour<17?"Good afternoon":"Good evening"}/>;
}
