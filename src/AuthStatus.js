import React, { useState, useEffect } from 'react';
import { auth } from './firebaseConfig';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useNavigate, useLocation } from 'react-router-dom';

function AuthStatus() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        if (localStorage.getItem('googleAccessToken') && location.pathname === '/') {
          navigate('/picker', { replace: true });
        }
      } else {
        localStorage.removeItem('googleAccessToken');
        if (location.pathname !== '/') {
          navigate('/', { replace: true });
        }
      }
    });

    return () => unsubscribe();
  }, [navigate, location.pathname]);

  const handleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/photospicker.mediaitems.readonly');

    try {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential.accessToken;

      localStorage.setItem('googleAccessToken', token);

      navigate('/picker', { state: { googleAccessToken: token }, replace: true });

    } catch (error) {
      console.error("Error signing in:", error.message);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center flex-grow">
      {user && location.pathname === '/' ? (
        <div className="p-8">
          <p className="text-xl text-gray-200 mb-4">You're signed in. Redirecting to your photo picker...</p>
        </div>
      ) : (
        <div className="p-8 flex flex-col items-center">
          <p className="text-lg text-gray-200 mb-8 max-w-sm">
            A simple app to pick photos from your Google Photos library and view their detailed metadata.
          </p>
          <button
            onClick={handleSignIn}
            className="inline-block px-8 py-4 rounded-lg font-semibold text-white bg-blue-600 shadow-xl hover:bg-blue-700 transition-colors duration-200 cursor-pointer text-xl"
          >
            Sign In with Google
          </button>
        </div>
      )}
    </div>
  );
}

export default AuthStatus;