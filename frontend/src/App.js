import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import NfcAssociation from './components/NfcAssociation';

function App() {
  return (
    <Router>
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">Gestionnaire de Tags NFC</h2>
          <NfcAssociation />
        </div>
      </div>
    </Router>
  );
}

export default App;
