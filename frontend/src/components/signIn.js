import React, {useContext, useEffect, useState} from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getCurrentUser,
  register as registerUser,
  login as loginUser,
} from '../api/auth';
import {AuthContext} from "./AuthContext";

const SignUp = () => {
  const { setUser } = useContext(AuthContext);
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerError, setRegisterError] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loadingUser, setLoadingUser] = useState(true);

  const navigate = useNavigate();

  // On mount, restore user from local storage (or later from /auth/me)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const current = await getCurrentUser();
        if (!cancelled) {
          setUser(current);
        }
      } finally {
        if (!cancelled) setLoadingUser(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setUser]);

  const handleRegister = async (e) => {
    e.preventDefault();
    setRegisterError('');
    try {
      if (!registerEmail) {
        setRegisterError('Email is required.');
        return;
      }
      // Password is kept in the UI but may be ignored by backend for now.
      const newUser = await registerUser(registerName, registerEmail, registerPassword);
      setUser(newUser);
      setRegisterName('');
      setRegisterEmail('');
      setRegisterPassword('');
      navigate('/dashboard');
    } catch (err) {
      console.error('Register error', err);
      setRegisterError(err.message || 'Failed to register.');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      if (!loginEmail) {
        setLoginError('Email is required.');
        return;
      }
      const loggedIn = await loginUser(loginEmail, loginPassword);
      setUser(loggedIn);
      setLoginEmail('');
      setLoginPassword('');
      navigate('/dashboard');
    } catch (err) {
      console.error('Login error', err);
      setLoginError(err.message || 'Failed to login.');
    }
  };

  if (loadingUser) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#020617] text-white">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }
/*

  if (user) {
    // If already logged in, redirect to dashboard (or show a small panel)
    return <Navigate to="/dashboard" replace />;
  }
*/

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#020617]">
      <div className="w-full max-w-md bg-[#0b1120] rounded-lg shadow-lg p-6 space-y-6">
        <h1 className="text-2xl font-bold text-white text-center mb-2">
          Sign In / Register
        </h1>
        <p className="text-sm text-gray-400 text-center mb-4">
          Enter your email and password to register or log in.
          The backend will ignore the password for now, but it&apos;s kept in the UI for future use.
        </p>

        {/* Register */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Register</h2>
          <form className="space-y-3" onSubmit={handleRegister}>
            <div>
              <label className="block text-sm text-gray-300 mb-1">
                Name
              </label>
              <input
                type="text"
                value={registerName}
                onChange={(e) => setRegisterName(e.target.value)}
                className="w-full px-3 py-2 rounded bg-[#020617] border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-[#00ceb8]"
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">
                Email
              </label>
              <input
                type="email"
                value={registerEmail}
                onChange={(e) => setRegisterEmail(e.target.value)}
                className="w-full px-3 py-2 rounded bg-[#020617] border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-[#00ceb8]"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">
                Password
              </label>
              <input
                type="password"
                value={registerPassword}
                onChange={(e) => setRegisterPassword(e.target.value)}
                className="w-full px-3 py-2 rounded bg-[#020617] border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-[#00ceb8]"
                placeholder="••••••••"
              />
              <p className="mt-1 text-xs text-gray-500">
                Password is currently ignored on the backend, but will be used in a future auth implementation.
              </p>
            </div>
            {registerError && (
              <div className="text-sm text-red-400">{registerError}</div>
            )}
            <button
              type="submit"
              className="w-full px-4 py-2 font-bold text-[#102131] bg-[#00ceb8] rounded hover:bg-[#00ceb8]/80"
            >
              Register
            </button>
          </form>
        </div>

        <hr className="border-gray-700" />

        {/* Login */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Login</h2>
          <form className="space-y-3" onSubmit={handleLogin}>
            <div>
              <label className="block text-sm text-gray-300 mb-1">
                Email
              </label>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full px-3 py-2 rounded bg-[#020617] border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-[#00ceb8]"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">
                Password
              </label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full px-3 py-2 rounded bg-[#020617] border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-[#00ceb8]"
                placeholder="••••••••"
              />
              <p className="mt-1 text-xs text-gray-500">
                Password is currently ignored on the backend, but will be used in a future auth implementation.
              </p>
            </div>
            {loginError && (
              <div className="text-sm text-red-400">{loginError}</div>
            )}
            <button
              type="submit"
              className="w-full px-4 py-2 font-bold text-[#102131] bg-[#00ceb8] rounded hover:bg-[#00ceb8]/80"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SignUp;