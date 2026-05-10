import { Resend } from "resend";

const LOCKOUT_MINUTES = 30;
const ALERT_TO = "asriidev@gmail.com";

export async function sendFailedLoginLockoutAlert(input: { userEmail: string; reason: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY is not set; skipping failed-login alert email.");
    return;
  }

  const from = process.env.RESEND_FROM_EMAIL?.trim() || "LifeTrack Security <onboarding@resend.dev>";
  const resend = new Resend(apiKey);

  await resend.emails.send({
    from,
    to: ALERT_TO,
    subject: "LifeTrack security alert: account temporarily locked",
    text: [
      "A LifeTrack account reached 3 failed password attempts and has been locked.",
      "",
      `Account email: ${input.userEmail}`,
      `Lock duration: ${LOCKOUT_MINUTES} minutes`,
      `Source: ${input.reason}`,
      `Time (UTC): ${new Date().toISOString()}`,
    ].join("\n"),
  });
}
