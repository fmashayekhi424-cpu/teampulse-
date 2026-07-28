import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">TeamPulse</CardTitle>
          <CardDescription>Visual Optics Lab — see where everyone is.</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm initialError={error} />
        </CardContent>
      </Card>
    </div>
  );
}
