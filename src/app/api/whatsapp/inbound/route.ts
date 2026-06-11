import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { supabaseAdminTarget } from "@/lib/supabase/admin";
import { TWIML_CONTENT_TYPE, twimlMessage } from "@/lib/twilio/twiml";
import {
  isWelcomeGiftIntent,
  processInboundMessagePhase2,
  twimlReplyForAction,
} from "@/lib/whatsapp/inboundPhase2";

function formString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

function validateWebhookToken(req: Request): { ok: true } | { ok: false; response: NextResponse } {
  const expected = process.env.TWILIO_WEBHOOK_AUTH_TOKEN?.trim();
  if (!expected) {
    console.warn(
      "TWILIO_WEBHOOK_AUTH_TOKEN is not configured; inbound webhook is running without token validation."
    );
    return { ok: true };
  }

  const token = new URL(req.url).searchParams.get("token") ?? "";
  const expectedBuf = Buffer.from(expected);
  const tokenBuf = Buffer.from(token);

  if (expectedBuf.length !== tokenBuf.length || !timingSafeEqual(expectedBuf, tokenBuf)) {
    return { ok: false, response: new NextResponse("Unauthorized", { status: 401 }) };
  }

  return { ok: true };
}

function formDataToRecord(form: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  form.forEach((value, key) => {
    if (typeof value === "string") out[key] = value;
  });
  return out;
}

export async function POST(req: Request) {
  const auth = validateWebhookToken(req);
  if (!auth.ok) return auth.response;

  const form = await req.formData();
  const from = formString(form.get("From"));
  const to = formString(form.get("To"));
  const body = formString(form.get("Body"));
  const profileName = formString(form.get("ProfileName"));
  const waId = formString(form.get("WaId"));
  const messageSid = formString(form.get("MessageSid"));
  const accountSid = formString(form.get("AccountSid"));
  const welcomeIntent = isWelcomeGiftIntent(body);

  let phase2Result;
  try {
    phase2Result = await processInboundMessagePhase2({
      from,
      to,
      body,
      profileName,
      waId,
      messageSid,
      accountSid,
      rawPayload: formDataToRecord(form),
    });
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : "Unknown phase2 error";
    console.error(
      JSON.stringify({
        source: "twilio_whatsapp_inbound",
        phase: "phase2_error",
        error: errMsg,
        from,
        messageSid,
      })
    );
    const fallback =
      "Hola, recibimos tu mensaje en Cafecitos ✅ En breve te confirmamos tu regalo de bienvenida.";
    return new NextResponse(twimlMessage(fallback), {
      status: 200,
      headers: { "Content-Type": TWIML_CONTENT_TYPE },
    });
  }

  console.log(
    JSON.stringify({
      source: "twilio_whatsapp_inbound",
      from,
      to,
      body,
      profileName,
      waId,
      messageSid,
      accountSid,
      normalizedPhone: phase2Result.normalizedPhone,
      hasValidPhone: phase2Result.hasValidPhone,
      actionTaken: phase2Result.actionTaken,
      matchedUserId: phase2Result.matchedUserId,
      persistOk: phase2Result.persistOk,
      persistError: phase2Result.persistError,
      lookupSkipped: phase2Result.lookupSkipped,
    })
  );

  if (phase2Result.persistError && !phase2Result.persistOk) {
    const target = supabaseAdminTarget();
    console.error(
      JSON.stringify({
        source: "twilio_whatsapp_inbound",
        phase: "persist_failed",
        error: phase2Result.persistError,
        messageSid,
        // Diagnóstico seguro: confirma a qué proyecto Supabase apunta el runtime.
        supabaseProjectRef: target.projectRef,
        supabaseUrlHost: target.urlHost,
        hasServiceRoleKey: target.hasServiceRoleKey,
      })
    );
  }

  const reply = twimlReplyForAction(
    phase2Result.actionTaken,
    phase2Result.matchedUserName,
    welcomeIntent
  );

  return new NextResponse(twimlMessage(reply), {
    status: 200,
    headers: { "Content-Type": TWIML_CONTENT_TYPE },
  });
}
