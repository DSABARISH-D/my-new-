import { loadLedger, requireContext } from "@/lib/data";
import { todayISO, validDate } from "@/lib/analytics";

import { param, type Query, salesRange } from "@/components/modules/model";
import { Sales } from "@/components/modules/sales";
function selectedDate(query:Query, today:string) { const date=param(query,"date"); return validDate(date)?date:today; }
export default async function Page({searchParams}:{searchParams:Promise<Query>}) {
  const ctx=await requireContext();
  const today=todayISO(ctx.business.timezone);
  const query=await searchParams;
  const date = selectedDate(query, today), period = param(query,"period");
  const limits=salesRange(date,period);
  const data=await loadLedger(limits.prevFrom,limits.to);
  return <Sales key={date} ctx={ctx} data={data} date={date} period={period}/>;
}

