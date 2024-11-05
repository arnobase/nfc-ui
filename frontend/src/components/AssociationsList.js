import React, { useState } from 'react';
import axios from 'axios';
import PlayVideoButton from './PlayVideoButton';

function AssociationsList({ associations, onLog, onAssociationsChange, onEditTag }) {
  const [selectedAssociation, setSelectedAssociation] = useState(null);
  const BACKEND_URL = process.env.REACT_APP_SERVER_HOST + ":" + process.env.REACT_APP_BACKEND_PORT;

  const handlePlay = async (association) => {
    try {
      const response = await axios.get(`${BACKEND_URL}/lms-play-nfc/${association.nfcId}`);
      onLog(`Lecture de ${association.title}`);
    } catch (error) {
      console.error('Erreur lors de la lecture:', error);
      onLog(`Erreur lors de la lecture de ${association.title}`);
    }
  };

  const handleDelete = async (nfcId) => {
    try {
      await axios.delete(`${BACKEND_URL}/delete-association/${nfcId}`);
      onLog(`Association avec NFC ID ${nfcId} supprimée`);
      onAssociationsChange();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      onLog(`Erreur lors de la suppression de l'association avec NFC ID ${nfcId}`);
    }
  };

  const handleSelect = (association) => {
    setSelectedAssociation(association === selectedAssociation ? null : association);
  };

  return (
    <div className="mt-4 w-full max-w-4xl">
      <h2 className="text-xl font-bold mb-2">Associations enregistrées</h2>
      <ul className="space-y-4">
        {associations.map((association) => (
          <li key={association.nfcId} className="border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="flex justify-between items-center">
              <div>
                <span className="font-semibold">NFC ID:</span> {association.nfcId}
                <br />
                <span className="font-semibold">Type:</span> {association.mediaType}
                <br />
                <span className="font-semibold">Titre:</span> {association.title}
              </div>
              <div className="space-x-2">
                {association.mediaType === 'youtube' ? (
                  <PlayVideoButton youtubeUrl={association.media} onLog={onLog} />
                ) : (
                  <button
                    onClick={() => handlePlay(association)}
                    className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition-colors duration-200"
                  >
                    Jouer
                  </button>
                )}
                <button
                  onClick={() => handleDelete(association.nfcId)}
                  className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition-colors duration-200"
                >
                  Supprimer
                </button>
                <button
                  onClick={() => handleSelect(association)}
                  className="bg-gray-200 text-gray-800 px-3 py-1 rounded hover:bg-gray-300 transition-colors duration-200"
                >
                  {selectedAssociation === association ? 'Masquer' : 'Aperçu'}
                </button>
                <button
                  onClick={() => onEditTag(association.nfcId)}
                  className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 transition-colors duration-200"
                >
                  Modifier tag
                </button>
              </div>
            </div>
            {selectedAssociation === association && association.mediaType === 'youtube' && (
              <div className="mt-4">
                <iframe
                  width="100%"
                  height="315"
                  src={`https://www.youtube.com/embed/${association.media.split('v=')[1]}`}
                  title={association.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default AssociationsList;
