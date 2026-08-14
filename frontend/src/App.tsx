import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useParams } from 'react-router-dom';
import Home from './components/home';
import SignUp from './components/signIn';
import Error from './components/error';
import Dashboard from './components/dashboard';
import League from './components/league';
import Game from './components/game/Game';
import GroupGame from './components/groupGame';
import Weeks from './components/weeks';
import Navbar from './components/navbar';
import Footer from './components/footer';
import Styleguide from './components/styleguide';
import ProtectedRoute from './components/ui/ProtectedRoute';
import { ToastProvider } from './components/ui';
import { AuthContext } from './contexts/AuthContext';
import { LeagueProvider } from './contexts/LeagueContext';
import type { User } from './types';

const LeagueRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { leagueId } = useParams<{ leagueId: string }>();
  if (!leagueId) return null;
  return <LeagueProvider leagueId={leagueId}>{children}</LeagueProvider>;
};

function App() {
  const [user, setUser] = useState<User | null>(null);

  return (
    <div className="App flex flex-col min-h-screen">
      <AuthContext.Provider value={{ user, setUser }}>
        <ToastProvider>
          <Router>
            <Navbar />
            <div className="flex-grow content-container">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<SignUp />} />
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/league/:leagueId" element={<ProtectedRoute><LeagueRoute><League /></LeagueRoute></ProtectedRoute>} />
                <Route path="/league/:leagueId/season/:season" element={<ProtectedRoute><LeagueRoute><Weeks /></LeagueRoute></ProtectedRoute>} />
                <Route path="/game/group" element={<ProtectedRoute><GroupGame /></ProtectedRoute>} />
                <Route path="/game/:type" element={<ProtectedRoute><Game /></ProtectedRoute>} />
                {/* Styleguide for reviewing the UI primitives. The condition is
                    statically false in a production build, so it is dropped. */}
                {process.env.NODE_ENV === 'development' && (
                  <Route path="/ui" element={<Styleguide />} />
                )}
                <Route path="*" element={<Error />} />
              </Routes>
            </div>
            <Footer />
          </Router>
        </ToastProvider>
      </AuthContext.Provider>
    </div>
  );
}

export default App;
