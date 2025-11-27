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
  const [qrCodeUri, setQrCodeUri] = useState(null); // This holds the raw URI
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPolling, setIsPolling] = useState(false);

  // cloud function urls
  const CREATE_PICKER_SESSION_CF_URL = "https://us-central1-my-react-app-f8c51.cloudfunctions.net/createPickerSession-createPickerSession";
  const GET_PICKER_SESSION_STATUS_CF_URL = "https://us-central1-my-react-app-f8c51.cloudfunctions.net/getPickerSessionStatus-getPickerSessionStatus";

  useEffect(() => {
    const createSession = async () => {
      if (!googleAccessToken) {
        localStorage.removeItem('googleAccessToken');
        navigate('/');
        return;
      }
      if (session) return;

      try {
        const response = await fetch(CREATE_PICKER_SESSION_CF_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${googleAccessToken}`,
          },
        });

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
          
          if (sessionStatus.mediaItemsSet) {
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
      }
    };
  }, [isPolling, session, googleAccessToken, navigate, GET_PICKER_SESSION_STATUS_CF_URL]);

  const handleDisconnectClick = () => {
    localStorage.removeItem('googleAccessToken');
    navigate('/disconnect');
  };

  if (loading) {
    return <div className="p-8 text-white text-lg text-center">Loading picker session...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-400 text-center">Error: {error}</div>;
  }

  // LOGIC: Create the Autoclose version for the web button
  // We keep the raw qrCodeUri for the phone, as autoclose behavior on mobile webviews can vary.
  const webPickerUri = qrCodeUri ? `${qrCodeUri}/autoclose` : '#';

  return (
    <div className="p-8 flex flex-col items-center w-full"> 
      {qrCodeUri ? (
        <>
          <h1 className="text-3xl font-bold text-white mb-8 text-center">Pick your images from Google Photos</h1>

          <div className="flex flex-col md:flex-row justify-center items-stretch w-full max-w-4xl gap-8 mb-8"> 
            
            {/* BOX 1: WEB */}
            <div className="flex-1 flex flex-col items-center justify-start p-8 bg-gray-800 rounded-xl shadow-xl border border-gray-700"> 
              <h2 className="text-xl font-semibold mb-8 text-white">Open on Web</h2> 
              <div className="flex-grow flex items-center justify-center w-full">
                <a 
                  href={webPickerUri} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-lg shadow-lg transition duration-200 transform hover:scale-105 text-center"
                >
                  Launch Picker
                </a>
              </div>
              <p className="mt-6 text-sm text-gray-400 text-center">
                This tab will auto-close when you click "Done".
              </p>
            </div>

            {/* BOX 2: PHONE */}
            <div className="flex-1 flex flex-col items-center justify-start p-8 bg-gray-800 rounded-xl shadow-xl border border-gray-700"> 
              <h2 className="text-xl font-semibold mb-6 text-white">Open on Phone</h2> 
              <div className="bg-white p-3 rounded-lg shadow-inner">
                <QRCodeSVG
                  value={qrCodeUri}
                  size={200}
                  level="H"
                  includeMargin={false}
                />
              </div>
              <p className="mt-6 text-sm text-gray-400 text-center">Scan to launch on device</p> 
            </div>

          </div> 
        </>
      ) : (
        <p className="text-white">No session found.</p>
      )}
      
      <div className="text-center w-full max-w-4xl mt-4">
        <button
          onClick={handleDisconnectClick}
          // Changed border-transparent to border-gray-500
          className="px-6 py-2 rounded-md font-medium text-gray-300 hover:text-white hover:bg-gray-800 transition-colors duration-200 border border-gray-500 hover:border-gray-300"
        >
          Disconnect
        </button>
      </div>
    </div>
  );
}

export default PickerPage;