/* global NDEFReader */
import React from 'react';

const NfcReader = ({ onTagRead, pageLog }) => {
  const startNfcScan = async () => {
    if ('NDEFReader' in window) { // Vérifier si NDEFReader est disponible
      try {
        const nfc = new NDEFReader();
        await nfc.scan();
        pageLog('NFC scan started successfully.');

        // Écouter l'événement de lecture du tag NFC
        nfc.onreading = (event) => {
          const tagId = event.serialNumber; // Récupérer l'identifiant du tag (ou d'autres données selon votre besoin)
          console.log('Tag ID:', tagId);
          onTagRead(tagId); // Appeler la fonction de rappel avec l'identifiant
        };
      } catch (error) {
        console.error('Error starting NFC scan:', error);
        alert('Erreur lors du démarrage de la lecture NFC. Assurez-vous que votre appareil prend en charge NFC et que l\'API est activée.');
      }
    } else {
      console.error('NDEFReader is not supported in this environment.');
      alert('NDEFReader n\'est pas supporté dans ce navigateur. Veuillez utiliser un navigateur compatible.');
    }
  };

  return (
    <button onClick={startNfcScan}>Démarrer la lecture NFC</button>
  );
};

export default NfcReader;
