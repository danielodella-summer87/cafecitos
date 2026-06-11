import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { normalizeUyMobilePhone } from "@/lib/phone/uy";
import { TWIML_CONTENT_TYPE, twimlMessage } from "@/lib/twilio/twiml";

const ACK_VALID_PHONE =
  "Hola, recibimos tu mensaje en Cafecitos ✅ En breve te confirmamos tu regalo de bienvenida.";

const ACK_INVALID_PHONE =
  "Recibimos tu mensaje, pero no pudimos validar el número de WhatsApp. Por favor escribinos desde el teléfono registrado en Cafecitos.";

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

  const normalizedPhone =
    normalizeUyMobilePhone(from) ?? normalizeUyMobilePhone(waId);
  const hasValidPhone = normalizedPhone !== null;

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
      normalizedPhone,
      hasValidPhone,
    })
  );

  const reply = hasValidPhone ? ACK_VALID_PHONE : ACK_INVALID_PHONE;

  return new NextResponse(twimlMessage(reply), {
    status: 200,
    headers: { "Content-Type": TWIML_CONTENT_TYPE },
  });
}
