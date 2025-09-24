import React, { useEffect, useState } from 'react'
import { createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { auth } from '../firebase-config'
import { Navigate, useNavigate } from 'react-router-dom'

const SignUp = () => {

  const [registerEmail, setRegisterEmail] = useState("")
  const [registerPassword, setRegisterPassword] = useState("")
  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [registerError, setRegisterError] = useState("")
  const [loginError, setLoginError] = useState("")
  const [user, setUser] = useState({})

  const navigate = useNavigate()

  useEffect(() => {
    onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
    });
  }, [])

  const register = async () => {
    try {
      const user = await createUserWithEmailAndPassword(auth, registerEmail, registerPassword)
      console.log(user)
      navigate("/dashboard")
      setRegisterError("")
    } catch (error) {
      setRegisterError(error.message)
    }
  }

  const login = async () => {
    try {
      const user = await signInWithEmailAndPassword(auth, loginEmail, loginPassword)
      console.log(user)
      navigate("/dashboard")
      setLoginError("")
    } catch (error) {
      setLoginError(error.message)
    }
  }

  const logout = async () => {
    try {
      await signOut(auth)
    } catch (error) {
      console.log(error.message)
    }
  }

  if (user) {
    return (
      <div className="max-w-md mx-auto mt-10 space-y-4 text-center">
        <h4 className="text-xl font-semibold">User Logged IN:</h4>
        <p>{user ? user.email : "Not Logged In"}</p>
        <div className="flex justify-center gap-4">
          <button
            className="px-4 py-2 font-bold text-[#102131] bg-[#00ceb8] rounded hover:bg-[#00ceb8]/80"
            onClick={logout}
          >
            Sign Out
          </button>
          <button
            className="px-4 py-2 font-bold text-[#102131] bg-[#00ceb8] rounded hover:bg-[#00ceb8]/80"
            onClick={() => {
              navigate("/dashboard");
            }}
          >
            Dashboard
          </button>
        </div>
      </div>
    );
  } else {
    return (
      <div className="max-w-md mx-auto mt-10 space-y-8 text-center">
        <div className="space-y-2">
          <h3 className="text-2xl font-bold">Sign Up</h3>
          <input
            className="w-full p-2 bg-transparent border border-[#3a465b] rounded"
            placeholder="Email..."
            onChange={(e) => {
              setRegisterEmail(e.target.value);
              setRegisterError("");
            }}
          />
          <input
            className="w-full p-2 bg-transparent border border-[#3a465b] rounded"
            placeholder="Password..."
            type="password"
            onChange={(e) => {
              setRegisterPassword(e.target.value);
              setRegisterError("");
            }}
          />
          {registerError && (
            <p className="text-red-500">{registerError}</p>
          )}
          <button
            className="w-full px-4 py-2 font-bold text-[#102131] bg-[#00ceb8] rounded hover:bg-[#00ceb8]/80"
            onClick={register}
          >
            Sign Up
          </button>
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-bold">Login</h3>
          <input
            className="w-full p-2 bg-transparent border border-[#3a465b] rounded"
            placeholder="Email..."
            onChange={(e) => {
              setLoginEmail(e.target.value);
              setLoginError("");
            }}
          />
          <input
            className="w-full p-2 bg-transparent border border-[#3a465b] rounded"
            placeholder="Password..."
            type="password"
            onChange={(e) => {
              setLoginPassword(e.target.value);
              setLoginError("");
            }}
          />
          {loginError && <p className="text-red-500">{loginError}</p>}
          <button
            className="w-full px-4 py-2 font-bold text-[#102131] bg-[#00ceb8] rounded hover:bg-[#00ceb8]/80"
            onClick={login}
          >
            Login
          </button>
        </div>
      </div>
    );
  }

}

export default SignUp
