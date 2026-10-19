import { useState } from "react";
import { Lock, User, UserPlus, X } from "lucide-react";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";

interface LoginPageProps {
  onLogin: (username: string) => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password.trim()) {
      setError("Please enter both username and password");
      return;
    }

    setIsLoading(true);

    try {
      // Validate credentials against database
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6d0c6593/users/${username.toUpperCase()}`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) {
        setError("Invalid username or password");
        setIsLoading(false);
        return;
      }

      const data = await response.json();
      const user = data.user;

      if (!user || user.password !== password) {
        setError("Invalid username or password");
        setIsLoading(false);
        return;
      }

      // Store user info in session
      localStorage.setItem("currentUser", user.username);
      localStorage.setItem("userRole", user.role || "standard");
      onLogin(user.username);
    } catch (err) {
      setError("Login failed. Please try again.");
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password.trim() || !confirmPassword.trim()) {
      setError("Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 4) {
      setError("Password must be at least 4 characters");
      return;
    }

    setIsLoading(true);

    try {
      // Create new user with guest role
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6d0c6593/users`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: username.toUpperCase(),
            password: password,
            role: "guest", // New users start as guests
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          setError("Username already exists");
        } else {
          setError(data.error || "Sign up failed. Please try again.");
        }
        setIsLoading(false);
        return;
      }

      // Store user info in session
      localStorage.setItem("currentUser", data.user.username);
      localStorage.setItem("userRole", data.user.role || "guest");
      onLogin(data.user.username);
    } catch (err) {
      setError("Sign up failed. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center size-16 bg-blue-600 rounded-full mb-4">
            <Lock className="size-8 text-white" />
          </div>
          <h1 className="text-3xl mb-2">WO Tracking Assistance</h1>
          <p className="text-gray-600">Sign in to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-2 text-gray-700">Username</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoComplete="username"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm mb-2 text-gray-700">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoComplete="current-password"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-600 mb-3">
            Don't have an account?
          </p>
          <button
            type="button"
            onClick={() => {
              setShowSignUp(true);
              setError("");
              setUsername("");
              setPassword("");
              setConfirmPassword("");
            }}
            className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors mx-auto"
          >
            <UserPlus className="size-5" />
            <span>Create Guest Account</span>
          </button>
          <p className="text-xs text-gray-500 mt-2">
            Guest accounts can view data only
          </p>
        </div>
      </div>

      {/* Sign Up Modal */}
      {showSignUp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md relative">
            <button
              onClick={() => {
                setShowSignUp(false);
                setError("");
                setUsername("");
                setPassword("");
                setConfirmPassword("");
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="size-6" />
            </button>

            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center size-16 bg-green-600 rounded-full mb-4">
                <UserPlus className="size-8 text-white" />
              </div>
              <h2 className="text-2xl mb-2">Create Guest Account</h2>
              <p className="text-gray-600 text-sm">
                Guest accounts can view existing data but cannot create or edit
              </p>
            </div>

            <form onSubmit={handleSignUp} className="space-y-4">
              <div>
                <label className="block text-sm mb-2 text-gray-700">Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Choose a username"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    autoComplete="username"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm mb-2 text-gray-700">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Choose a password"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm mb-2 text-gray-700">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    autoComplete="new-password"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? "Creating Account..." : "Create Guest Account"}
              </button>

              <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg text-sm text-blue-800">
                <strong>Note:</strong> Guest accounts have view-only access. Contact an admin to upgrade your permissions.
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
