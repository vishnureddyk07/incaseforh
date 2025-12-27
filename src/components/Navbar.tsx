import React, { useState } from 'react';
import { Shield, Menu, X, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { label: 'Home', href: '#home' },
    { label: 'Safety Tips', href: '#safety-tips' },
    { label: 'Emergency Contacts', href: '#emergency-contacts' },
  ];

  const closeMenu = () => setIsOpen(false);

  return (
    <nav className="bg-white/90 backdrop-blur shadow-md fixed w-full z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Shield className="h-8 w-8 text-orange-500" />
            <span className="ml-2 text-xl font-bold text-gray-800">
              INcase
            </span>
          </div>
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <a key={item.href} href={item.href} className="text-gray-700 hover:text-orange-500">
                {item.label}
              </a>
            ))}
            <a
              href="/admin"
              className="text-gray-700 hover:text-orange-500 border px-3 py-1 rounded-full text-sm"
              title="Admin login"
            >
              Admin
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
            <button
              aria-label="Toggle menu"
              className="p-2 rounded-md hover:bg-gray-100"
              onClick={() => setIsOpen((prev) => !prev)}
            >
              {isOpen ? <X className="h-6 w-6 text-gray-700" /> : <Menu className="h-6 w-6 text-gray-700" />}
            </button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="md:hidden bg-white shadow-lg border-t">
          <div className="px-4 pt-4 pb-6 space-y-3">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={closeMenu}
                className="block text-gray-800 hover:text-orange-500"
              >
                {item.label}
              </a>
            ))}
            <a
              href="#emergency-info"
              onClick={closeMenu}
              className="block w-full text-center bg-orange-500 text-white px-4 py-2 rounded-full hover:bg-orange-600 transition-colors"
            >
              Create QR Code
            </a>
            <a
              href="/admin"
              onClick={closeMenu}
              className="block text-gray-700 hover:text-orange-500"
            >
              Admin
            </a>
            {user && (
              <button
                onClick={() => {
                  logout();
                  closeMenu();
                }}
                className="flex items-center gap-2 text-gray-600 hover:text-orange-500"
              >
                <LogOut className="h-5 w-5" />
                Sign Out
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}