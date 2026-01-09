import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DisplayGame from './cases';
import { getPlayers } from './util';
import hero from './images/DOND.jpg';

function Home() {
  const [week, setWeek] = useState('');
  const [type, setType] = useState('');
  const [pool, setPool] = useState([]);
  const navigate = useNavigate();

  const handleStart = (event) => {
    event.preventDefault();
    if (!week || !type) return;
    const limit = type === 'WR' ? 95 : 65;
    getPlayers(week, type, '2025', limit, setPool);
  };

  const renderOptions = () => (
    <form onSubmit={handleStart} className="flex flex-col sm:flex-row gap-4 justify-center">
      <label className="flex flex-col text-left">
        <span className="mb-1 font-semibold">NFL week</span>
        <select
          value={week}
          onChange={(e) => setWeek(e.target.value)}
          className="p-2 rounded bg-gray-800 border border-gray-700"
        >
          <option></option>
          {Array.from({ length: 18 }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {i + 1}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col text-left">
        <span className="mb-1 font-semibold">Player group</span>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="p-2 rounded bg-gray-800 border border-gray-700"
        >
          <option></option>
          <option value="WR">WR</option>
          <option value="RB">RB</option>
        </select>
      </label>
      <button
        type="submit"
        className="px-6 py-2 bg-emerald-500 hover:bg-emerald-400 text-gray-900 font-bold rounded self-end sm:self-center"
      >
        Build Board
      </button>
    </form>
  );

  if (pool.length > 0) {
    return <DisplayGame pool={pool} />;
  }

  return (
    <>
      <section className="relative h-[60vh] flex items-center justify-center text-center overflow-hidden">
        <img
          src={hero}
          alt="Deal or No Deal Fantasy Football"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/80 to-purple-800/80" />
        <div className="relative z-10 max-w-3xl px-4">
          <h1 className="text-5xl md:text-6xl font-extrabold mb-6">Deal or No Deal</h1>
          <p className="text-xl md:text-2xl mb-8">Fantasy Football Edition</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="#play"
              className="px-8 py-3 bg-emerald-500 hover:bg-emerald-400 text-gray-900 font-bold rounded"
            >
              Play Now
            </a>
            <button
              onClick={() => navigate('/login')}
              className="px-8 py-3 border-2 border-emerald-500 text-emerald-500 font-bold rounded hover:bg-emerald-500 hover:text-gray-900"
            >
              Sign In
            </button>
          </div>
        </div>
      </section>

      <section id="play" className="py-16 bg-gray-900">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-8">Start a Game</h2>
          {renderOptions()}
        </div>
      </section>

      <section className="py-16 bg-gray-800">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6 bg-gray-900 rounded-lg shadow-lg">
              <h3 className="text-xl font-semibold mb-2">Pick</h3>
              <p>Select the NFL week and player group to generate a board of ten mystery players.</p>
            </div>
            <div className="p-6 bg-gray-900 rounded-lg shadow-lg">
              <h3 className="text-xl font-semibold mb-2">Deal</h3>
              <p>Open cases, evaluate offers, and decide if you'll make the deal.</p>
            </div>
            <div className="p-6 bg-gray-900 rounded-lg shadow-lg">
              <h3 className="text-xl font-semibold mb-2">Win</h3>
              <p>Lock in your lineup and compare scores with your league mates.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default Home;
