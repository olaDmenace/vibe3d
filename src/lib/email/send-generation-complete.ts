import { resend, EMAIL_FROM } from "./index";
import { GenerationCompleteEmail } from "@/components/emails/generation-complete-email";

export async function sendGenerationCompleteEmail(params: {
  to: string;
  userName: string;
  prompt: string;
  projectUrl: string;
}) {
  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to: params.to,
      subject: `Your 3D model is ready — "${params.prompt}"`,
      react: GenerationCompleteEmail({
        userName: params.userName,
        prompt: params.prompt,
        projectUrl: params.projectUrl,
      }),
    });
  } catch (err) {
    console.error("[email] Failed to send generation complete email:", err);
  }
}
