import { loadStaff, requireContext } from "@/lib/data";

import { redirect } from "next/navigation";

import { StaffPage } from "@/components/modules/staff";

export default async function Page() {
  const ctx=await requireContext();
  
  
  if(ctx.role!=="owner") redirect("/dashboard");
  return <StaffPage ctx={ctx} staff={await loadStaff()}/>;
}

