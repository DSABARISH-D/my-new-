import { loadLedger, requireContext } from "@/lib/data";
import { todayISO } from "@/lib/analytics";
import { redirect } from "next/navigation";
import { param, type Query, range } from "@/components/modules/model";
import { Reports } from "@/components/modules/reports";

export default async function Page({searchParams}:{searchParams:Promise<Query>}) {
  const ctx=await requireContext();
  const today=todayISO(ctx.business.timezone);
  const query=await searchParams;
  if(ctx.role==="staff") redirect("/dashboard");
  const dates = range(param(query,"preset"),today,param(query,"from"),param(query,"to"));
  const data=await loadLedger(dates.from,dates.to);
  return <Reports ctx={ctx} data={data} today={today} dates={dates} query={query}/>;
}

