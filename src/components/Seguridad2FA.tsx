"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function Seguridad2FA() {
  const [loading, setLoading] = useState(true);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [pendingFactorId, setPendingFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function loadFactors() {
    const supabase = createClient();
    const { data } = await supabase.auth.mfa.listFactors();
    const verified = data?.totp?.find((f) => f.status === "verified");
    setFactorId(verified?.id ?? null);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadFactors();
  }, []);

  async function handleEnroll() {
    setError(null);
    setMessage(null);
    const supabase = createClient();
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
    if (error || !data) {
      setError(error?.message ?? "No se pudo iniciar el registro.");
      return;
    }
    setPendingFactorId(data.id);
    setQrCode(data.totp.qr_code);
    setSecret(data.totp.secret);
    setEnrolling(true);
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!pendingFactorId) return;
    setError(null);
    const supabase = createClient();
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId: pendingFactorId,
    });
    if (challengeError || !challenge) {
      setError(challengeError?.message ?? "No se pudo verificar.");
      return;
    }
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: pendingFactorId,
      challengeId: challenge.id,
      code,
    });
    if (verifyError) {
      setError("Código incorrecto. Intenta de nuevo.");
      return;
    }
    setEnrolling(false);
    setQrCode(null);
    setSecret(null);
    setPendingFactorId(null);
    setCode("");
    setMessage("2FA activado correctamente.");
    loadFactors();
  }

  async function handleUnenroll() {
    if (!factorId) return;
    if (!confirm("¿Desactivar la verificación en dos pasos?")) return;
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) {
      setError(error.message);
      return;
    }
    setMessage("2FA desactivado.");
    loadFactors();
  }

  async function cancelEnroll() {
    if (pendingFactorId) {
      const supabase = createClient();
      await supabase.auth.mfa.unenroll({ factorId: pendingFactorId });
    }
    setEnrolling(false);
    setQrCode(null);
    setSecret(null);
    setCode("");
    setPendingFactorId(null);
  }

  if (loading) return null;

  return (
    <div className="rounded-lg border border-border bg-surface p-4 max-w-sm flex flex-col gap-3">
      <p className="text-sm font-medium">Verificación en dos pasos (2FA)</p>

      {factorId && !enrolling && (
        <>
          <p className="text-sm text-accent-bright">Activa ✓ — tu cuenta pide código al iniciar sesión.</p>
          <button onClick={handleUnenroll} className="text-danger text-sm self-start">
            Desactivar
          </button>
        </>
      )}

      {!factorId && !enrolling && (
        <>
          <p className="text-xs text-muted">
            Agrega un código de tu app de autenticación (Google Authenticator, Authy) además de tu contraseña.
          </p>
          <button
            onClick={handleEnroll}
            className="rounded-md bg-accent text-accent-foreground text-sm font-medium px-3 py-1.5 self-start"
          >
            Activar 2FA
          </button>
        </>
      )}

      {enrolling && qrCode && (
        <form onSubmit={handleVerify} className="flex flex-col gap-3">
          <p className="text-xs text-muted">Escanea este código con tu app de autenticación:</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrCode} alt="Código QR para 2FA" className="w-40 h-40 self-center bg-white p-2 rounded" />
          {secret && <p className="text-xs text-muted break-all">O ingresa este código manualmente: {secret}</p>}
          <label className="flex flex-col gap-1 text-sm">
            Código de 6 dígitos
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="text-center tracking-[0.5em]"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={code.length !== 6}
              className="rounded-md bg-accent text-accent-foreground text-sm font-medium px-3 py-1.5 disabled:opacity-60"
            >
              Confirmar
            </button>
            <button type="button" onClick={cancelEnroll} className="text-muted text-sm px-3 py-1.5">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}
      {message && <p className="text-sm text-muted">{message}</p>}
    </div>
  );
}
