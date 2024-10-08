import React, { useState } from 'react';
import NfcReader from './NfcReader'; // Importer le composant NfcReader
import LogDisplay from './LogDisplay'; // Importer le composant LogDisplay
import axios from 'axios'; // Importer axios pour les requêtes HTTP

function NfcPlay() {
    const [nfcId, setNfcId] = useState('');
    const [messages, setMessages] = useState(''); // État pour stocker les messages
    const [isScanning, setIsScanning] = useState(false);

    const BACKEND_URL = process.env.REACT_APP_SERVER_HOST+":"+process.env.REACT_APP_BACKEND_PORT;

    const handleTagRead = (id) => {
        setNfcId(id); // Mettre à jour l'identifiant du tag avec celui lu
        pageLog(`Tag lu : ${id}`); // Ajouter un message lorsque le tag est lu
        playVideo(id); // Appeler la fonction pour jouer la vidéo
    };

    const pageLog = (message) => {
        setMessages((prevMessages) => prevMessages + message + '\n'); // Ajouter le message à l'état
    };

    const playVideo = async (tagId) => {
        try {
            const response = await axios.get(BACKEND_URL+`/lms-play-nfc/${tagId}`);
            pageLog('Commande envoyée pour jouer la vidéo.');
        } catch (error) {
            console.error('Erreur lors de la lecture de la vidéo:', error);
            pageLog('Erreur lors de la lecture de la vidéo.');
        }
    };

    return (
        <div>
            <h1>Lire un tag NFC pour jouer une vidéo</h1>
            <NfcReader 
                pageLog={pageLog} 
                onTagRead={handleTagRead} 
                isScanning={isScanning} 
                setIsScanning={setIsScanning} 
                setNfcId={setNfcId} // Passer setNfcId en prop
            /> 
            
            <div>
                <label htmlFor="nfc-id">Identifiant du tag NFC :</label>
                <input type="text" id="nfc-id" value={nfcId} readOnly />
            </div>
            <LogDisplay messages={messages} /> {/* Inclure le composant LogDisplay pour afficher les messages */}
        </div>
    );
}

export default NfcPlay;
