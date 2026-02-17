import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { getCafes, getNextImageCode } from "@/app/actions/cafes";
import CafeListClient from "./CafeListClient";

export default async function AdminCafesPage() {
  const session = await getSession();
  if (!session || session.role !== "admin") redirect("/login");

  const [cafes, nextCode] = await Promise.all([
    getCafes(),
    getNextImageCode(),
  ]);

  return <CafeListClient cafes={cafes} nextCode={nextCode} />;
}
