import { resend, EMAIL_FROM } from "./index";
import { InviteEmail } from "@/components/emails/invite-email";

export async function sendInviteEmail(params: {
  to: string;
  inviterName: string;
  projectName: string;
  permission: string;
  acceptUrl: string;
}) {
  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to: params.to,
      subject: `${params.inviterName} invited you to "${params.projectName}" on Vibe3D`,
      react: InviteEmail({
        inviterName: params.inviterName,
        projectName: params.projectName,
        permission: params.permission,
        acceptUrl: params.acceptUrl,
      }),
    });
  } catch (err) {
    console.error("[email] Failed to send invite email:", err);
  }
}
