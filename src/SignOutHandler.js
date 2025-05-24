// src/SignOutHandler.js

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from './firebaseConfig'; // Ensure auth is imported

function SignOutHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    const performSignOut = async () => {
      try {
        await signOut(auth);
        console.log("User signed out successfully via SignOutHandler.");
      } catch (error) {
        console.error("Error signing out via SignOutHandler:", error.message);
      } finally {
        localStorage.removeItem('googleAccessToken'); // NEW: Clear token from localStorage here
        // Always redirect to the home page after attempting sign-out
        navigate('/', { replace: true }); // 'replace: true' prevents going back to /disconnect
      }
    };

    performSignOut();
  }, [navigate]); // navigate is a stable function provided by react-router-dom v6

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
      <p className="text-lg text-gray-700">Signing you out...</p>
    </div>
  );
}

export default SignOutHandler;