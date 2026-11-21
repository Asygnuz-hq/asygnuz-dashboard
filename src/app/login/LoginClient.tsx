"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { ArrowUpRight, LockSimple, ShieldCheck } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import type { BrandingPortal } from "@/lib/portal/subdominio";
import { AperturaLogo } from "@/components/portal/AperturaLogo";
import {
  BotonTemaPortal,
  PortalThemeProvider,
  usePortalTheme,
} from "@/components/portal/PortalThemeContext";
import { FUENTE_DISPLAY } from "@/lib/portal/fuente";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: { sitekey: string; theme?: "light" | "dark" | "auto"; callback: (token: string) => void }
      ) => string;
    };
  }
}

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export function LoginClient({ branding }: { branding: BrandingPortal | null }) {
  if (branding) {
    return (
      <PortalThemeProvider inicial="light">
        <LoginPortalWhiteLabel branding={branding} />
      </PortalThemeProvider>
    );
  }
  return <LoginDashboardInterno />;
}

function LoginPortalWhiteLabel({ branding }: { branding: BrandingPortal }) {
  const router = useRouter();
  const supabase = createClient();
  const { modo } = usePortalTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");

  const acento = branding.colorAcento || "#C9A45C";

  useEffect(() => {
    async function checkPending() {
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal && aal.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
        const { data: factors } = await supabase.auth.mfa.listFactors();
        const totp = factors?.totp?.find((f) => f.status === "verified");
        if (totp) setFactorId(totp.id);
      }
    }
    checkPending();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function renderTurnstile() {
    if (!TURNSTILE_SITE_KEY || !turnstileRef.current || !window.turnstile) return;
    turnstileRef.current.innerHTML = "";
    window.turnstile.render(turnstileRef.current, {
      sitekey: TURNSTILE_SITE_KEY,
      theme: modo,
      callback: (token: string) => setCaptchaToken(token),
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: captchaToken ? { captchaToken } : undefined,
    });
    if (error) {
      setLoading(false);
      const codigo =
        (error as { code?: string; error_code?: string }).code ??
        (error as { code?: string; error_code?: string }).error_code;
      if (codigo === "captcha_failed" || /captcha/i.test(error.message)) {
        setError("No se pudo verificar el CAPTCHA. Recarga la página e intenta de nuevo.");
      } else if (codigo === "invalid_credentials" || /invalid login credentials/i.test(error.message)) {
        setError("Correo o contraseña incorrectos.");
      } else {
        setError(error.message);
      }
      setCaptchaToken(null);
      renderTurnstile();
      return;
    }

    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    setLoading(false);

    if (aal && aal.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totp = factors?.totp?.find((f) => f.status === "verified");
      if (!totp) {
        setError("Tu cuenta requiere 2FA pero no se encontró el factor. Contacta al administrador.");
        return;
      }
      setFactorId(totp.id);
      return;
    }

    router.push("/portal");
    router.refresh();
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId) return;
    setLoading(true);
    setError(null);

    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
    if (challengeError || !challenge) {
      setLoading(false);
      setError(challengeError?.message ?? "No se pudo iniciar la verificación.");
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code,
    });
    setLoading(false);

    if (verifyError) {
      setError("Código incorrecto. Intenta de nuevo.");
      return;
    }

    router.push("/portal");
    router.refresh();
  }

  return (
    <div
      className="portal-shell relative flex min-h-[100dvh] flex-1 flex-col items-center justify-center overflow-hidden px-5 py-12"
      data-portal-mode={modo}
      style={{ "--portal-accent": acento } as React.CSSProperties}
    >
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />

      {branding.splashHabilitado && (
        <AperturaLogo
          nombre={branding.nombre}
          logoUrl={branding.logoUrl}
          colorAcento={acento}
          tagline={branding.taglinePortal}
          modo={modo}
          claveSesion={`portal-splash-${branding.slug}`}
        />
      )}

      {/* Selector Claro / Oscuro flotante */}
      <div className="fixed right-5 top-5 z-20">
        <BotonTemaPortal />
      </div>

      <div className="relative z-10 flex w-full max-w-[440px] flex-col items-center gap-7">
        {/* Identidad de marca */}
        <div className="flex flex-col items-center gap-3 text-center">
          {branding.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={branding.logoUrl}
              alt={branding.nombre}
              className="max-h-16 sm:max-h-20 w-auto max-w-[270px] object-contain"
            />
          ) : (
            <h1
              className="text-3xl font-semibold tracking-tight"
              style={{ fontFamily: FUENTE_DISPLAY, color: "var(--p-ink)" }}
            >
              {branding.nombre}
            </h1>
          )}
          {branding.taglinePortal && (
            <p className="text-xs tracking-wide max-w-xs" style={{ color: "var(--p-muted)" }}>
              {branding.taglinePortal}
            </p>
          )}
        </div>

        {/* Tarjeta Double-Bezel Liquid Glass */}
        <div className="portal-bezel w-full">
          {factorId ? (
            <form onSubmit={handleVerify} className="portal-bezel-core p-7 sm:p-8 flex flex-col gap-5">
              <div className="flex items-center gap-3">
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border"
                  style={{
                    backgroundColor: "var(--p-accent-bg)",
                    borderColor: "var(--p-accent-border)",
                    color: "var(--p-accent-ink)",
                  }}
                >
                  <ShieldCheck size={20} weight="light" />
                </span>
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--p-ink)" }}>
                    Verificación en dos pasos
                  </p>
                  <p className="text-xs" style={{ color: "var(--p-muted)" }}>
                    Ingresa el código de 6 dígitos de tu autenticador.
                  </p>
                </div>
              </div>

              <label className="flex flex-col gap-1.5 text-xs font-medium" style={{ color: "var(--p-ink-soft)" }}>
                Código de seguridad
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  className="w-full px-4 py-3 text-center text-base tracking-[0.5em]"
                  autoFocus
                />
              </label>

              {error && <p className="text-xs font-medium text-danger">{error}</p>}

              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="portal-cta justify-between w-full disabled:opacity-50 cursor-pointer"
              >
                <span>{loading ? "Verificando..." : "Confirmar acceso"}</span>
                <span
                  className="portal-cta-orb"
                  style={{
                    backgroundColor: modo === "dark" ? "rgba(0,0,0,0.16)" : "rgba(255,255,255,0.14)",
                  }}
                >
                  <ArrowUpRight size={15} weight="bold" />
                </span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="portal-bezel-core p-7 sm:p-8 flex flex-col gap-5">
              <div
                className="flex items-center justify-between border-b pb-4"
                style={{ borderColor: "var(--p-border)" }}
              >
                <div>
                  <p
                    className="text-lg font-semibold tracking-tight"
                    style={{ fontFamily: FUENTE_DISPLAY, color: "var(--p-ink)" }}
                  >
                    Acceso privado
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--p-muted)" }}>
                    Ingresa con las credenciales de tu marca
                  </p>
                </div>
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border"
                  style={{
                    backgroundColor: "var(--p-accent-bg)",
                    borderColor: "var(--p-accent-border)",
                    color: "var(--p-accent-ink)",
                  }}
                >
                  <LockSimple size={18} weight="light" />
                </span>
              </div>

              <label className="flex flex-col gap-1.5 text-xs font-medium" style={{ color: "var(--p-ink-soft)" }}>
                Correo electrónico
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm"
                  autoComplete="email"
                />
              </label>

              <label className="flex flex-col gap-1.5 text-xs font-medium" style={{ color: "var(--p-ink-soft)" }}>
                Contraseña
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm"
                  autoComplete="current-password"
                />
              </label>

              {TURNSTILE_SITE_KEY && (
                <>
                  <Script
                    src="https://challenges.cloudflare.com/turnstile/v0/api.js"
                    onLoad={renderTurnstile}
                  />
                  <div ref={turnstileRef} />
                </>
              )}

              {error && <p className="text-xs font-medium text-danger">{error}</p>}

              <button
                type="submit"
                disabled={loading || (Boolean(TURNSTILE_SITE_KEY) && !captchaToken)}
                className="portal-cta justify-between w-full mt-1 disabled:opacity-50 cursor-pointer"
              >
                <span>{loading ? "Ingresando..." : "Entrar al portal"}</span>
                <span
                  className="portal-cta-orb"
                  style={{
                    backgroundColor: modo === "dark" ? "rgba(0,0,0,0.16)" : "rgba(255,255,255,0.14)",
                    color: modo === "dark" ? "#0B0C10" : acento,
                  }}
                >
                  <ArrowUpRight size={15} weight="bold" />
                </span>
              </button>
            </form>
          )}
        </div>

        <p
          className="text-[11px] uppercase tracking-[0.24em]"
          style={{ color: "var(--p-muted)" }}
        >
          Powered by ASYGNUZ
        </p>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Login estándar del dashboard interno de ASYGNUZ (app.asygnuz.com)
