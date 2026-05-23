"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { PrimaryButton } from "@/components/ui/PrimaryButton";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "로그인 실패");
        setShake(true);
        setTimeout(() => setShake(false), 400);
        return;
      }

      router.push("/");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
      <div className={`max-w-sm w-full ${shake ? "animate-shake" : ""}`}>
        <div className="text-center mb-8">
          <div className="text-5xl mb-2">📝</div>
          <h1 className="text-3xl font-bold">블로그 작성기</h1>
          <p className="text-stone-600 mt-2 text-sm">비밀번호를 입력해주세요</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="password"
            placeholder="비밀번호"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={!!error}
            autoFocus
          />
          {error && (
            <p role="alert" aria-live="polite" className="text-sm text-red-600">
              {error}
            </p>
          )}
          <PrimaryButton type="submit" size="lg" fullWidth loading={loading} disabled={!password}>
            들어가기
          </PrimaryButton>
        </form>
      </div>
    </main>
  );
}
