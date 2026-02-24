"use server";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { clearModeCookie, setModeCookie } from "@/lib/auth/session";

export async function setModeStaff() {
  const session = await getSession();
  if (!session || session.role !== "staff") redirect("/login");
  await setModeCookie("staff");
  redirect("/app/staff");
}

export async function setModeConsumer() {
  const session = await getSession();
  if (!session || session.role !== "staff") redirect("/login");
  await setModeCookie("consumer");
  redirect("/app/consumer");
}

/** Para el link "Cambiar modo": borra la cookie de modo y redirige al selector. */
export async function clearModeAndGoToChooseMode() {
  const session = await getSession();
  if (!session || session.role !== "staff") redirect("/login");
  await clearModeCookie();
  redirect("/app/choose-mode");
}
