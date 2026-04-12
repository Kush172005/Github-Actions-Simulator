import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext.jsx";
import { postGitHubCode } from "../lib/api.js";

const redirectUri =
  import.meta.env.VITE_GITHUB_REDIRECT_URI ||
  `${typeof window !== "undefined" ? window.location.origin : ""}/auth/callback/github`;

/** OAuth `code` is single-use. React Strict Mode runs effects twice — guard duplicate POSTs. */
const githubCodeInFlight = new Set();

export default function GitHubCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithJwt } = useAuth();
  const [error, setError] = useState(null);

  useEffect(() => {
    const code = params.get("code");
    const err = params.get("error");
    if (err) {
      setError(params.get("error_description") || err);
      return;
    }
    if (!code) {
      setError("Missing OAuth code");
      return;
    }

    if (githubCodeInFlight.has(code)) {
      return;
    }
    githubCodeInFlight.add(code);

    (async () => {
      try {
        const { access_token } = await postGitHubCode(code, redirectUri);
        await loginWithJwt(access_token);
        navigate("/dashboard", { replace: true });
      } catch (e) {
        setError(e.message || "GitHub sign-in failed");
      } finally {
        githubCodeInFlight.delete(code);
      }
    })();
  }, [params, loginWithJwt, navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#09090b] px-4 text-zinc-100">
      {error ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md text-center"
        >
          <p className="text-sm text-red-300">{error}</p>
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="mt-4 text-sm text-emerald-400 underline-offset-4 hover:underline"
          >
            Back to sign in
          </button>
        </motion.div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <span className="h-10 w-10 rounded-full border-2 border-emerald-400/30 border-t-emerald-400 animate-spin" />
          <p className="text-sm font-medium text-emerald-400/90">Authenticating...</p>
        </div>
      )}
    </div>
  );
}
