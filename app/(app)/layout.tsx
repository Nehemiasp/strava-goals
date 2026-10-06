import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getSessionAthleteId } from "@/lib/server/session";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  if ((await getSessionAthleteId()) === null) redirect("/connect");
  return <AppShell>{children}</AppShell>;
}
