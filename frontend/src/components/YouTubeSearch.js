import React, { useState } from 'react';
import Button from './Button'; // Assurez-vous d'importer le composant Button

function YouTubeSearch({ onVideoSelect }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);

  const searchYouTube = async () => {
    const apiKey = process.env.REACT_APP_YOUTUBE_API_KEY;
    console.log("apiKey", apiKey);
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${searchQuery}&type=video,playlist&key=${apiKey}`;

    try {
      const response = await fetch(url);
      const data = await response.json();
      setSearchResults(data.items);
    } catch (error) {
      console.log('Erreur:', error);
    }
  };

  const selectResult = (item) => {
    const isVideo = item.id.kind === 'youtube#video';
    const videoId = isVideo ? item.id.videoId : item.id.playlistId;
    const video = {
      videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails.default.url,
      isVideo
    };
    setSelectedVideo(video);
    onVideoSelect(video); // Passer la vidéo sélectionnée au parent
  };

  return (
    <div>
      <div className="flex items-center mt-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher sur YouTube"
          className="border border-gray-300 rounded-lg p-2 mr-2"
        />
        <Button onClick={searchYouTube}>Rechercher</Button>
      </div>
      <div id="youtube-results" className="mt-2 w-full max-w-md">
        {searchResults.map((item, index) => (
          <div
            key={item.id.videoId || item.id.playlistId}
            onClick={() => selectResult(item)}
            className={`flex items-center p-2 cursor-pointer ${selectedVideo && selectedVideo.videoId === (item.id.videoId || item.id.playlistId) ? 'bg-gray-200' : ''}`}
          >
            <img
              src={item.snippet.thumbnails.default.url}
              alt={item.snippet.title}
              className="w-12 h-12 mr-2 rounded"
            />
            <h3 className="text-sm font-semibold">{item.snippet.title}</h3>
            {index < searchResults.length - 1 && <hr className="my-2 border-t border-gray-300" />}
          </div>
        ))}
      </div>
      {selectedVideo && (
        <div className="selected-video-preview mt-4">
          <iframe
            width="100%"
            height="auto"
            title={`Video: ${selectedVideo.title}`}
            src={`https://www.youtube.com/embed/${selectedVideo.videoId}`}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}
    </div>
  );
}

export default YouTubeSearch;
