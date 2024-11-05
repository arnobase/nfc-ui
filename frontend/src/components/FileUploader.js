import React, { useState } from 'react';
import axios from 'axios';
import Button from './Button'; // Assurez-vous d'importer le composant Button

function FileUploader({ onUploadSuccess, onFileSelect }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [rename, setRename] = useState('');

  const BACKEND_URL = process.env.REACT_APP_SERVER_HOST + ":" + process.env.REACT_APP_BACKEND_PORT;

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    setSelectedFile(file);
    onFileSelect(file); // Informer le composant parent du fichier sélectionné
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert('Veuillez sélectionner un fichier à télécharger.');
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    if (rename) {
      formData.append('rename', rename);
    }

    try {
      const response = await axios.post(`${BACKEND_URL}/lms-upload-file`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      console.log('Fichier téléchargé avec succès:', response.data);
      onUploadSuccess(response.data);
    } catch (error) {
      console.error('Erreur lors du téléchargement du fichier:', error);
    }
  };

  return (
    <div className="file-uploader">
      <input type="file" onChange={handleFileChange} />
      <input
        type="text"
        placeholder="Renommer le fichier (optionnel)"
        value={rename}
        onChange={(e) => setRename(e.target.value)}
        className="border border-gray-300 rounded-lg p-2 mr-2"
      />
      <Button onClick={handleUpload}>Télécharger le fichier</Button>
    </div>
  );
}

export default FileUploader;
