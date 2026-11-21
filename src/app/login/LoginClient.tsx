"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { ArrowRight, LockSimple, ShieldCheck } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { colorTextoSobreAcento, type BrandingPortal } from "@/lib/portal/subdominio";
import { AperturaLogo } from "@/components/portal/AperturaLogo";
import { FUENTE_DISPLAY } from "@/lib/portal/fuente";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: { sitekey: string; callback: (token: string) => void }
      ) => string;
    };
  }
}

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export function LoginClient({ branding }: { branding: BrandingPortal | null }) {
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

    router.push(branding ? "/portal" : "/");
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

    router.push(branding ? "/portal" : "/");
    router.refresh();
  }

  // ------------------------------------------------------------------
  // Portal exclusivo white-label por subdominio (ej. lumia.asygnuz.com)
  // ------------------------------------------------------------------
  if (branding) {
    const acento = branding.colorAcento || "#C9A45C";
    const textoBoton = colorTextoSobreAcento(acento);

    return (
      <div
        className="relative flex min-h-[100dvh] flex-1 flex-col items-center justify-center overflow-hidden px-5 py-10"
        style={{
          backgroundColor: "#060608",
          backgroundImage: `radial-gradient(680px circle at 50% 0%, color-mix(in srgb, ${acento} 18%, transparent), transparent 62%), radial-gradient(480px circle at 85% 92%, color-mix(in srgb, ${acento} 10%, transparent), transparent 65%)`,
          color: "#F4F3EF",
        }}
      >
        {branding.splashHabilitado && (
          <AperturaLogo
            nombre={branding.nombre}
            logoUrl={branding.logoUrl}
            colorAcento={acento}
            tagline={branding.taglinePortal}
            claveSesion={`portal-splash-${branding.slug}`}
          />
        )}

        <div className="relative z-10 flex w-full max-w-[400px] flex-col items-center gap-8">
          {/* Marca del cliente */}
          <div className="flex flex-col items-center gap-3 text-center">
            {branding.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={branding.logoUrl}
                alt={branding.nombre}
                className="max-h-16 w-auto max-w-[260px] object-contain"
              />
            ) : (
              <h1 className="text-3xl font-semibold tracking-tight" style={{ fontFamily: FUENTE_DISPLAY }}>
                {branding.nombre}
              </h1>
            )}
            {branding.taglinePortal && (
              <p className="text-xs text-white/55 tracking-wide max-w-xs">{branding.taglinePortal}</p>
            )}
          </div>

          {factorId ? (
            <form
              onSubmit={handleVerify}
              className="portal-card w-full rounded-2xl p-7 flex flex-col gap-5"
              style={{ borderColor: `color-mix(in srgb, ${acento} 24%, rgba(255,255,255,0.08))` }}
            >
              <div className="flex items-center gap-2.5">
                <ShieldCheck size={20} weight="light" style={{ color: acento }} />
                <div>
                  <p className="text-sm font-medium text-white">Verificación en dos pasos</p>
                  <p className="text-xs text-white/55">Ingresa el código de 6 dígitos de tu autenticador.</p>
                </div>
              </div>
              <label className="flex flex-col gap-2 text-xs text-white/75">
                Código de seguridad
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  className="w-full rounded-lg px-3 py-2.5 text-center text-base tracking-[0.5em]"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.04)",
                    borderColor: "rgba(255,255,255,0.12)",
                    color: "#FFFFFF",
                  }}
                  autoFocus
                />
              </label>
              {error && <p className="text-xs text-red-400">{error}</p>}
              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-transform active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                style={{ backgroundColor: acento, color: textoBoton }}
              >
                {loading ? "Verificando..." : "Confirmar acceso"}
              </button>
            </form>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="portal-card w-full rounded-2xl p-7 flex flex-col gap-5"
              style={{ borderColor: `color-mix(in srgb, ${acento} 24%, rgba(255,255,255,0.08))` }}
            >
              <div className="flex items-center justify-between border-b border-white/8 pb-4">
                <div>
                  <p className="text-base font-medium text-white" style={{ fontFamily: FUENTE_DISPLAY }}>
                    Acceso privado
                  </p>
                  <p className="text-xs text-white/50 mt-0.5">Ingresa tus credenciales de cliente</p>
                </div>
                <LockSimple size={18} weight="light" style={{ color: acento }} />
              </div>

              <label className="flex flex-col gap-1.5 text-xs text-white/75">
                Correo electrónico
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg px-3.5 py-2.5 text-sm"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.04)",
                    borderColor: "rgba(255,255,255,0.12)",
                    color: "#FFFFFF",
                  }}
                  autoComplete="email"
                />
              </label>

              <label className="flex flex-col gap-1.5 text-xs text-white/75">
                Contraseña
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg px-3.5 py-2.5 text-sm"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.04)",
                    borderColor: "rgba(255,255,255,0.12)",
                    color: "#FFFFFF",
                  }}
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

              {error && <p className="text-xs text-red-400">{error}</p>}

              <button
                type="submit"
                disabled={loading || (Boolean(TURNSTILE_SITE_KEY) && !captchaToken)}
                className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-transform active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                style={{ backgroundColor: acento, color: textoBoton }}
              >
                <span>{loading ? "Ingresando..." : "Entrar al portal"}</span>
                {!loading && <ArrowRight size={16} weight="bold" />}
              </button>
            </form>
          )}

          <p className="text-[11px] uppercase tracking-[0.22em] text-white/30">
            Powered by ASYGNUZ
          </p>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // Login estándar del dashboard interno de ASYGNUZ (app.asygnuz.com)
  // ------------------------------------------------------------------
  if (factorId) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-screen px-4">
        <form
          onSubmit={handleVerify}
          className="w-full max-w-sm glass rounded-2xl p-8 flex flex-col gap-4"
        >
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
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm glass rounded-2xl p-8 flex flex-col gap-4"
      >
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
