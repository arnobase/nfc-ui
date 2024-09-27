import React from 'react';
import { BrowserRouter as Router, Route, Link, Routes } from 'react-router-dom';
import NfcAssociation from './components/NfcAssociation';
import AssociationsList from './components/AssociationsList';

function App() {
  return (
    <Router>
      <div>
        <nav>
          <ul>
            <li>
              <Link to="/">Associer NFC</Link>
            </li>
            <li>
              <Link to="/associations">Voir les associations</Link>
            </li>
          </ul>
        </nav>

        <Routes>
          <Route path="/" element={<NfcAssociation />} />
          <Route path="/associations" element={<AssociationsList />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
