import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Button,
  Hr,
  Preview,
} from "@react-email/components";

interface InviteEmailProps {
  inviterName: string;
  projectName: string;
  permission: string;
  acceptUrl: string;
}

export function InviteEmail({
  inviterName,
  projectName,
  permission,
  acceptUrl,
}: InviteEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{inviterName} invited you to collaborate on &quot;{projectName}&quot;</Preview>
      <Body style={body}>
        <Container style={container}>
          <Text style={heading}>You&apos;ve been invited!</Text>
          <Text style={paragraph}>
            {inviterName} has invited you to collaborate on the project
            &quot;{projectName}&quot; with <strong>{permission}</strong> access.
          </Text>
          <Section style={buttonContainer}>
            <Button style={button} href={acceptUrl}>
              View Project
            </Button>
          </Section>
          <Hr style={hr} />
          <Text style={footer}>
            Vibe3D — AI-powered 3D creation
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const body = {
  backgroundColor: "#f5f5f3",
  fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
};

const container = {
  margin: "0 auto",
  padding: "40px 24px",
  maxWidth: "480px",
};

const heading = {
  fontSize: "24px",
  fontWeight: "700" as const,
  color: "#171717",
  margin: "0 0 24px",
};

const paragraph = {
  fontSize: "15px",
  lineHeight: "1.6",
  color: "#333",
  margin: "0 0 16px",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "32px 0",
};

const button = {
  backgroundColor: "#171717",
  borderRadius: "8px",
  color: "#fff",
  fontSize: "14px",
  fontWeight: "600" as const,
  padding: "12px 32px",
  textDecoration: "none",
};

const hr = {
  borderColor: "#e5e5e5",
  margin: "32px 0",
};

const footer = {
  fontSize: "12px",
  color: "#999",
};
