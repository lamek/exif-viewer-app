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

  const handleDisconnectClick = () => {
    localStorage.removeItem('googleAccessToken'); 
    navigate('/disconnect');
  };

  // Helper to safely get the date
  const getCreationTime = (item) => {
    // Try the deep metadata first
    const metaTime = item.mediaFile?.mediaFileMetadata?.creationTime;
    // Fallback to the root createTime if metadata is missing
    const rootTime = item.createTime;
    
    const timeToUse = metaTime || rootTime;
    return timeToUse ? new Date(timeToUse).toLocaleString() : 'N/A';
  };

  if (loading) {
    return <div className="p-8 text-gray-500 text-lg text-center">Loading media items...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-600 text-center">Error: {error}</div>;
  }

  if (mediaItems.length === 0) {
    return (
      <div className="p-8 flex flex-col items-center">
        <h1 className="text-xl pb-1 text-gray-600">Your Picked Media Items</h1>
        <p className="mt-4 text-gray-500">No media items were found for this session. Did you pick any?</p>
        <div className="flex space-x-4 mt-8">
            <button
                onClick={() => navigate('/picker', { replace: true })} 
                className="px-4 py-2 rounded-md font-semibold text-white bg-gray-700 shadow-md hover:bg-gray-600 transition-colors duration-200"
            >
                Change selection
            </button>
            <button 
                onClick={handleDisconnectClick} 
                className="px-4 py-2 rounded-md font-semibold text-white bg-gray-700 shadow-md hover:bg-gray-600 transition-colors duration-200"
            >
                Disconnect
            </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 flex flex-col items-center w-full text-white">
      <div className="w-full max-w-4xl">
        <div className="mx-2 mt-2 text-sm text-gray-400 font-bold mb-4 text-center">
            Click on an item to see details
        </div>
        <div className="text-center mb-8">
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
            className="w-36 h-36 flex items-center justify-center border border-gray-600 bg-gray-800 rounded-md shadow-sm cursor-pointer hover:shadow-xl hover:border-gray-400 transition-all duration-200 overflow-hidden"
            onClick={() => openModal(item)}
          >
            {item.mediaFile.baseUrl ? (
              <img
                src={`${PROXY_MEDIA_URL_CF_URL}?baseUrl=${encodeURIComponent(item.mediaFile.baseUrl)}&type=${item.type}&size=w144-h144-c&accessToken=${googleAccessToken}`}
                alt={item.mediaFile.filename || 'Media Item'}
                className="w-full h-full object-cover"
              />
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-700 rounded-md text-gray-400 text-xs text-center p-2">
                    No preview available
                </div>
            )}

          </div>
        ))}
      </div>

      {selectedMediaItem && (
        <div id="modal" className="fixed inset-0 z-50 overflow-hidden bg-black bg-opacity-90 flex items-center justify-center p-4">
          
          {/* Modal Container: Flex Col to separate Header from Content */}
          <div className="relative bg-white text-gray-800 rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col">
            
            {/* 1. Header Bar (Fixed at top of modal) */}
            <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg shrink-0">
                <h3 className="font-bold text-lg truncate pr-4" title={selectedMediaItem.mediaFile.filename}>
                    {selectedMediaItem.mediaFile.filename}
                </h3>
                <button
                onClick={closeModal}
                className="px-3 py-1 bg-red-100 text-red-600 hover:bg-red-600 hover:text-white rounded-md transition-colors text-sm font-semibold"
                >
                Close
                </button>
            </div>

            {/* 2. Scrollable Content Area */}
            <div className="overflow-y-auto p-6">
                <div className="flex flex-col items-center text-center">

                    {modalLoading && <p className="text-lg text-gray-500 my-8">Loading high-res media...</p>}
                    {modalError && <p className="text-lg text-red-600 my-8">Error: {modalError}</p>}

                    {!modalLoading && !modalError && modalMediaUrl && (
                    selectedMediaItem.type === "VIDEO" ? (
                        <video controls src={modalMediaUrl} className="max-w-full max-h-[50vh] object-contain mb-6 rounded shadow-md">
                        Your browser does not support the video tag.
                        </video>
                    ) : (
                        <img
                        src={modalMediaUrl}
                        alt={selectedMediaItem.mediaFile.filename || 'Media Item'}
                        className="max-w-full max-h-[50vh] object-contain mb-6 rounded shadow-md"
                        />
                    )
                    )}

                    {selectedMediaItem.mediaFile.mediaFileMetadata && (
                    <div className="w-full text-left">
                        <h3 className="text-lg font-bold mb-3 border-b pb-1">Metadata Details</h3>
                        <table className="table-auto text-sm text-left border-collapse border border-gray-300 w-full">
                        <tbody>
                            <tr className="bg-white"><td className="border px-4 py-2 font-semibold w-1/3">Mime Type:</td><td className="border px-4 py-2">{selectedMediaItem.mediaFile.mimeType}</td></tr>
                            
                            {/* UPDATED DATE LOGIC HERE */}
                            <tr className="bg-gray-50"><td className="border px-4 py-2 font-semibold">Creation Time:</td><td className="border px-4 py-2">{getCreationTime(selectedMediaItem)}</td></tr>
                            
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
                    </div>
                    )}
                </div>
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