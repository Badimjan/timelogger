import { redirect } from "next/navigation";
import { History } from "@/components/History";
import { getSession } from "@/lib/session";

export default async function HistoryPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  return <History userName={session.user.displayName} />;
}
