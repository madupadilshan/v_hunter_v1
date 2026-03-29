import React from 'react';
import Navbar from './components/Navbar';
import Home from './pages/Home';

/**
 * V HUNTER frontend entry
 * Home page only mode
 */
function App() {
  return (
    <div className="w-full min-h-screen bg-[#050511]">
      <Navbar />
      <Home />
    </div>
  );
}

export default App;
