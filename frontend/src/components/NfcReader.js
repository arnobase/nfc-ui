/* global NDEFReader */
import React from 'react';
import Button from './Button'; // Importer le composant Button

const NfcReader = ({ onTagRead, pageLog, isScanning, setIsScanning, setNfcId }) => {
  const startNfcScan = async () => {
    if ('NDEFReader' in window) { // Vérifier si NDEFReader est disponible
      try {
        const nfc = new NDEFReader();
        await nfc.scan();
        setIsScanning(true); // Indiquer que la lecture NFC a commencé
        pageLog('NFC scan started successfully.');

        // Réinitialiser le nfcId à une chaîne vide
        setNfcId(''); // Vider le champ NFC ID

        // Écouter l'événement de lecture du tag NFC
        nfc.onreading = (event) => {
          const tagId = event.serialNumber; // Récupérer l'identifiant du tag (ou d'autres données selon votre besoin)
          console.log('Tag ID:', tagId);
          onTagRead(tagId); // Appeler la fonction de rappel avec l'identifiant
          setIsScanning(false); // Réinitialiser l'état après la lecture
        };
      } catch (error) {
        console.error('Error starting NFC scan:', error);
        alert('Erreur lors du démarrage de la lecture NFC. Assurez-vous que votre appareil prend en charge NFC et que l\'API est activée.');
        setIsScanning(false); // Réinitialiser l'état en cas d'erreur
      }
    } else {
      console.error('NDEFReader is not supported in this environment.');
      alert('NDEFReader n\'est pas supporté dans ce navigateur. Veuillez utiliser un navigateur compatible.');
    }
  };

  return (
    <Button onClick={startNfcScan}>
      Lecture NFC
    </Button>
  );
};

export default NfcReader;
