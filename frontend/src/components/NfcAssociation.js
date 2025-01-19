import React, { useState, useEffect } from 'react';
import NfcReader from './NfcReader';
import LogDisplay from './LogDisplay';
import PlayVideoButton from './PlayVideoButton';
import YouTubeSearch from './YouTubeSearch';
import FileUploader from './FileUploader';
import axios from 'axios';
import Button from './Button';
import Tabs from './Tabs'; // Importer le composant Tabs
import ReadingsList from './ReadingsList'; // Importer le composant ReadingsList
import LMSSearch from './LMSSearch';

function NfcAssociation() {
  const [nfcId, setNfcId] = useState('');
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [messages, setMessages] = useState('');
  const [associations, setAssociations] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [existingTitle, setExistingTitle] = useState('');
  const [readings, setReadings] = useState([]); // État pour l'historique des lectures
  const [activeTab, setActiveTab] = useState('youtube'); // État pour l'onglet actif
  const [sortByReadings, setSortByReadings] = useState({ 
    column: 'timestamp', 
    direction: 'desc'  // Changer 'asc' en 'desc' pour le tri par défaut
  }); // État pour le tri des lectures

  // Enlever le protocole de l'URL pour WSS
  const SERVER_HOST = process.env.REACT_APP_SERVER_HOST.replace(/^https?:\/\//, '');
  const BACKEND_URL = `${process.env.REACT_APP_SERVER_HOST}:${process.env.REACT_APP_BACKEND_PORT}`;
  const WSS_URL = `wss://${SERVER_HOST}:${process.env.REACT_APP_BACKEND_PORT}`; // Créer la variable WSS_URL

  useEffect(() => {
    fetchAssociations();
    fetchReadings(); // Récupérer l'historique des lectures au chargement

    // Créer une nouvelle connexion WebSocket
    const ws = new WebSocket(WSS_URL); // Utiliser WSS_URL pour la connexion WebSocket

    // Gérer les événements de connexion
    ws.onopen = () => {
      console.log('WebSocket connecté');
    };

    // Gérer les messages reçus
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data); // Supposons que le message soit au format JSON
      console.log('Message reçu:', message);

      // Vérifier si l'association a été trouvée
      if (!message.associationFound) {
        setNfcId(message.nfcId); // Placer l'ID du tag dans le champ nfcId
      }

      // Toujours rafraîchir la liste des lectures
      fetchReadings(); // Rafraîchir la liste des lectures dans tous les cas
    };

    // Gérer les erreurs
    ws.onerror = (error) => {
      console.error('Erreur WebSocket:', error);
    };

    // Gérer la déconnexion
    ws.onclose = () => {
      console.log('WebSocket déconnecté');
    };

    // Nettoyer la connexion WebSocket à la désinstallation du composant
    return () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    if (nfcId) {
      checkExistingAssociation(nfcId);
    } else {
      setExistingTitle('');
    }
  }, [nfcId]);

  const fetchAssociations = async () => {
    try {
      const response = await axios.get(BACKEND_URL + '/get-associations');
      setAssociations(response.data);
    } catch (error) {
      console.error('Erreur lors de la récupération des associations:', error);
      pageLog('Erreur lors de la récupération des associations.');
    }
  };

  const fetchReadings = async () => {
    try {
      const response = await axios.get(BACKEND_URL + '/get-readings');
      setReadings(response.data);
    } catch (error) {
      console.error('Erreur lors de la récupération des lectures:', error);
      pageLog('Erreur lors de la récupération des lectures.');
    }
  };

  const checkExistingAssociation = (id) => {
    const association = associations.find(assoc => assoc.nfcId === id);
    if (association) {
      setExistingTitle(association.title);
    } else {
      setExistingTitle('');
    }
  };

  const handleTagRead = (id) => {
    setNfcId(id);
    pageLog(`Tag lu : ${id}`);
  };

  const pageLog = (message) => {
    setMessages((prevMessages) => prevMessages + message + '\n');
  };

  const handleMediaSelect = (mediaInfo) => {
    console.log('MediaInfo reçu dans NfcAssociation:', mediaInfo);
    
    // Vérifier que toutes les propriétés sont présentes
    if (!mediaInfo.title) {
        console.error('Titre manquant dans mediaInfo:', mediaInfo);
    }
    
    const selectedMediaData = {
        media: mediaInfo.media,
        mediaType: mediaInfo.mediaType,
        title: mediaInfo.title  // S'assurer que le titre est bien passé
    };
    
    console.log('Data à sauvegarder dans state:', selectedMediaData);
    setSelectedMedia(selectedMediaData);
  };

  const handleSave = async () => {
    if (!nfcId || !selectedMedia) return;

    // Vérifier que le titre est présent
    if (!selectedMedia.title) {
        console.error('Titre manquant dans selectedMedia:', selectedMedia);
        return;
    }

    const dataToSend = {
        nfcId,
        media: selectedMedia.media,
        mediaType: selectedMedia.mediaType,
        title: selectedMedia.title
    };

    console.log('Données à envoyer à /save-association:', dataToSend);

    try {
        const response = await axios.post(
            `${process.env.REACT_APP_SERVER_HOST}:${process.env.REACT_APP_BACKEND_PORT}/save-association`,
            dataToSend
        );

        console.log('Réponse de /save-association:', response.data);

        // Vérifier que le titre a été correctement sauvegardé
        if (response.data.title !== selectedMedia.title) {
            console.error('Titre non sauvegardé correctement:', {
                envoyé: selectedMedia.title,
                reçu: response.data.title
            });
        }

        // Réinitialiser le formulaire
        setNfcId('');
        setSelectedMedia(null);
        setExistingTitle('');

        // Rafraîchir la liste des associations
        await fetchAssociations();

        // Afficher un message de confirmation
        pageLog(`Association ${nfcId} enregistrée avec succès`);

    } catch (error) {
        console.error('Erreur lors de la sauvegarde:', error);
        pageLog(`Erreur lors de l'enregistrement de l'association: ${error.message}`);
    }
  };

  const handleFileSelect = (file) => {
    setSelectedMedia({
      type: 'file',
      media: file.name,
      title: file.name
    });
  };

  const handleUploadSuccess = (uploadData) => {
    console.log('Upload success data:', uploadData);
    setSelectedMedia({
      type: 'file',
      media: uploadData.filename,
      title: uploadData.filename
    });
    pageLog(`Fichier téléchargé: ${uploadData.message}`);
  };

  const handleVideoSelect = (video) => {
    setSelectedMedia({
      type: 'youtube',
      media: `https://www.youtube.com/watch?v=${video.videoId}`,
      title: video.title
    });
  };

  // Fonction pour gérer l'édition d'un tag
  const handleEditTag = (id) => {
    const association = associations.find(assoc => assoc.nfcId === id);
    if (association) {
      setNfcId(association.nfcId);
      setSelectedMedia({
        type: association.mediaType,
        media: association.media,
        title: association.title
      });
      pageLog(`Édition du tag : ${id}`);
    }
  };

  // Fonction pour trier les lectures
  const sortedReadings = () => {
    const column = columns.find(col => col.accessor === sortByReadings.column);
    
    if (!column) {
        console.error('Column not found for accessor:', sortByReadings.column);
        return readings; // Retourner les lectures non triées si la colonne n'est pas trouvée
    }

    return [...readings].sort((a, b) => {
        const aValue = column.accessor instanceof Function ? column.accessor(a) : a[column.accessor];
        const bValue = column.accessor instanceof Function ? column.accessor(b) : b[column.accessor];

        if (aValue < bValue) {
            return sortByReadings.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
            return sortByReadings.direction === 'asc' ? 1 : -1;
        }
        return 0;
    });
  };

  // Fonction pour changer le critère de tri des lectures
  const handleSortReadings = (columnAccessor) => {
    setSortByReadings((prev) => ({
      column: columnAccessor, // Utiliser la chaîne de caractères
      direction: prev.column === columnAccessor && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const columns = [
    {
      Header: 'Titre',
      accessor: 'title', // clé de l'objet
    },
    {
      Header: 'NFC ID',
      accessor: 'nfcId',
    },
    {
      Header: 'Timestamp',
      accessor: 'timestamp',
      Cell: ({ value }) => new Date(value).toLocaleString(), // Formater la date
    },
  ];

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center mt-2">
        <input
          type="text"
          id="nfc-id"
          value={nfcId}
          onChange={(e) => setNfcId(e.target.value)}
          placeholder={isScanning ? "attente du NFC..." : ""}
          className="border border-gray-300 rounded-lg p-2 mr-2"
        />
        <NfcReader
          pageLog={pageLog}
          onTagRead={handleTagRead}
          isScanning={isScanning}
          setIsScanning={setIsScanning}
          setNfcId={setNfcId}
        />
      </div>

      {existingTitle && (
        <div className="mt-2 text-green-600">
          Titre existant pour ce tag : {existingTitle}
        </div>
      )}

      <div className="flex mt-4 space-x-4">
        <button
          onClick={() => setActiveTab('youtube')}
          className={`px-4 py-2 rounded ${activeTab === 'youtube' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}
        >
          Associer YouTube
        </button>
        <button
          onClick={() => setActiveTab('file')}
          className={`px-4 py-2 rounded ${activeTab === 'file' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}
        >
          Envoyer un fichier
        </button>
        <button
          onClick={() => setActiveTab('lms')}
          className={`px-4 py-2 rounded ${activeTab === 'lms' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}
        >
          Recherche LMS
        </button>
      </div>

      <div className="w-full max-w-md mt-4 p-4 border rounded-lg shadow-sm">
        {activeTab === 'youtube' && (
          <YouTubeSearch onVideoSelect={handleVideoSelect} />
        )}

        {activeTab === 'file' && (
          <FileUploader 
            onUploadSuccess={handleUploadSuccess} 
            onFileSelect={handleFileSelect}
          />
        )}

        {activeTab === 'lms' && (
          <LMSSearch onMediaSelect={setSelectedMedia} />
        )}
      </div>

      {selectedMedia && (
        <div className="mt-2">Média sélectionné : {selectedMedia.title}</div>
      )}

      <Button
        onClick={handleSave}
        className="mb-4"
        disabled={!nfcId || !selectedMedia}
      >
        Enregistrer l'association
      </Button>

      {/* Intégrer le composant Tabs ici */}
      <Tabs 
        associations={associations} 
        readings={sortedReadings()} // Passer les lectures triées
        fetchAssociations={fetchAssociations} 
        pageLog={pageLog} 
        onEditTag={handleEditTag} // Passer la fonction d'édition
        onTagRead={handleTagRead} // Passer la fonction de lecture de tag
        onSortReadings={handleSortReadings} // Passer la fonction de tri
      />
     
    </div>
  );
}

export default NfcAssociation;
