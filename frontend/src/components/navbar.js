import React, {useContext, useEffect} from 'react';
import {Link, useNavigate} from 'react-router-dom';
import {getCurrentUser, logout as logoutUser} from '../api/auth';
import {AuthContext} from "./AuthContext";

function Navbar() {
  const {user, setUser} = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const current = await getCurrentUser();
        setUser(current);
      } catch {
        setUser(null);
      }
    })();
  }, [setUser]);

  const logout = async () => {
    try {
      await logoutUser();
    } catch (err) {
      console.error('Logout error', err);
    } finally {
      setUser(null);
      navigate('/');
    }
  };

  return (
    <nav className="flex justify-between items-center bg-gray-800 p-4">
      <div className="flex space-x-4">
        <Link to="/" className="font-bold hover:text-emerald-400">
          Home
        </Link>
        {user && (
          <Link to="/dashboard" className="font-bold hover:text-emerald-400">
            Dashboard
          </Link>
        )}
      </div>
      <div className="flex items-center space-x-4">
        {!user ? (
          <>
            <Link to="/login"
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-gray-900 font-bold rounded">
              Sign In
            </Link>
            <Link to="/login"
                  className={
                    'px-4 py-2 border-2 border-emerald-500 text-emerald-500 font-bold rounded ' +
                    'hover:bg-emerald-500 hover:text-gray-900'
                  }
            >
              Create Account
            </Link>
          </>
        ) : (
          <>
            <span className="font-semibold">
              {user.email || user.name}
            </span>
            <button
              onClick={logout}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-gray-900 font-bold rounded"
            >
              Sign Out
            </button>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;