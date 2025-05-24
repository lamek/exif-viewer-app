import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

function ListPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const session = location.state?.session;
  const googleAccessToken = location.state?.googleAccessToken || localStorage.getItem('googleAccessToken');

  const [mediaItems, setMediaItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [selectedMediaItem, setSelectedMediaItem] = useState(null);
  const [modalMediaUrl, setModalMediaUrl] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState(null);

  const LIST_MEDIA_ITEMS_CF_URL = "https://listpickedmediaitems-listpickedmediaitems-dsxzhcscbq-uc.a.run.app"; 
  const PROXY_MEDIA_URL_CF_URL = "https://us-central1-my-react-app-f8c51.cloudfunctions.net/proxyMediaUrl-proxyMediaUrl";

  const retryCountRef = useRef(0);
  const maxRetries = 5;
  const retryDelayMs = 2000;

  const delay = (ms) => new Promise(res => setTimeout(res, ms));

  useEffect(() => {
    const fetchMedia = async () => {
      if (!session?.id || !googleAccessToken) {
        localStorage.removeItem('googleAccessToken');
        setError("Missing session ID or access token.");
        setLoading(false);
        console.error("ListPage useEffect: googleAccessToken missing or null", googleAccessToken);
        return;
      }
      retryCountRef.current = 0;
      setLoading(true);
      setError(null);

      let currentAttempt = 0;
      while (currentAttempt <= maxRetries) {
        try {
          console.log(`Attempt ${currentAttempt + 1} to fetch media items...`);
          const response = await fetch(`${LIST_MEDIA_ITEMS_CF_URL}?sessionId=${session.id}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${googleAccessToken}`,
            },
          });

          if (!response.ok) {
            const errorData = await response.json();
            if (errorData.code === 'media-not-ready' || (response.status === 400 && errorData.error.includes("Bad Request"))) {
                if (currentAttempt < maxRetries) {
                    console.warn(`Media not ready, retrying in ${retryDelayMs / 1000}s...`);
                    await delay(retryDelayMs);
                    currentAttempt++;
                    continue;
                } else {
                    throw new Error(`Media items still not ready after ${maxRetries} retries.`);
                }
            } else {
                throw new Error(errorData.error || `Failed to list media items (HTTP ${response.status})`);
            }
          }

          const data = await response.json();
          setMediaItems(data.mediaItems || []);
          setLoading(false);
          console.log("Fetched Media Items:", data.mediaItems);
          return;

        } catch (err) {
          setError(`Error fetching media items: ${err.message}`);
          setLoading(false);
          console.error("Error fetching media items:", err);
          return;
        }
      }
    };

    fetchMedia();
  }, [session, googleAccessToken, LIST_MEDIA_ITEMS_CF_URL]);


  const openModal = async (mediaItem) => {
    setSelectedMediaItem(mediaItem);
    setModalLoading(true);
    setModalError(null);
    setModalMediaUrl(null);

    try {
      const proxyResponse = await fetch(
        `${PROXY_MEDIA_URL_CF_URL}?baseUrl=${encodeURIComponent(mediaItem.mediaFile.baseUrl)}&type=${mediaItem.type}&size=w2048-h2048&accessToken=${googleAccessToken}`,
        {
          method: 'GET',
        }
      );

      if (!proxyResponse.ok) {
        throw new Error(`Failed to load media: ${proxyResponse.statusText}`);
      }

      setModalMediaUrl(`${proxyResponse.url}&accessToken=${googleAccessToken}`);
      setModalLoading(false);

    } catch (err) {
      setModalError(`Failed to load media for modal: ${err.message}`);
      setModalLoading(false);
      console.error("Error proxying media URL:", err);
    }
  };

  const closeModal = () => {
    setSelectedMediaItem(null);
    setModalMediaUrl(null);
    setModalError(null);
    setModalLoading(false);
  };

  if (loading) {
    return <div className="p-8 text-gray-500 text-lg">Loading media items...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-600">Error: {error}</div>;
  }

  if (mediaItems.length === 0) {
    return (
      <div className="p-8">
        <h1 className="text-xl pb-1 text-gray-600">Your Picked Media Items</h1>
        <p className="mt-4">No media items were found for this session. Did you pick any?</p>
          <button
            onClick={() => navigate('/picker', { replace: true })} 
            className="text-blue-500 ml-4 text-sm hover:underline">
            Change selection
          </button>
        <div className="text-right">
          <button 
              onClick={() => navigate('/disconnect')} 
              className="inline-block cursor-pointer py-1 px-2 m-2 border border-gray-400 hover:border-blue-400 hover:bg-blue-50 rounded-md text-sm">
              Disconnect
          </button>
        </div>
      </div>
    );
  }

  const handleDisconnectClick = () => {
    localStorage.removeItem('googleAccessToken'); 
    navigate('/disconnect');
  };

  return (
    <div className="p-8 flex flex-col items-center w-full text-white">
      <div className="w-full max-w-4xl">
        <div className="mx-2 mt-2 text-sm text-gray-400 font-bold mb-4">
          Click on an item to see details (EXIF-like data)
        </div>
        <div>
          <button
          onClick={() => navigate('/picker', { replace: true, state: { googleAccessToken: localStorage.getItem('googleAccessToken') } })}
            className="px-4 py-2 rounded-md font-semibold text-white bg-gray-700 shadow-md hover:bg-gray-600 transition-colors duration-200 cursor-pointer text-sm"
          >
          Change selection
          </button>
        </div>
      </div>

      <div 
        id="imageList" 
        className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 justify-items-center"
        >
        {mediaItems.map((item) => (
          <div
            key={item.mediaFile.id}
            className="w-36 h-36 flex items-center justify-center border border-gray-200 rounded-md shadow-sm cursor-pointer hover:shadow-md overflow-hidden"
            onClick={() => openModal(item)}
          >
            {item.mediaFile.baseUrl ? (
              <img
                src={`${PROXY_MEDIA_URL_CF_URL}?baseUrl=${encodeURIComponent(item.mediaFile.baseUrl)}&type=${item.type}&size=w144-h144-c&accessToken=${googleAccessToken}`}
                alt={item.mediaFile.filename || 'Media Item'}
                className="w-full h-full object-cover"
              />
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-md text-gray-500 text-xs text-center p-2">
                    No preview available
                </div>
            )}

          </div>
        ))}
      </div>

      {selectedMediaItem && (
        <div id="modal" className="fixed inset-0 z-10 overflow-y-auto bg-black bg-opacity-75 flex items-center justify-center">
          <div className="relative bg-white border border-gray-400 rounded-lg p-4 max-w-2xl max-h-[90vh] overflow-auto">
            <button
              onClick={closeModal}
              className="px-2 py-1 m-2 border border-red-500 text-red-500 hover:text-white hover:bg-red-500 hover:border-red-800 rounded-md text-sm absolute top-0 right-0">
              Close
            </button>
            <div className="flex flex-col items-center p-4 text-center text-gray-800">

                {modalLoading && <p className="text-lg text-gray-500">Loading media...</p>}
                {modalError && <p className="text-lg text-red-600">Error: {modalError}</p>}

                {!modalLoading && !modalError && modalMediaUrl && (
                  selectedMediaItem.type === "VIDEO" ? (
                    <video controls src={modalMediaUrl} className="max-w-full max-h-[60vh] object-contain">
                      Your browser does not support the video tag.
                    </video>
                  ) : (
                    <img
                      src={modalMediaUrl}
                      alt={selectedMediaItem.mediaFile.filename || 'Media Item'}
                      className="max-w-full max-h-[60vh] object-contain"
                    />
                  )
                )}

                {selectedMediaItem.mediaFile.mediaFileMetadata && (
                  <>
                    <h2 className="text-2xl font-bold mt-4 mb-2 break-all">{selectedMediaItem.mediaFile.filename}</h2>
                    <h3 className="text-lg font-bold mb-2">Metadata Details:</h3>
                    <table className="table-auto text-sm text-left border-collapse border border-gray-300 w-full">
                      <tbody>
                        <tr className="bg-white"><td className="border px-4 py-2 font-semibold">Mime Type:</td><td className="border px-4 py-2">{selectedMediaItem.mediaFile.mimeType}</td></tr>
                        <tr className="bg-gray-50"><td className="border px-4 py-2 font-semibold">Creation Time:</td><td className="border px-4 py-2">{new Date(selectedMediaItem.mediaFile.mediaFileMetadata.creationTime).toLocaleString()}</td></tr>
                        <tr className="bg-white"><td className="border px-4 py-2 font-semibold">Dimensions:</td><td className="border px-4 py-2">{selectedMediaItem.mediaFile.mediaFileMetadata.width} x {selectedMediaItem.mediaFile.mediaFileMetadata.height}</td></tr>

                        {selectedMediaItem.mediaFile.mediaFileMetadata.photoMetadata && ( 
                          <>
                            <tr className="bg-gray-50"><td className="border px-4 py-2 font-semibold">Camera Make:</td><td className="border px-4 py-2">{selectedMediaItem.mediaFile.mediaFileMetadata.photoMetadata.cameraMake || 'N/A'}</td></tr>
                            <tr className="bg-white"><td className="border px-4 py-2 font-semibold">Camera Model:</td><td className="border px-4 py-2">{selectedMediaItem.mediaFile.mediaFileMetadata.photoMetadata.cameraModel || 'N/A'}</td></tr>
                            <tr className="bg-gray-50"><td className="border px-4 py-2 font-semibold">Focal Length:</td><td className="border px-4 py-2">{selectedMediaItem.mediaFile.mediaFileMetadata.photoMetadata.focalLength || 'N/A'}</td></tr>
                            <tr className="bg-white"><td className="border px-4 py-2 font-semibold">Aperture:</td><td className="border px-4 py-2">{selectedMediaItem.mediaFile.mediaFileMetadata.photoMetadata.apertureFNumber || 'N/A'}</td></tr>
                            <tr className="bg-gray-50"><td className="border px-4 py-2 font-semibold">ISO:</td><td className="border px-4 py-2">{selectedMediaItem.mediaFile.mediaFileMetadata.photoMetadata.isoEquivalent || 'N/A'}</td></tr>
                            <tr className="bg-white"><td className="border px-4 py-2 font-semibold">Exposure Time:</td><td className="border px-4 py-2">{selectedMediaItem.mediaFile.mediaFileMetadata.photoMetadata.exposureTime || 'N/A'}</td></tr>
                          </>
                        )}

                        {selectedMediaItem.mediaFile.mediaFileMetadata.videoMetadata && (
                          <>
                            <tr className="bg-gray-50"><td className="border px-4 py-2 font-semibold">Duration:</td><td className="border px-4 py-2">{(selectedMediaItem.mediaFile.mediaFileMetadata.videoMetadata.durationMillis / 1000).toFixed(1)} s</td></tr>
                            <tr className="bg-white"><td className="border px-4 py-2 font-semibold">FPS:</td><td className="border px-4 py-2">{selectedMediaItem.mediaFile.mediaFileMetadata.videoMetadata.fps || 'N/A'}</td></tr>
                          </>
                        )}
                      </tbody>
                    </table>
                  </>
                )}
            </div>
          </div>
        </div>
      )}

      <div className="text-right w-full max-w-4xl mt-8">
        <button
          onClick={handleDisconnectClick}
          className="inline-block px-4 py-2 rounded-md font-semibold text-white bg-gray-700 shadow-md hover:bg-gray-600 transition-colors duration-200 cursor-pointer">
          Disconnect
        </button>
      </div>
    </div>
  );
}

export default ListPage;