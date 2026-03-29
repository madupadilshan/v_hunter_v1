import React from 'react';
import { Shield, Zap, Database, FileText } from 'lucide-react';

/**
 * Static Navbar Component
 * Visual navigation only (no route links)
 */
function Navbar() {
  return (
    <nav className="fixed top-0 w-full z-50 bg-gray-950/50 backdrop-blur-md border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Shield className="w-8 h-8 text-red-500" fill="currentColor" />
            <div className="absolute inset-0 bg-red-500/20 blur-md"></div>
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold">
              <span className="text-gray-100">V</span>
              <span className="text-red-500 drop-shadow-lg"> HUNTER</span>
            </span>
            <span className="text-xs text-cyan-400/60 font-mono">Vulnerability Scanner</span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2">
          <div className="px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 flex items-center gap-2 font-medium cursor-default">
            <Zap className="w-4 h-4" />
            Live Threat Map
          </div>
          <div className="px-4 py-2 rounded-lg text-gray-300 bg-gray-900/40 border border-gray-700/50 flex items-center gap-2 font-medium cursor-default">
            <Database className="w-4 h-4" />
            Scanner
          </div>
          <div className="px-4 py-2 rounded-lg text-gray-300 bg-gray-900/40 border border-gray-700/50 flex items-center gap-2 font-medium cursor-default">
            <FileText className="w-4 h-4" />
            Reports
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
          <span className="text-xs text-gray-400 font-mono">ONLINE</span>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
