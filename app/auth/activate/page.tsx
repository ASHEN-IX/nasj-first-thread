import { ActivateForm } from "@/components/ActivateForm";

export const metadata = {
  title: "Activate Account — NASJ The First Thread",
  description: "Set up your password and complete onboarding for NASJ The First Thread private alpha.",
};

export default function ActivatePage() {
  const platformUrl = process.env.NEXT_PUBLIC_NASJ_PLATFORM_URL || "";
  return (
    <main style={{ minHeight: "100vh", backgroundColor: "#f5f0e6", padding: "40px 16px" }}>
      <ActivateForm platformUrl={platformUrl} />
    </main>
  );
}
