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

interface WelcomeEmailProps {
  userName: string;
  dashboardUrl: string;
}

export function WelcomeEmail({ userName, dashboardUrl }: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Welcome to Vibe3D — Start creating in 3D</Preview>
      <Body style={body}>
        <Container style={container}>
          <Text style={heading}>Welcome to Vibe3D</Text>
          <Text style={paragraph}>Hi {userName},</Text>
          <Text style={paragraph}>
            Thanks for signing up! You can now create stunning 3D models using
            AI — no modeling experience required.
          </Text>
          <Section style={buttonContainer}>
            <Button style={button} href={dashboardUrl}>
              Open Dashboard
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
