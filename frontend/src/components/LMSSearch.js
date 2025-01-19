import React, { useState } from 'react';
import axios from 'axios';

function LMSSearch({ onMediaSelect }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const searchLMS = async () => {
    if (!searchQuery.trim()) return;
    
    const requestBody = {
      id: 1,
      method: "slim.request",
      params: [
        "",
        ["search", 0, 10, "term:" + searchQuery]
      ]
    };

    setIsLoading(true);
    try {
      const response = await axios({
        method: 'post',
        url: `${process.env.REACT_APP_SERVER_HOST}:${process.env.REACT_APP_BACKEND_PORT}/lms/jsonrpc.js`,
        data: requestBody,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      // Traiter les résultats des pistes et des albums
      const tracks = response.data.result.tracks_loop?.map(track => ({
        title: track.track,
        id: track.track_id,
        type: 'track',
        displayTitle: `🎵 ${track.track}`,
        url: `trackid:${track.track_id}`
      })) || [];

      const albums = response.data.result.albums_loop?.map(album => ({
        title: album.album,
        id: album.album_id,
        type: 'album',
        displayTitle: `📀 ${album.album}`,
        url: `albumid:${album.album_id}`
      })) || [];

      // Combiner les résultats
      setSearchResults([...tracks, ...albums]);
    } catch (error) {
      console.error('Erreur détaillée:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        headers: error.response?.headers,
        config: error.config
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (item) => {
    console.log('Item sélectionné dans LMSSearch:', {
        item,
        displayTitle: item.displayTitle,
        url: item.url
    });
    
    const mediaInfo = {
        type: 'lms',
        mediaType: 'lms',
        media: item.url,
        title: item.displayTitle
    };
    
    console.log('MediaInfo envoyé à NFCAssociation:', mediaInfo);
    onMediaSelect(mediaInfo);
  };

  return (
    <div className="w-full">
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && searchLMS()}
          placeholder="Rechercher dans la bibliothèque..."
          className="flex-1 p-2 border rounded"
        />
        <button
          onClick={searchLMS}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
        >
          {isLoading ? 'Recherche...' : 'Rechercher'}
        </button>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {searchResults.map((item, index) => (
          <div
            key={index}
            onClick={() => handleSelect(item)}
            className="p-2 border rounded cursor-pointer hover:bg-gray-100 flex justify-between items-center"
          >
            <div>
              <div className="font-medium">{item.displayTitle}</div>
            </div>
            <button
              className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
              onClick={(e) => {
                e.stopPropagation();
                handleSelect(item);
              }}
            >
              Sélectionner
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default LMSSearch; 