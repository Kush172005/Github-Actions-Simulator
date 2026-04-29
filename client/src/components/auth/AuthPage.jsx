import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { OAuthButton } from "./OAuthButton.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { postGoogleCredential } from "../../lib/api.js";

const redirectUri =
  import.meta.env.VITE_GITHUB_REDIRECT_URI ||
  `${window.location.origin}/auth/callback/github`;

const ghClientId = import.meta.env.VITE_GITHUB_CLIENT_ID;

export function AuthPage() {
  const navigate = useNavigate();
  const { loginWithJwt, isAuthenticated } = useAuth();
  const [authBusy, setAuthBusy] = useState(false);
  const [error, setError] = useState(null);
  const googleDivRef = useRef(null);
  const googleReady = useRef(false);

  useEffect(() => {
    if (isAuthenticated) navigate("/dashboard", { replace: true });
  }, [isAuthenticated, navigate]);

  const handleCredential = useCallback(
    async (credential) => {
      if (!credential) return;
      setError(null);
      setAuthBusy(true);
      try {
        const { access_token } = await postGoogleCredential(credential);
        await loginWithJwt(access_token);
        navigate("/dashboard", { replace: true });
      } catch (e) {
        setError(e.message || "Google sign-in failed");
      } finally {
        setAuthBusy(false);
      }
    },
    [loginWithJwt, navigate],
  );

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) return;

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 60;

    const timer = window.setInterval(() => {
      if (cancelled || googleReady.current) {
        window.clearInterval(timer);
        return;
      }
      attempts += 1;
      if (attempts >= maxAttempts) {
        window.clearInterval(timer);
        return;
      }
      if (!googleDivRef.current || !window.google?.accounts?.id) return;
      googleReady.current = true;
      window.clearInterval(timer);
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (res) => handleCredential(res.credential),
        auto_select: false,
        cancel_on_tap_outside: true,
      });
      window.google.accounts.id.renderButton(googleDivRef.current, {
        type: "standard",
        theme: "filled_black",
        size: "large",
        text: "continue_with",
        width: 320,
        logo_alignment: "left",
      });
    }, 100);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [handleCredential]);

  const startGitHub = () => {
    if (!ghClientId) {
      setError("GitHub OAuth is not configured (VITE_GITHUB_CLIENT_ID).");
      return;
    }
    setError(null);
    const params = new URLSearchParams({
      client_id: ghClientId,
      redirect_uri: redirectUri,
      scope: "repo read:user user:email",
      allow_signup: "true",
    });
    window.location.href = `https://github.com/login/oauth/authorize?${params.toString()}`;
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#09090b] text-zinc-100">
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute -left-1/4 top-0 h-[600px] w-[600px] rounded-full opacity-40"
          style={{
            background:
              "radial-gradient(circle at center, rgba(52,211,153,0.35), transparent 65%)",
            filter: "blur(40px)",
          }}
        />
        <div
          className="absolute -right-1/4 bottom-0 h-[500px] w-[500px] rounded-full opacity-35"
          style={{
            background:
              "radial-gradient(circle at center, rgba(59,130,246,0.3), transparent 65%)",
            filter: "blur(48px)",
          }}
        />
        <div className="absolute inset-0 bg-dot-grid opacity-30" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md"
        >
          <div className="mb-10 text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.05, duration: 0.45 }}
              className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900/60 ring-1 ring-emerald-400/20 shadow-lg shadow-emerald-500/20"
            >
              <img
                src="/vite.svg"
                alt="ShipStack logo"
                className="h-8 w-8 object-contain drop-shadow-[0_0_10px_rgba(52,211,153,0.35)]"
              />
            </motion.div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Welcome to ShipStack
            </h1>
            <p className="mt-2 text-sm text-zinc-500">
              Sign in to connect GitHub and open your execution dashboard.
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.45 }}
            className="glass-card rounded-2xl border border-white/[0.06] p-8 shadow-2xl shadow-black/50"
            style={{
              background: "rgba(24, 24, 27, 0.72)",
              backdropFilter: "blur(24px) saturate(160%)",
            }}
          >
            {authBusy && (
              <div className="mb-6 flex flex-col items-center justify-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 py-8">
                <span className="h-8 w-8 shrink-0 rounded-full border-2 border-emerald-400/30 border-t-emerald-400 animate-spin" />
                <p className="text-sm font-medium text-emerald-400/90">
                  Authenticating...
                </p>
              </div>
            )}

            {!authBusy && (
              <div className="space-y-4">
                <div className="flex min-h-[48px] w-full justify-center [&>div]:!w-full">
                  <div
                    ref={googleDivRef}
                    className="flex w-full justify-center"
                  />
                </div>

                <div className="relative py-2">
                  <div className="absolute inset-x-0 top-1/2 border-t border-white/[0.06]" />
                  <span className="relative mx-auto block w-fit bg-[rgba(24,24,27,0.95)] px-3 text-[10px] font-medium uppercase tracking-widest text-zinc-600">
                    or
                  </span>
                </div>

                <OAuthButton
                  provider="github"
                  onClick={startGitHub}
                  disabled={authBusy}
                  loading={false}
                >
                  Continue with GitHub
                </OAuthButton>
              </div>
            )}

            {error && (
              <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-center text-xs text-red-300">
                {error}
              </p>
            )}

            <p className="mt-6 text-center text-[11px] leading-relaxed text-zinc-600">
              By continuing you agree to our terms and acknowledge the
              connection between ShipStack and your GitHub repositories for CI
              visibility.
            </p>
          </motion.div>

          <p className="mt-8 text-center text-xs text-zinc-600">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="text-zinc-400 underline-offset-4 transition-colors hover:text-zinc-200 hover:underline"
            >
              ← Back to home
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
