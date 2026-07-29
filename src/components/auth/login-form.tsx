"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithNameAndPasscode } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [passcode, setPasscode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const result = await signInWithNameAndPasscode({ fullName, passcode });
    setPending(false);

    if (result.status === "ok") router.push("/visual-optics");
    else if (result.status === "invalid_passcode") setError("That passcode isn't right.");
    else setError(result.message);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <Label htmlFor="fullName" className="sr-only">
        Your name
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
        Lab passcode
      </Label>
      <Input
        id="passcode"
        type="password"
        required
        placeholder="Lab passcode"
        value={passcode}
        onChange={(e) => setPasscode(e.target.value)}
      />
      <Button type="submit" disabled={pending}>
        {pending ? "Signing in…" : "Continue"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  );
}
