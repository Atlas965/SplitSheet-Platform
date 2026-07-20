/**
 * server/verification/sms-provider.ts — Priority 3.2 Twilio SMS adapter.
 */
export interface SmsSendResult {
  sent: boolean;
  sid?: string;
  mode: "twilio" | "unavailable";
  error?: string;
}

export function isTwilioConfigured(): boolean {
  return !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_FROM_NUMBER
  );
}

export async function sendSms(to: string, body: string): Promise<SmsSendResult> {
  if (!isTwilioConfigured()) {
    return { sent: false, mode: "unavailable", error: "Twilio env vars not configured" };
  }

  try {
    // Dynamic import so the package is optional until installed
    const twilio = (await import("twilio")).default;
    const client = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);
    const msg = await client.messages.create({
      to,
      from: process.env.TWILIO_FROM_NUMBER!,
      body,
    });
    return { sent: true, sid: msg.sid, mode: "twilio" };
  } catch (err: any) {
    console.error("[SMS PROVIDER]", err);
    return { sent: false, mode: "unavailable", error: err?.message ?? "SMS send failed" };
  }
}
