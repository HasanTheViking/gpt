import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import ListsPage from "./pages/ListsPage";
import ListDetailPage from "./pages/ListDetailPage";
import api, { setAuthToken } from "./api";
import "./index.css";

type User = { id: string; email: string };

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const isAuthed = useMemo(() => !!token && !!user, [token, user]);

  useEffect(() => {
    const t = localStorage.getItem("token");

    if (!t) {
      setAuthToken(undefined);
      setToken(null);
      setUser(null);
      setLoading(false);
      return;
    }

    setAuthToken(t);
    setToken(t);

    api
      .get("/auth/me")
      .then((res) => setUser(res.data))
      .catch(() => {
        localStorage.removeItem("token");
        setAuthToken(undefined);
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleAuth = async (mode: "login" | "register", email: string, password: string) => {
    setAuthError(null);
    try {
      const res = await api.post(`/auth/${mode}`, { email, password });
      const newToken = res.data.token as string;

      localStorage.setItem("token", newToken);
      setAuthToken(newToken);

      setToken(newToken);
      setUser(res.data.user);
    } catch (error: any) {
      setAuthError(error?.response?.data?.message ?? "Unable to authenticate");
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setAuthToken(undefined);
    setToken(null);
    setUser(null);
    window.location.href = "/";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-600">Loading…</div>
      </div>
    );
  }

  if (!isAuthed) {
    return <AuthScreen onAuth={handleAuth} error={authError} />;
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50">
        <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-slate-200">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
            <Link to="/" className="flex items-center gap-2 font-semibold text-slate-900">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white">
                🛒
              </span>
              <span className="text-base">Smart Shopping List</span>
            </Link>

            <div className="flex items-center gap-2">
              <div className="hidden sm:block text-sm text-slate-600">{user!.email}</div>
              <button
                onClick={logout}
                className="inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-medium bg-slate-900 text-white hover:bg-slate-800 active:scale-[0.99]"
              >
                Log out
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 py-5">
          <Routes>
            <Route path="/" element={<ListsPage />} />
            <Route path="/lists/:id" element={<ListDetailPage />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

function AuthScreen({
  onAuth,
  error
}: {
  onAuth: (mode: "login" | "register", email: string, password: string) => void;
  error: string | null;
}) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email || !password || busy) return;
    setBusy(true);
    try {
      await onAuth(mode, email.trim(), password);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-11 w-11 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-xl">
              🛒
            </div>
            <div>
              <div className="text-lg font-semibold text-slate-900">
                {mode === "login" ? "Welcome back" : "Create your account"}
              </div>
              <div className="text-sm text-slate-600">
                {mode === "login"
                  ? "Log in to manage your lists."
                  : "Sign up and start building smart lists."}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-sm">
              <span className="text-slate-700 font-medium">Email</span>
              <input
                className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-slate-300"
                value={email}
                inputMode="email"
                autoComplete="email"
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>

            <label className="block text-sm">
              <span className="text-slate-700 font-medium">Password</span>
              <input
                className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-slate-300"
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submit();
                }}
              />
            </label>

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              onClick={submit}
              disabled={busy}
              className="w-full rounded-2xl bg-slate-900 text-white py-3 font-semibold hover:bg-slate-800 disabled:opacity-60"
            >
              {busy ? "Please wait…" : mode === "login" ? "Log in" : "Sign up"}
            </button>

            <button
              className="w-full text-sm text-slate-700 underline"
              onClick={() => setMode(mode === "login" ? "register" : "login")}
            >
              {mode === "login" ? "Need an account? Sign up" : "Already have an account? Log in"}
            </button>
          </div>
        </div>

        <div className="text-xs text-slate-500 mt-3 text-center">
          Tip: Create lists like Groceries, Drugstore, Party.
        </div>
      </div>
    </div>
  );
}

export default App;
