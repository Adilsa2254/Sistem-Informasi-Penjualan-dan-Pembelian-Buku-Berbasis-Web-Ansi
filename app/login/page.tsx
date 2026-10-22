"use client";

import { FormEvent, useState } from "react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Login gagal");
      }

      window.location.href = data.role === "pelanggan" ? "/" : "/kasir";
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Login gagal");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <a className="login-back" href="/">
        ← Kembali ke beranda
      </a>
      <section className="login-card" aria-labelledby="login-title">
        <p className="section-kicker">Akses akun</p>
        <h1 id="login-title">Selamat datang kembali.</h1>
        <p className="login-description">
          Masuk sebagai pelanggan atau admin untuk melanjutkan.
        </p>
        <form className="login-form" onSubmit={submit}>
          <label>
            Username
            <input
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
            />
          </label>
          <label>
            Password
            <input
              autoComplete="current-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          {error && <p className="login-error">{error}</p>}
          <button className="login-submit" disabled={loading} type="submit">
            {loading ? "Memproses..." : "Masuk"}
          </button>
        </form>
      </section>
    </main>
  );
}
