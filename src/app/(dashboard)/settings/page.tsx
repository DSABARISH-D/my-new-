import { loadLedger, requireContext } from "@/lib/data";
import { todayISO } from "@/lib/analytics";


import { Settings } from "@/components/modules/settings";

export default async function Page() {
  const ctx=await requireContext();
  const today=todayISO(ctx.business.timezone);
  
  const data=await loadLedger(today,today);
  return <Settings ctx={ctx} categories={data.categories} date={today}/>;
}

