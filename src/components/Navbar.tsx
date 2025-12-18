import React from 'react';
import { Shield, Menu, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="bg-white shadow-md fixed w-full z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Shield className="h-8 w-8 text-orange-500" />
            <span className="ml-2 text-xl font-bold text-gray-800">
              INcase
            </span>
          </div>
          <div className="hidden md:flex items-center space-x-8">
            <a href="#home" className="text-gray-700 hover:text-orange-500">
              Home
            </a>
            <a href="#why-prepare" className="text-gray-700 hover:text-orange-500">
              Why Prepare
            </a>
            <a href="#safety-tips" className="text-gray-700 hover:text-orange-500">
              Safety Tips
            </a>
            <a href="#emergency-contacts" className="text-gray-700 hover:text-orange-500">
              Emergency Contacts
            </a>
            <a href="/qrs" className="text-gray-700 hover:text-orange-500">
              View QR Codes
            </a>
            <a
              href="#emergency-info"
              className="bg-orange-500 text-white px-6 py-2 rounded-full hover:bg-orange-600 transition-colors"
            >
              Create QR Code
            </a>
            {user && (
              <button
                onClick={logout}
                className="text-gray-600 hover:text-orange-500 flex items-center gap-2"
              >
                <LogOut className="h-5 w-5" />
                Sign Out
              </button>
            )}
          </div>
          <div className="md:hidden flex items-center">
            <Menu className="h-6 w-6 text-gray-700" />
          </div>
        </div>
      </div>
    </nav>
  );
}