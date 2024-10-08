import React, { useState, useEffect } from 'react';

import NfcReader from './NfcReader'; // Importer le composant
import LogDisplay from './LogDisplay'; // Importer le composant LogDisplay
import PlayVideoButton from './PlayVideoButton'; // Importer le composant PlayVideoButton
import AssociationsList from './AssociationsList'; // Importer le composant AssociationsList
import axios from 'axios'; // Importer axios pour les requêtes HTTP
import Button from './Button'; // Importer le composant Button
//import { YOUTUBE_API_KEY } from '../config'; // Importer la clé API depuis le fichier de configuration



function NfcAssociation() {
  const [nfcId, setNfcId] = useState(''); // Initialiser nfcId à une chaîne vide
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [messages, setMessages] = useState(''); // État pour stocker les messages
  const [associations, setAssociations] = useState([]); // État pour stocker les associations
  const [isScanning, setIsScanning] = useState(false); // État pour gérer la lecture NFC
  const [selectedResultId, setSelectedResultId] = useState(null); // État pour l'élément sélectionné

  const BACKEND_URL = process.env.REACT_APP_SERVER_HOST+":"+process.env.REACT_APP_BACKEND_PORT;

  useEffect(() => {
    fetchAssociations(); // Récupérer les associations au chargement du composant
  }, []);

  const fetchAssociations = async () => {
    try {
      const response = await axios.get(BACKEND_URL+'/get-associations');
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
    setSelectedVideo({
      videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails.default.url,
      isVideo
    });
    setSelectedResultId(item.id.videoId || item.id.playlistId); // Mettre à jour l'ID de l'élément sélectionné
  };

  const saveAssociation = async () => {
    if (!selectedVideo) return;

    const youtubeUrl = selectedVideo.isVideo
      ? `https://www.youtube.com/watch?v=${selectedVideo.videoId}`
      : `https://www.youtube.com/playlist?list=${selectedVideo.videoId}`;

    try {
      const response = await fetch(BACKEND_URL+'/save-association', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ nfcId, youtubeUrl })
      });
      const data = await response.json();
      console.log('Association enregistrée:', data);
      
      // Réinitialiser le formulaire après l'enregistrement
      setNfcId(''); // Réinitialiser nfcId à une chaîne vide
      setSearchQuery('');
      setSearchResults([]);
      setSelectedVideo(null);
      setSelectedResultId(null); // Réinitialiser l'élément sélectionné
      
      // Récupérer à nouveau les associations après l'enregistrement
      await fetchAssociations(); // Attendre que les associations soient récupérées
    } catch (error) {
      console.log('Erreur:', error);
    }
  };

  return (
    <div className="flex flex-col items-center"> {/* Centrer le contenu */}
       {/* Ajouter le composant NfcReader */}
      
      {/* Alignement horizontal pour le NFC ID et le bouton */}
      <div className="flex items-center mt-2"> 
        <input 
          type="text" 
          id="nfc-id" 
          value={nfcId} 
          readOnly 
          placeholder={isScanning ? "attente du NFC..." : ""} // Placeholder conditionnel
          className="border border-gray-300 rounded-lg p-2 mr-2" // Champ texte pour le NFC ID
        />
        <NfcReader 
          pageLog={pageLog} 
          onTagRead={handleTagRead} 
          isScanning={isScanning} 
          setIsScanning={setIsScanning} 
          setNfcId={setNfcId} // Passer setNfcId en prop
        /> {/* Bouton pour démarrer la lecture NFC */}
      </div>

      {/* Alignement horizontal pour la recherche YouTube */}
      <div className="flex items-center mt-2"> 
        <input
          type="text"
          id="youtube-search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher sur YouTube" // Déplacer le label ici
          className="border border-gray-300 rounded-lg p-2 mr-2" // Ajouter un cadre autour de l'input de recherche
        />
        <Button onClick={searchYouTube}>Rechercher</Button>
      </div>

      <div id="youtube-results" className="mt-2 w-full max-w-md"> {/* Conteneur pour les résultats */}
        {searchResults.map((item, index) => (
          <div
            key={item.id.videoId || item.id.playlistId}
            onClick={() => selectResult(item)}
            className={`flex items-center p-2 cursor-pointer ${selectedResultId === (item.id.videoId || item.id.playlistId) ? 'bg-gray-200' : ''}`} // Fond grisé pour l'élément sélectionné
          >
            <img 
              src={item.snippet.thumbnails.default.url} 
              alt={item.snippet.title} 
              className="w-12 h-12 mr-2 rounded" // Image miniature réduite
            />
            <h3 className="text-sm font-semibold">{item.snippet.title}</h3> {/* Taille de texte réduite */}
            {index < searchResults.length - 1 && <hr className="my-2 border-t border-gray-300" />} {/* Ligne de séparation */}
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
          {/* Ajouter le bouton pour lire la vidéo sur le périphérique distant */}
          <PlayVideoButton youtubeUrl={`https://www.youtube.com/watch?v=${selectedVideo.videoId}`} onLog={pageLog} />
        </div>
      )}
      <Button 
        onClick={saveAssociation} 
        className="mb-4" 
        disabled={!nfcId || !selectedVideo} // Désactiver le bouton si nfcId est vide ou aucun élément sélectionné
      >
        Enregistrer l'association
      </Button> {/* Ajout de padding en bas */}

      <AssociationsList associations={associations} onLog={pageLog} />
    </div>
  );
}

export default NfcAssociation;