// ------------------------------------------------------------------
function LoginDashboardInterno() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");

  useEffect(() => {
    async function checkPending() {
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal && aal.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
        const { data: factors } = await supabase.auth.mfa.listFactors();
        const totp = factors?.totp?.find((f) => f.status === "verified");
        if (totp) setFactorId(totp.id);
      }
    }
    checkPending();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function renderTurnstile() {
    if (!TURNSTILE_SITE_KEY || !turnstileRef.current || !window.turnstile) return;
    turnstileRef.current.innerHTML = "";
    window.turnstile.render(turnstileRef.current, {
      sitekey: TURNSTILE_SITE_KEY,
      theme: "auto",
      callback: (token: string) => setCaptchaToken(token),
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: captchaToken ? { captchaToken } : undefined,
    });
    if (error) {
      setLoading(false);
      const codigo =
        (error as { code?: string; error_code?: string }).code ??
        (error as { code?: string; error_code?: string }).error_code;
      if (codigo === "captcha_failed" || /captcha/i.test(error.message)) {
        setError("No se pudo verificar el CAPTCHA. Recarga la página e intenta de nuevo.");
      } else if (codigo === "invalid_credentials" || /invalid login credentials/i.test(error.message)) {
        setError("Correo o contraseña incorrectos.");
      } else {
        setError(error.message);
      }
      setCaptchaToken(null);
      renderTurnstile();
      return;
    }

    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    setLoading(false);

    if (aal && aal.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totp = factors?.totp?.find((f) => f.status === "verified");
      if (!totp) {
        setError("Tu cuenta requiere 2FA pero no se encontró el factor. Contacta al administrador.");
        return;
      }
      setFactorId(totp.id);
      return;
    }

    router.push("/");
    router.refresh();
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId) return;
    setLoading(true);
    setError(null);

    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
    if (challengeError || !challenge) {
      setLoading(false);
      setError(challengeError?.message ?? "No se pudo iniciar la verificación.");
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code,
    });
    setLoading(false);

    if (verifyError) {
      setError("Código incorrecto. Intenta de nuevo.");
      return;
    }

    router.push("/");
    router.refresh();
  }

  if (factorId) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-screen px-4">
        <form onSubmit={handleVerify} className="w-full max-w-sm glass rounded-2xl p-8 flex flex-col gap-4">
          <div className="mb-2">
            <p className="text-sm font-medium">Verificación en dos pasos</p>
            <p className="text-sm text-muted">Ingresa el código de tu app de autenticación.</p>
          </div>
          <label className="flex flex-col gap-1 text-sm">
            Código de 6 dígitos
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="w-full text-center tracking-[0.5em]"
              autoFocus
            />
          </label>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="mt-2 rounded-md bg-accent text-accent-foreground font-medium py-2 disabled:opacity-60"
          >
            {loading ? "Verificando..." : "Verificar"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center min-h-screen px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm glass rounded-2xl p-8 flex flex-col gap-4">
        <div className="mb-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Asygnuz"
            className="h-9 w-auto mb-2"
            style={{ filter: "var(--logo-filter)" }}
          />
          <p className="text-sm text-muted">Ingresa a tu dashboard</p>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          Correo
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full"
            autoComplete="email"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Contraseña
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full"
            autoComplete="current-password"
          />
        </label>

        {TURNSTILE_SITE_KEY && (
          <>
            <Script
              src="https://challenges.cloudflare.com/turnstile/v0/api.js"
              onLoad={renderTurnstile}
            />
            <div ref={turnstileRef} />
          </>
        )}

        {error && <p className="text-sm text-danger">{error}</p>}

        <button
          type="submit"
          disabled={loading || (Boolean(TURNSTILE_SITE_KEY) && !captchaToken)}
          className="mt-2 rounded-md bg-accent text-accent-foreground font-medium py-2 disabled:opacity-60"
        >
          {loading ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
    </div>
  );
}
