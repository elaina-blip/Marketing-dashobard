"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const signIn = async () => {
    setErr(""); setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) {
      setLoading(false);
      setErr(error.message);
      return;
    }
    // Password sign-in resolves immediately — go straight into the app.
    router.push("/");
    router.refresh();
  };

  return (
    <div style={S.wrap}>
      <div style={S.card}>
        <div style={S.mark}>M</div>
        <h1 style={S.h1}>Marketing Command Center</h1>
        <p style={S.sub}>Sign in with your work email. Access is limited to the team.</p>

        <input
          style={S.input} type="email" placeholder="you@company.com"
          value={email} onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === "Enter" && signIn()}
          autoComplete="email"
        />
        <input
          style={S.input} type="password" placeholder="Password"
          value={password} onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === "Enter" && signIn()}
          autoComplete="current-password"
        />
        <button style={S.btn} onClick={signIn} disabled={loading || !email || !password}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
        {err && <div style={S.err}>{err}</div>}
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  wrap: { minHeight: "100vh", display: "grid", placeItems: "center", background: "#101725",
    fontFamily: "ui-sans-serif, system-ui, sans-serif" },
  card: { width: 360, background: "#fff", borderRadius: 16, padding: 32, textAlign: "center",
    boxShadow: "0 20px 60px rgba(0,0,0,.35)" },
  mark: { width: 46, height: 46, borderRadius: 13, background: "linear-gradient(135deg,#F47B27,#E0564B)",
    display: "grid", placeItems: "center", fontWeight: 800, fontSize: 22, color: "#fff", margin: "0 auto 16px" },
  h1: { fontSize: 20, fontWeight: 700, margin: "0 0 6px", color: "#1d2433" },
  sub: { fontSize: 13.5, color: "#6b7587", margin: "0 0 22px", lineHeight: 1.5 },
  input: { width: "100%", padding: "11px 13px", border: "1px solid #dfe4ec", borderRadius: 10,
    fontSize: 14, marginBottom: 10, boxSizing: "border-box" },
  btn: { width: "100%", padding: "11px", background: "#F47B27", color: "#fff", border: "none",
    borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" },
  err: { marginTop: 12, color: "#E0564B", fontSize: 13 },
};
