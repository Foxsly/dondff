import React, {useState} from 'react';
import './App.css';
import {BrowserRouter as Router, Routes, Route} from 'react-router-dom';
import Home from './components/home';
import SignUp from './components/signIn';
import Error from './components/error';
import Dashboard from './components/dashboard';
import League from './components/league';
import Game from './components/game';
import GroupGame from './components/groupGame';
import Weeks from './components/weeks';
import Navbar from './components/navbar';
import Footer from './components/footer';
import {AuthContext} from './components/AuthContext';

function App() {
  const [user, setUser] = useState(null);

  return (
    <div className="App flex flex-col min-h-screen">
      <AuthContext.Provider value={{user, setUser}}>
        <Router>
          <Navbar/>
          <div className="flex-grow content-container">
            <Routes>
              <Route path="/" element={<Home/>}/>
              <Route path="/login" element={<SignUp/>}/>
              <Route path="/dashboard" element={<Dashboard/>}/>
              <Route path="/league/:leagueId" element={<League/>}/>
              <Route path="/league/:leagueId/season/:season" element={<Weeks/>}/>
              <Route path="/game/group" element={<GroupGame/>}/>
              <Route path="/game/:type" element={<Game/>}/>
              <Route path="*" element={<Error/>}/>
            </Routes>
          </div>
          <Footer/>
        </Router>
      </AuthContext.Provider>
    </div>
  );
}

export default App;
