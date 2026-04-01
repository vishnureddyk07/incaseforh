import React, { useState } from 'react';
import { Shield, Menu, X, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isAccessOpen, setIsAccessOpen] = useState(false);

  const navItems = [
    { label: 'Home', href: '#home' },
    { label: 'Safety Tips', href: '#safety-tips' },
    { label: 'Emergency Contacts', href: '#emergency-contacts' },
  ];

  const closeMenu = () => setIsOpen(false);

  return (
    <nav className="bg-white/95 backdrop-blur-md border-b border-neutral-100 sticky top-0 z-50 shadow-xs" role="navigation" aria-label="Primary">
      <div className="container-fluid">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <a href="/" className="flex items-center gap-3 group">
            <div className="p-2 bg-primary-100 rounded-lg group-hover:bg-primary-200 transition-colors">
              <Shield className="h-6 w-6 text-primary-500" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-primary-500 bg-clip-text text-transparent">
              INcase
            </span>
          </a>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-neutral-700 hover:text-primary-600 px-4 py-2 rounded-lg transition-colors hover:bg-neutral-50 font-medium text-sm"
              >
                {item.label}
              </a>
            ))}

            {/* Access Dropdown */}
            <div className="relative group">
              <button className="text-neutral-700 hover:text-primary-600 px-4 py-2 rounded-lg transition-colors hover:bg-neutral-50 inline-flex items-center gap-2 font-medium text-sm">
                Access
                <ChevronDown className="h-4 w-4" />
              </button>
              <div className="absolute right-0 mt-0 w-48 bg-white rounded-xl shadow-lg border border-neutral-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pt-2">
                <div className="py-2">
                  <a href="/admin" className="block px-4 py-2.5 text-neutral-700 hover:bg-primary-50 hover:text-primary-600 text-sm font-medium transition-colors">
                    Admin
                  </a>
                  <a href="/manager" className="block px-4 py-2.5 text-neutral-700 hover:bg-primary-50 hover:text-primary-600 text-sm font-medium transition-colors">
                    Manager
                  </a>
                  <a href="/employee" className="block px-4 py-2.5 text-neutral-700 hover:bg-primary-50 hover:text-primary-600 text-sm font-medium transition-colors">
                    Employee
                  </a>
                </div>
                <div className="border-t border-neutral-100 py-2">
                  <a href="/police/login" className="block px-4 py-2.5 text-blue-600 hover:bg-blue-50 text-sm font-medium transition-colors">
                    👮 Police
                  </a>
                  <a href="/ambulance/login" className="block px-4 py-2.5 text-primary-600 hover:bg-primary-50 text-sm font-medium transition-colors">
                    🚑 Ambulance
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* CTA and Auth */}
          <div className="hidden md:flex items-center gap-4">
            <a href="#emergency-info" className="btn-primary-md">
              <Shield className="h-4 w-4 mr-2" />
              Create QR
            </a>
            {user && (
              <button
                onClick={logout}
                className="text-neutral-600 hover:text-primary-600 p-2 rounded-lg hover:bg-neutral-50 transition-colors"
                title="Sign out"
              >
                <LogOut className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-neutral-100 transition-colors text-neutral-700"
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden border-t border-neutral-100 bg-neutral-50 animate-slide-up">
          <div className="container-fluid py-4 space-y-3">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={closeMenu}
                className="block text-neutral-700 hover:text-primary-600 px-4 py-2 rounded-lg hover:bg-white transition-colors font-medium"
              >
                {item.label}
              </a>
            ))}
            
            <a
              href="#emergency-info"
              onClick={closeMenu}
              className="btn-primary-md w-full justify-center"
            >
              Create QR Code
            </a>

            <div className="border border-neutral-200 rounded-lg bg-white overflow-hidden">
              <div className="px-4 py-3 text-sm font-semibold text-neutral-900 border-b border-neutral-100">
                Access Portals
              </div>
              <a href="/admin" onClick={closeMenu} className="block px-4 py-2.5 text-neutral-700 hover:bg-primary-50 hover:text-primary-600 transition-colors text-sm">Admin</a>
              <a href="/manager" onClick={closeMenu} className="block px-4 py-2.5 text-neutral-700 hover:bg-primary-50 hover:text-primary-600 transition-colors text-sm">Manager</a>
              <a href="/employee" onClick={closeMenu} className="block px-4 py-2.5 text-neutral-700 hover:bg-primary-50 hover:text-primary-600 transition-colors text-sm">Employee</a>
              <div className="border-t border-neutral-100">
                <a href="/police/login" onClick={closeMenu} className="block px-4 py-2.5 text-blue-600 hover:bg-blue-50 transition-colors text-sm font-medium">👮 Police</a>
                <a href="/ambulance/login" onClick={closeMenu} className="block px-4 py-2.5 text-primary-600 hover:bg-primary-50 transition-colors text-sm font-medium">🚑 Ambulance</a>
              </div>
            </div>

            {user && (
              <button
                onClick={() => {
                  logout();
                  closeMenu();
                }}
                className="w-full flex items-center justify-center gap-2 text-neutral-600 hover:text-primary-600 px-4 py-2 hover:bg-white rounded-lg transition-colors font-medium text-sm"
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