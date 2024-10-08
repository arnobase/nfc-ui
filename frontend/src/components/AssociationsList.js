import React, { useEffect, useState } from 'react';
import axios from 'axios';
import PlayVideoButton from './PlayVideoButton'; // Importer le composant PlayVideoButton

const AssociationsList = () => {
  const BACKEND_URL = process.env.REACT_APP_SERVER_HOST+":"+process.env.REACT_APP_BACKEND_PORT;
  const [associations, setAssociations] = useState([]);
  /*
  // Configurer Axios pour ignorer les erreurs de certificat
  const agent = new https.Agent({  
    rejectUnauthorized: false // Ignorer les erreurs de certificat
  });
  */

  useEffect(() => {
    const fetchAssociations = async () => {
      try {
        const response = await axios.get(BACKEND_URL+'/get-associations');  // Assurez-vous que l'URL est correcte
        setAssociations(response.data);
      } catch (error) {
        console.error('Error fetching associations:', error);
      }
    };

    fetchAssociations();
  }, []);

  const deleteAssociation = async (nfcId) => {
    // Demander une confirmation avant de supprimer
    const confirmDelete = window.confirm('Êtes-vous sûr de vouloir supprimer cette association ?');
    if (!confirmDelete) {
      return; // Annuler la suppression si l'utilisateur ne confirme pas
    }

    try {
      await axios.delete(BACKEND_URL+`/delete-association/${nfcId}`);  // Assurez-vous que l'URL est correcte
      setAssociations(associations.filter(association => association.nfcId !== nfcId));
    } catch (error) {
      console.error('Error deleting association:', error);
    }
  };

  if (!associations.length) {
    return <p>No associations available.</p>;
  }

  return (
    <div className="space-y-4"> {/* Espacement entre les éléments */}
      {associations.map((association) => (
        <div key={association.nfcId} className="flex items-center p-4 border border-gray-300 rounded-lg shadow-md"> {/* Conteneur flex */}
          <div className="mr-4"> {/* Espacement à droite */}
            <a href={association.youtubeUrl} target="_blank" rel="noopener noreferrer">
              <img
                src={association.thumbnailUrl || `https://img.youtube.com/vi/${association.youtubeUrl.split('v=')[1]}/default.jpg`} // Utiliser l'URL de la miniature
                alt={association.videoTitle ? association.videoTitle : `Thumbnail for ${association.nfcId}`}
                className="w-32 h-18 object-cover" // Taille de l'image
              />
            </a>
            <div className="flex items-baseline mt-2 justify-center">
              <PlayVideoButton youtubeUrl={association.youtubeUrl} onLog={(message) => console.log(message)} />
              <button onClick={() => deleteAssociation(association.nfcId)} className="ml-3 mt-2 text-red-500 hover:underline">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                </svg>
              </button>
            </div>
          </div>
          <div className="flex-1 items-start"> {/* Prendre tout l'espace restant */}
            <p className="font-semibold">{association.videoTitle ? association.videoTitle : 'No title available'}</p>
            <p>{association.nfcId}</p> {/* Afficher le tag NFC */}
            <p><a href={association.youtubeUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{association.youtubeUrl}</a></p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AssociationsList;