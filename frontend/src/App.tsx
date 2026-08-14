import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useParams } from 'react-router-dom';
import Home from './components/home';
import SignUp from './components/signIn';
import NotFound from './components/error';
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
    <div className="flex min-h-screen flex-col bg-bg">
      <AuthContext.Provider value={{ user, setUser }}>
        <ToastProvider>
          <Router>
            {/* First thing in the tab order: lets keyboard and screen-reader
                users jump the navigation instead of tabbing through it on
                every page. Visible only while focused. */}
            <a
              href="#main"
              className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-brand focus:px-4 focus:py-2 focus:font-semibold focus:text-brand-contrast"
            >
              Skip to content
            </a>

            <Navbar />

            {/* `min-w-0` stops a wide child (a score table, the case board)
                from forcing the whole column wider than the viewport. */}
            <main id="main" className="min-w-0 flex-1">
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
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>

            <Footer />
          </Router>
        </ToastProvider>
      </AuthContext.Provider>
    </div>
  );
}

export default App;
