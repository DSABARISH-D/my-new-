import { loadLedger, requireContext } from "@/lib/data";
import { todayISO, validDate } from "@/lib/analytics";

import { param, type Query } from "@/components/modules/model";
import { Expenses } from "@/components/modules/expenses";
function selectedDate(query:Query, today:string) { const date=param(query,"date"); return validDate(date)?date:today; }
export default async function Page({searchParams}:{searchParams:Promise<Query>}) {
  const ctx=await requireContext();
  const today=todayISO(ctx.business.timezone);
  const query=await searchParams;
  const date = selectedDate(query,today);
  const data=await loadLedger(date,date);
  return <Expenses key={date} ctx={ctx} data={data} date={date} editId={param(query,"edit")}/>;
}

