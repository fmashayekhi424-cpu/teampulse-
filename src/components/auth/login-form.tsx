"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { requestLoginCode } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Step = "email" | "new-member" | "code";

export function LoginForm({ initialError }: { initialError?: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [passcode, setPasscode] = useState("");
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const result = await requestLoginCode({ email });
    setPending(false);

    if (result.status === "sent") setStep("code");
    else if (result.status === "new_member_required") setStep("new-member");
    else if (result.status === "error") setError(result.message);
  }

  async function handleNewMemberSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const result = await requestLoginCode({ email, fullName, passcode });
    setPending(false);

    if (result.status === "sent") setStep("code");
    else if (result.status === "invalid_passcode") setError("That invite passcode isn't right.");
    else if (result.status === "error") setError(result.message);
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
    setPending(false);
    if (error) setError(error.message);
    else router.push("/visual-optics");
  }

  if (step === "code") {
    return (
      <form onSubmit={handleVerifyCode} className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          Enter the 6-digit code sent to{" "}
          <span className="font-medium text-foreground">{email}</span>
        </p>
        <Label htmlFor="code" className="sr-only">
          Code
        </Label>
        <Input
          id="code"
          inputMode="numeric"
          autoFocus
          required
          placeholder="123456"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <Button type="submit" disabled={pending}>
          {pending ? "Verifying…" : "Verify code"}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </form>
    );
  }

  if (step === "new-member") {
    return (
      <form onSubmit={handleNewMemberSubmit} className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          Haven&apos;t seen <span className="font-medium text-foreground">{email}</span> before —
          enter your name and the lab&apos;s invite passcode to join.
        </p>
        <Label htmlFor="fullName" className="sr-only">
          Full name
        </Label>
        <Input
          id="fullName"
          required
          autoFocus
          placeholder="Your name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
        <Label htmlFor="passcode" className="sr-only">
          Invite passcode
        </Label>
        <Input
          id="passcode"
          type="password"
          required
          placeholder="Invite passcode"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
        />
        <Button type="submit" disabled={pending}>
          {pending ? "Joining…" : "Join Visual Optics"}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </form>
    );
  }

  return (
    <form onSubmit={handleEmailSubmit} className="flex flex-col gap-3">
      <Label htmlFor="email" className="sr-only">
        Email
      </Label>
      <Input
        id="email"
        type="email"
        required
        placeholder="you@university.edu"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Button type="submit" disabled={pending}>
        {pending ? "Checking…" : "Continue"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  );
}
