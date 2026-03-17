import React, { useState } from 'react';
import './App.css';
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
import ProtectedRoute from './components/ui/ProtectedRoute';
import { AuthContext } from './components/AuthContext';
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
              <Route path="*" element={<Error />} />
            </Routes>
          </div>
          <Footer />
        </Router>
      </AuthContext.Provider>
    </div>
  );
}

export default App;
