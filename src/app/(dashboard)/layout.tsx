import {AppShell} from "@/components/layout/app-shell";
import {requireContext} from "@/lib/data";
export const dynamic="force-dynamic";
export default async function WorkspaceLayout({children}:{children:React.ReactNode}){return <AppShell ctx={await requireContext()}>{children}</AppShell>}
