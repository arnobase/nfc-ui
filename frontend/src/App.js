import React from 'react';
import { BrowserRouter as Router, Route, Routes, useLocation, Link } from 'react-router-dom';
import NfcAssociation from './components/NfcAssociation';
import AssociationsList from './components/AssociationsList';
import NfcPlay from './components/NfcPlay'; // Importer le nouveau composant NfcPlay

const Navigation = () => {
  const location = useLocation(); // Obtenir l'emplacement actuel

  return (
    <nav className="bg-gray-800 p-4"> {/* Fond gris foncé et espacement */}
      <ul className="flex space-x-4"> {/* Flexbox pour aligner les éléments horizontalement */}
        <li className={`flex-1 ${location.pathname === '/' ? 'bg-gray-700 rounded-lg' : ''}`}>
          <Link 
            to="/" 
            className={`text-white block text-center p-2 ${location.pathname === '/' ? 'font-bold' : 'hover:text-gray-300'}`}
          >
            Associer NFC
          </Link>
        </li>
        <li className={`flex-1 ${location.pathname === '/associations' ? 'bg-gray-700 rounded-lg' : ''}`}>
          <Link 
            to="/associations" 
            className={`text-white block text-center p-2 ${location.pathname === '/associations' ? 'font-bold' : 'hover:text-gray-300'}`}
          >
            Voir les associations
          </Link>
        </li>
        <li className={`flex-1 ${location.pathname === '/play' ? 'bg-gray-700 rounded-lg' : ''}`}>
          <Link 
            to="/play" 
            className={`text-white block text-center p-2 ${location.pathname === '/play' ? 'font-bold' : 'hover:text-gray-300'}`}
          >
            Lire depuis NFC
          </Link>
        </li>
      </ul>
    </nav>
  );
};

function App() {
  return (
    <Router>
      <div>
        <Navigation /> {/* Utiliser le composant de navigation */}
        <Routes>
          <Route path="/" element={<NfcAssociation />} />
          <Route path="/associations" element={<AssociationsList />} />
          <Route path="/play" element={<NfcPlay />} /> {/* Route pour le nouveau composant */}
        </Routes>
      </div>
    </Router>
  );
}

export default App;
