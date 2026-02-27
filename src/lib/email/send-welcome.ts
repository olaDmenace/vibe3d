import { resend, EMAIL_FROM } from "./index";
import { WelcomeEmail } from "@/components/emails/welcome-email";

export async function sendWelcomeEmail(params: {
  to: string;
  userName: string;
  dashboardUrl: string;
}) {
  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to: params.to,
      subject: "Welcome to Vibe3D!",
      react: WelcomeEmail({
        userName: params.userName,
        dashboardUrl: params.dashboardUrl,
      }),
    });
  } catch (err) {
    console.error("[email] Failed to send welcome email:", err);
  }
}
