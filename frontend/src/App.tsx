import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import ListsPage from "./pages/ListsPage";
import ListDetailPage from "./pages/ListDetailPage";
import api, { setAuthToken } from "./api";
import "./index.css";

type User = { id: string; email: string };

function App() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Load token once on app start and validate it via /auth/me
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
        setAuthToken(undefined);
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleAuth = async (
    mode: "login" | "register",
    email: string,
    password: string
  ) => {
    setAuthError(null);
    try {
      const res = await api.post(`/auth/${mode}`, { email, password });
      const newToken = res.data.token as string;

      // Persist + set default header
      setAuthToken(newToken);
      setToken(newToken);

      // Always fetch the current user using the token (prevents race conditions)
      const me = await api.get("/auth/me");
      setUser(me.data);
    } catch (error: any) {
      setAuthError(error?.response?.data?.message ?? "Unable to authenticate");
    }
  };

  const logout = () => {
    setAuthToken(undefined);
    setToken(null);
    setUser(null);
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!token || !user) {
    return <AuthScreen onAuth={handleAuth} error={authError} />;
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white border-b border-slate-200">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link to="/" className="font-semibold text-slate-800">
              🛒 Smart Shopping List
            </Link>
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <span>{user.email}</span>
              <button
                onClick={logout}
                className="px-3 py-1 rounded-lg bg-slate-800 text-white hover:bg-slate-700"
              >
                Log out
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 py-6">
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
  error,
}: {
  onAuth: (mode: "login" | "register", email: string, password: string) => void;
  error: string | null;
}) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="bg-white shadow-sm border border-slate-200 rounded-2xl p-6 w-full max-w-md">
        <h1 className="text-xl font-semibold mb-4 text-slate-800 text-center">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h1>

        <div className="space-y-3">
          <label className="block text-sm">
            <span className="text-slate-600">Email</span>
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </label>

          <label className="block text-sm">
            <span className="text-slate-600">Password</span>
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </label>

          {error && <div className="text-red-600 text-sm">{error}</div>}

          <button
            onClick={() => onAuth(mode, email, password)}
            className="w-full bg-slate-900 text-white rounded-lg py-2 font-medium hover:bg-slate-800"
          >
            {mode === "login" ? "Log in" : "Sign up"}
          </button>

          <button
            className="w-full text-sm text-slate-700 underline"
            onClick={() => setMode(mode === "login" ? "register" : "login")}
          >
            {mode === "login"
              ? "Need an account? Sign up"
              : "Already have an account? Log in"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
