// ...existing code...
import React, { useEffect } from 'react';

interface AuthModalProps {
  defaultView?: 'login' | 'signup';
}

export default function AuthModal({ defaultView = 'login' }: AuthModalProps) {
  useEffect(() => {
    // Redirect to homepage immediately so auth UI never appears
    window.location.replace('/');
  }, []);

  // No UI shown
  return null;
}
// ...existing code...