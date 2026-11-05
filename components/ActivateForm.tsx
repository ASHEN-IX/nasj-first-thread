"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Brand } from "@/components/Brand";

interface TokenStatus {
  state: "loading" | "valid" | "expired" | "already_used" | "revoked" | "invalid" | "missing";
  email?: string;
  message?: string;
}

export function ActivateForm({ platformUrl }: { platformUrl?: string }) {
  const [token, setToken] = useState<string>("");
  const [tokenStatus, setTokenStatus] = useState<TokenStatus>({ state: "loading" });
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const loginUrl = platformUrl ? `${platformUrl}/auth/login` : "/auth/login";

  // 1. Extract token from URL (searchParams or hash)
  useEffect(() => {
    const url = new URL(window.location.href);
    const searchToken = url.searchParams.get("token");
    const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
    const hashToken = hashParams.get("token");
    const resolvedToken = (searchToken || hashToken || "").trim();

    if (!resolvedToken) {
      setTokenStatus({
        state: "missing",
        message: "No activation token was provided. Please open the link sent to your email.",
      });
      return;
    }

    setToken(resolvedToken);

    // 2. Perform GET validation (MUST NOT consume token)
    fetch(`/api/auth/activate?token=${encodeURIComponent(resolvedToken)}`, {
      method: "GET",
      headers: { "Cache-Control": "no-store" },
    })
      .then(async (res) => {
        const data = await res.json();
        if (res.ok && data.ok) {
          setTokenStatus({
            state: "valid",
            email: data.email,
          });
        } else {
          setTokenStatus({
            state: data.error || "invalid",
            message: data.message || "Invalid activation link.",
          });
        }
      })
      .catch(() => {
        setTokenStatus({
          state: "invalid",
          message: "Unable to verify activation link. Please check your network connection.",
        });
      });
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    if (password.length < 12) {
      setSubmitError("Password must be at least 12 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setSubmitError("Passwords do not match. Please re-enter.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/auth/activate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, password }),
        });

        const data = await res.json();
        if (res.ok && data.ok) {
          setSubmitSuccess(true);
        } else {
          setSubmitError(data.message || "Activation failed. Please try again.");
          if (["expired", "already_used", "revoked", "invalid"].includes(data.error)) {
            setTokenStatus({ state: data.error, message: data.message });
          }
        }
      } catch {
        setSubmitError("Network error while submitting activation. Please try again.");
      }
    });
  }

  return (
    <div style={{ maxWidth: "480px", margin: "40px auto", padding: "0 20px" }}>
      <div style={{ textAlign: "center", marginBottom: "32px" }}>
        <Brand light={false} />
      </div>

      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          padding: "36px 32px",
          boxShadow: "0 8px 30px rgba(36, 76, 58, 0.08)",
          border: "1px solid #e7ded0",
        }}
      >
        <h1 style={{ margin: "0 0 8px 0", fontSize: "24px", color: "#244c3a", fontWeight: 700 }}>
          {submitSuccess ? "Account Activated!" : "Activate Your Account"}
        </h1>
        <p style={{ margin: "0 0 24px 0", fontSize: "14px", color: "#6b6f6a", lineHeight: 1.5 }}>
          {submitSuccess
            ? "Your password has been securely configured in the NASJ platform."
            : "Complete your alpha onboarding by choosing a strong password."}
        </p>

        {tokenStatus.state === "loading" && (
          <div style={{ padding: "30px 0", textAlign: "center", color: "#6b6f6a" }}>
            Verifying activation link...
          </div>
        )}

        {tokenStatus.state !== "loading" && tokenStatus.state !== "valid" && !submitSuccess && (
          <div>
            <div
              style={{
                backgroundColor: tokenStatus.state === "already_used" ? "#f2f7f4" : "#fdf4f4",
                borderLeft: `4px solid ${tokenStatus.state === "already_used" ? "#244c3a" : "#dc2626"}`,
                padding: "16px",
                borderRadius: "4px",
                marginBottom: "24px",
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: "14px",
                  color: tokenStatus.state === "already_used" ? "#244c3a" : "#991b1b",
                  fontWeight: 600,
                }}
              >
                {tokenStatus.state === "already_used"
                  ? "Invitation Already Used"
                  : tokenStatus.state === "expired"
                  ? "Activation Link Expired"
                  : tokenStatus.state === "revoked"
                  ? "Invitation Revoked"
                  : "Invalid Activation Link"}
              </p>
              <p style={{ margin: "6px 0 0 0", fontSize: "13px", color: "#4b5563", lineHeight: 1.5 }}>
                {tokenStatus.message}
              </p>
            </div>

            <div style={{ textAlign: "center", marginTop: "24px" }}>
              <a
                href={loginUrl}
                style={{
                  display: "inline-block",
                  backgroundColor: "#244c3a",
                  color: "#f5f0e6",
                  fontWeight: 700,
                  padding: "12px 24px",
                  borderRadius: "999px",
                  textDecoration: "none",
                  fontSize: "14px",
                }}
              >
                Go to Sign In
              </a>
            </div>
          </div>
        )}

        {submitSuccess && (
          <div>
            <div
              style={{
                backgroundColor: "#f2f7f4",
                borderLeft: "4px solid #244c3a",
                padding: "16px",
                borderRadius: "4px",
                marginBottom: "24px",
              }}
            >
              <p style={{ margin: 0, fontSize: "14px", color: "#244c3a", fontWeight: 600 }}>
                Activation Successful
              </p>
              <p style={{ margin: "6px 0 0 0", fontSize: "13px", color: "#4b5563", lineHeight: 1.5 }}>
                You can now log in to the NASJ platform with your registered email (<strong>{tokenStatus.email}</strong>) and your new password.
              </p>
            </div>

            <div style={{ textAlign: "center", marginTop: "28px" }}>
              <a
                href={loginUrl}
                style={{
                  display: "inline-block",
                  backgroundColor: "#244c3a",
                  color: "#f5f0e6",
                  fontWeight: 700,
                  padding: "14px 32px",
                  borderRadius: "999px",
                  textDecoration: "none",
                  fontSize: "15px",
                }}
              >
                Sign In to NASJ Platform
              </a>
            </div>
          </div>
        )}

        {tokenStatus.state === "valid" && !submitSuccess && (
          <form onSubmit={handleSubmit}>
            {submitError && (
              <div
                style={{
                  backgroundColor: "#fdf4f4",
                  borderLeft: "4px solid #dc2626",
                  padding: "12px 16px",
                  borderRadius: "4px",
                  marginBottom: "20px",
                  fontSize: "13px",
                  color: "#991b1b",
                }}
              >
                {submitError}
              </div>
            )}

            <div style={{ marginBottom: "18px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  color: "#6b6f6a",
                  marginBottom: "6px",
                }}
              >
                Registered Email Address
              </label>
              <input
                type="email"
                value={tokenStatus.email || ""}
                disabled
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  backgroundColor: "#f3f4f6",
                  color: "#374151",
                  fontSize: "14px",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ marginBottom: "18px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  color: "#292d29",
                  marginBottom: "6px",
                }}
              >
                Create Password
              </label>
              <input
                type="password"
                required
                minLength={12}
                maxLength={128}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 12 characters"
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  fontSize: "14px",
                  boxSizing: "border-box",
                }}
              />
              <span style={{ display: "block", fontSize: "12px", color: "#6b6f6a", marginTop: "4px" }}>
                Must be at least 12 characters.
              </span>
            </div>

            <div style={{ marginBottom: "26px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  color: "#292d29",
                  marginBottom: "6px",
                }}
              >
                Confirm Password
              </label>
              <input
                type="password"
                required
                minLength={12}
                maxLength={128}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  fontSize: "14px",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              style={{
                width: "100%",
                backgroundColor: "#244c3a",
                color: "#f5f0e6",
                fontWeight: 700,
                padding: "14px",
                borderRadius: "999px",
                border: "none",
                fontSize: "15px",
                cursor: isPending ? "not-allowed" : "pointer",
                opacity: isPending ? 0.7 : 1,
              }}
            >
              {isPending ? "Activating Account..." : "Set Password & Activate"}
            </button>
          </form>
        )}
      </div>

      <div style={{ textAlign: "center", marginTop: "24px", fontSize: "13px", color: "#6b6f6a" }}>
        Already have an activated account?{" "}
        <a href={loginUrl} style={{ color: "#244c3a", fontWeight: 600, textDecoration: "underline" }}>
          Sign in
        </a>
      </div>
    </div>
  );
}
