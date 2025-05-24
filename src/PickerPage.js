import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { signOut } from 'firebase/auth';
import { auth } from './firebaseConfig';

function PickerPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const googleAccessToken = location.state?.googleAccessToken || localStorage.getItem('googleAccessToken');

  const [session, setSession] = useState(null);
  const [qrCodeUri, setQrCodeUri] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPolling, setIsPolling] = useState(false);

  // cloud function urls
  const CREATE_PICKER_SESSION_CF_URL = "https://us-central1-my-react-app-f8c51.cloudfunctions.net/createPickerSession-createPickerSession";
  const GET_PICKER_SESSION_STATUS_CF_URL = "https://us-central1-my-react-app-f8c51.cloudfunctions.net/getPickerSessionStatus-getPickerSessionStatus";

  useEffect(() => {
    const createSession = async () => {
      // return to home if no access token
      if (!googleAccessToken) {
        localStorage.removeItem('googleAccessToken');
        navigate('/');
        return;
      }
      // check for an existing session
      if (session) return;

      try {
        const response = await fetch(CREATE_PICKER_SESSION_CF_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${googleAccessToken}`,
          },
        });

        // per Chris, add error in case user does not accept permissions
        if (!response.ok) {
          const errorData = await response.json();
          if (errorData.code === 'insufficient-permissions') {
              console.error("User did not grant sufficient permissions. Redirecting to sign-in.");
              localStorage.removeItem('googleAccessToken');
              await signOut(auth);
              navigate('/', { replace: true });
              return;
          }
          throw new Error(errorData.error || 'Failed to create picker session');
        }

        const sessionData = await response.json();
        setSession(sessionData);
        setQrCodeUri(sessionData.pickerUri);
        setLoading(false);
        console.log("Picker Session Data:", sessionData);
        setIsPolling(true);

      } catch (err) {
        setError(err.message);
        setLoading(false);
        console.error("Error calling createPickerSession Cloud Function:", err);
      }
    };
    
    // if no session exists, create a new one
    createSession();
  }, [googleAccessToken, session, navigate, CREATE_PICKER_SESSION_CF_URL]);


  useEffect(() => {
    let pollingInterval;
    if (isPolling && session && session.id && googleAccessToken) {
      const pollIntervalMs = (session.pollingConfig?.pollInterval ?
                              parseInt(session.pollingConfig.pollInterval) * 1000 :
                              5000);

      pollingInterval = setInterval(async () => {
        try {
          const response = await fetch(`${GET_PICKER_SESSION_STATUS_CF_URL}?sessionId=${session.id}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${googleAccessToken}`,
            },
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to get picker session status');
          }

          const sessionStatus = await response.json();
          setSession(sessionStatus);
          console.log("Polling session status:", sessionStatus);

          if (sessionStatus.mediaItemsSet) {
            console.log("mediaItemsSet is true! Stopping polling and navigating to list.");
            clearInterval(pollingInterval);
            setIsPolling(false);
            navigate('/list', { state: { session: sessionStatus, googleAccessToken: googleAccessToken } });
          }
        } catch (err) {
          console.error("Error during polling:", err.message);
          clearInterval(pollingInterval);
          setIsPolling(false);
          setError(`Polling error: ${err.message}`);
        }
      }, pollIntervalMs);
    }

    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
        console.log("Polling stopped.");
      }
    };
  }, [isPolling, session, googleAccessToken, navigate, GET_PICKER_SESSION_STATUS_CF_URL]);

  const handleDisconnectClick = () => {
    localStorage.removeItem('googleAccessToken');
    navigate('/disconnect');
  };

  if (loading) {
    return <div className="p-8 text-white text-lg">Loading picker session...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-400">Error: {error}</div>;
  }

  return (
    <div className="p-8 flex flex-col items-center"> 
      {qrCodeUri ? (
        <>
          <div className="flex flex-col sm:flex-row justify-center items-start sm:items-stretch w-full max-w-4xl space-y-8 sm:space-y-0 sm:space-x-8 mt-8 mb-8"> 
            
            <div className="flex-1 flex flex-col items-center justify-center p-4 bg-gray-700 rounded-lg shadow-xl"> 
              <h2 className="text-xl font-semibold mb-4 text-white">Open Google Photos in a new tab:</h2> 
              <a 
                id="picker_url" 
                href={qrCodeUri} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-blue-400 text-lg font-bold hover:underline cursor-pointer" 
              >
                Google Photo Picker
              </a>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-4 bg-gray-700 rounded-lg shadow-xl"> 
              <h2 className="text-xl font-semibold mb-4 text-white">Open Google Photos on your phone:</h2> 
              {qrCodeUri && (
                <QRCodeSVG
                  value={qrCodeUri}
                  size={256}
                  level="H"
                  includeMargin={true}
                  className="bg-white p-2 rounded-md"
                />
              )}
              <p className="mt-4 text-sm text-gray-300">Scan this code to launch the picker on your device.</p> 
            </div>

          </div> 

          <p className="m-2 mt-8 text-base text-gray-300">This page will automatically update when you've completed your selection.</p>
        </>
      ) : (
        <p className="text-white">No session or pickerUri found. This might indicate an issue with the API call.</p>
      )}
      
      <div className="text-right w-full max-w-4xl mt-8">
        <button
          onClick={handleDisconnectClick}
          className="inline-block px-4 py-2 rounded-md font-semibold text-white bg-gray-700 shadow-md hover:bg-gray-600 transition-colors duration-200 cursor-pointer" // UPDATED Disconnect button style
        >
          Disconnect
        </button>
      </div>
    </div>
  );
}

export default PickerPage;