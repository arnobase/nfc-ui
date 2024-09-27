import React, { useState, useEffect } from 'react';
import NfcReader from './NfcReader'; // Importer le composant
import LogDisplay from './LogDisplay'; // Importer le composant LogDisplay
import PlayVideoButton from './PlayVideoButton'; // Importer le composant PlayVideoButton
import AssociationsList from './AssociationsList'; // Importer le composant AssociationsList
import axios from 'axios'; // Importer axios pour les requêtes HTTP
//import https from 'https'; // Importer le module https

function NfcAssociation() {
  const [nfcId, setNfcId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [messages, setMessages] = useState(''); // État pour stocker les messages
  const [associations, setAssociations] = useState([]); // État pour stocker les associations

  useEffect(() => {
    setNfcId(generateRandomNfcId());
    fetchAssociations(); // Récupérer les associations au chargement du composant
  }, []);

  const generateRandomNfcId = () => {
    return 'NFC-' + Math.random().toString(36).substr(2, 9).toUpperCase();
  };

  const fetchAssociations = async () => {
    try {
      /*
      // Configurer Axios pour ignorer les erreurs de certificat
      const agent = new https.Agent({  
        rejectUnauthorized: false // Ignorer les erreurs de certificat
      });
    */
      const response = await axios.get('https://192.168.1.14:3001/get-associations');
      setAssociations(response.data);
    } catch (error) {
      console.error('Erreur lors de la récupération des associations:', error);
      pageLog('Erreur lors de la récupération des associations.');
    }
  };

  const handleTagRead = (id) => {
    setNfcId(id); // Mettre à jour l'identifiant du tag avec celui lu
    pageLog(`Tag lu : ${id}`); // Ajouter un message lorsque le tag est lu
  };

  const pageLog = (message) => {
    setMessages((prevMessages) => prevMessages + message + '\n'); // Ajouter le message à l'état
  };

  const searchYouTube = async () => {
    const apiKey = 'AIzaSyAOxhKaJJVjK6iUA3NPNQdjRzXTA_tHu04';
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
    setSelectedVideo({
      videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails.default.url,
      isVideo
    });
  };

  const saveAssociation = async () => {
    if (!selectedVideo) return;

    const youtubeUrl = selectedVideo.isVideo
      ? `https://www.youtube.com/watch?v=${selectedVideo.videoId}`
      : `https://www.youtube.com/playlist?list=${selectedVideo.videoId}`;

    try {
      const response = await fetch('https://192.168.1.14:3001/save-association', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ nfcId, youtubeUrl })
      });
      const data = await response.json();
      console.log('Association enregistrée:', data);
      // Réinitialiser le formulaire après l'enregistrement
      setNfcId(generateRandomNfcId());
      setSearchQuery('');
      setSearchResults([]);
      setSelectedVideo(null);
      fetchAssociations(); // Récupérer à nouveau les associations après l'enregistrement
    } catch (error) {
      console.log('Erreur:', error);
    }
  };

  return (
    <div>
      <h1>Associer NFC à YouTube</h1>
      <NfcReader pageLog={pageLog} onTagRead={handleTagRead} /> {/* Ajouter le composant NfcReader */}
      <div>
        <label htmlFor="nfc-id">Identifiant du tag NFC :</label>
        <input type="text" id="nfc-id" value={nfcId} readOnly />
      </div>
      <div>
        <label htmlFor="youtube-search">Rechercher sur YouTube :</label>
        <input
          type="text"
          id="youtube-search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <button onClick={searchYouTube}>Rechercher</button>
      </div>
      <div id="youtube-results">
        {searchResults.map((item) => (
          <div
            key={item.id.videoId || item.id.playlistId}
            onClick={() => selectResult(item)}
            style={{ cursor: 'pointer', border: selectedVideo && selectedVideo.videoId === (item.id.videoId || item.id.playlistId) ? '2px solid blue' : 'none' }}
          >
            <h3>{item.snippet.title}</h3>
          </div>
        ))}
      </div>
      {selectedVideo && (
        <div className="selected-video-preview">
          <img src={selectedVideo.thumbnail} alt={selectedVideo.title} />
          <iframe
            width="200"
            height="113"
            title={`Video: ${selectedVideo.title}`}
            src={`https://www.youtube.com/embed/${selectedVideo.videoId}`}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
          {/* Ajouter le bouton pour lire la vidéo sur le périphérique distant */}
          <PlayVideoButton youtubeUrl={`https://www.youtube.com/watch?v=${selectedVideo.videoId}`} onLog={pageLog} />
        </div>
      )}
      <button onClick={saveAssociation}>Enregistrer l'association</button>
      {/* Inclure le composant LogDisplay pour afficher les messages */}
      <LogDisplay messages={messages} />
      {/* Inclure le composant AssociationsList pour afficher les associations */}
      <AssociationsList associations={associations} onLog={pageLog} />
    </div>
  );
}

export default NfcAssociation;
