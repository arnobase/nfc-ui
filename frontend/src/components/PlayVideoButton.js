import React from 'react';
import axios from 'axios';
//import https from 'https'; // Importer le module https
import { PlayIcon } from '@heroicons/react/24/solid'; // Importer l'icône Play de Heroicons v2

const PlayVideoButton = ({ youtubeUrl, onLog }) => {
    const BACKEND_URL = process.env.REACT_APP_SERVER_HOST+":"+process.env.REACT_APP_BACKEND_PORT;
    const playVideoOnRemoteDevice = () => {
        if (youtubeUrl) {
            const remoteUrl = BACKEND_URL+`/lms-play?content=${encodeURIComponent(youtubeUrl)}`;
            
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
        <button onClick={playVideoOnRemoteDevice}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.91 11.672a.375.375 0 0 1 0 .656l-5.603 3.113a.375.375 0 0 1-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112Z" />
            </svg>

            
        </button>

    );
};

export default PlayVideoButton;
