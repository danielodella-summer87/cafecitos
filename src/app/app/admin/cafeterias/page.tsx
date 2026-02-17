import { redirect } from "next/navigation";

export default function CafeteriasRedirectPage() {
  redirect("/app/admin/cafes");
}
