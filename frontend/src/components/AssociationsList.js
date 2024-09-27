import React, { useEffect, useState } from 'react';
import axios from 'axios';
import PlayVideoButton from './PlayVideoButton'; // Importer le composant PlayVideoButton
//import https from 'https'; // Importer le module https

// http://192.168.1.29:9000/anyurl?p0=playlist&p1=play&p2=

const AssociationsList = () => {
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
        const response = await axios.get('https://192.168.1.14:3001/get-associations');  // Assurez-vous que l'URL est correcte
        setAssociations(response.data);
      } catch (error) {
        console.error('Error fetching associations:', error);
      }
    };

    fetchAssociations();
  }, []);

  const deleteAssociation = async (nfcId) => {
    try {
      await axios.delete(`https://192.168.1.14:3001/delete-association/${nfcId}`);  // Assurez-vous que l'URL est correcte
      setAssociations(associations.filter(association => association.nfcId !== nfcId));
    } catch (error) {
      console.error('Error deleting association:', error);
    }
  };

  if (!associations.length) {
    return <p>No associations available.</p>;
  }

  return (
    <div>
      {associations.map((association) => (
        <div key={association.nfcId}>
          <p>URL YouTube: <a href={association.youtubeUrl} target="_blank" rel="noopener noreferrer">{association.youtubeUrl}</a></p>
          <p>Title: {association.videoTitle ? association.videoTitle : 'No title available'}</p>
          <iframe
            title={association.videoTitle ? association.videoTitle : `YouTube video for ${association.nfcId}`}
            width="200"
            height="113"
            src={`https://www.youtube.com/embed/${association.youtubeUrl.split('v=')[1]}`}
          />
          
          {/* Ajouter le bouton pour lire la vidéo sur le périphérique distant */}
          <PlayVideoButton youtubeUrl={association.youtubeUrl} onLog={(message) => console.log(message)} />
          
          <button onClick={() => deleteAssociation(association.nfcId)}>Delete</button> {/* Delete button */}
        </div>
      ))}
    </div>
  );
};

export default AssociationsList;
