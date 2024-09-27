import React from 'react';
import axios from 'axios';
//import https from 'https'; // Importer le module https

const PlayVideoButton = ({ youtubeUrl, onLog }) => {
    const playVideoOnRemoteDevice = () => {
        if (youtubeUrl) {
            const remoteUrl = `https://192.168.1.14:3001/lms/anyurl?p0=playlist&p1=play&p2=${encodeURIComponent(youtubeUrl)}`;
            
            /*
            // Configurer Axios pour ignorer les erreurs de certificat
            const agent = new https.Agent({  
                rejectUnauthorized: false // Ignorer les erreurs de certificat
            });
            */

            // Effectuer une requête pour lire la vidéo sur le périphérique distant
            //axios.get(remoteUrl, { httpsAgent: agent })
            axios.get(remoteUrl, )
                .then(response => {
                    onLog('Commande envoyée au périphérique distant pour lire la vidéo.');
                })
                .catch(error => {
                    console.error('Erreur lors de l\'envoi de la commande au périphérique distant:', error);
                    onLog('Erreur lors de l\'envoi de la commande au périphérique distant.');
                });
        } else {
            onLog('Aucune URL YouTube disponible pour lire la vidéo.');
        }
    };

    return (
        <button onClick={playVideoOnRemoteDevice}>Lire la vidéo sur le périphérique distant</button>
    );
};

export default PlayVideoButton;
