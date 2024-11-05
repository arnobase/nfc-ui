import React, { useState, useEffect } from 'react';
import AssociationsList from './AssociationsList'; // Assurez-vous que ce composant existe
import ReadingsList from './ReadingsList'; // Créez ce composant pour afficher l'historique des lectures

const Tabs = ({ associations, readings, fetchAssociations, pageLog, onEditTag, onTagRead, onSortReadings }) => {
    const [activeTab, setActiveTab] = useState('associations'); // Onglet actif par défaut

    return (
        <div>
            <div className="flex space-x-4 mb-4">
                <button 
                    onClick={() => setActiveTab('associations')} 
                    className={`px-4 py-2 rounded ${activeTab === 'associations' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}
                >
                    Associations
                </button>
                <button 
                    onClick={() => setActiveTab('readings')} 
                    className={`px-4 py-2 rounded ${activeTab === 'readings' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}
                >
                    Historique des Lectures
                </button>
            </div>

            <div className="border p-4 rounded-lg shadow">
                {activeTab === 'associations' && (
                    <AssociationsList 
                        associations={associations} 
                        onEditTag={onEditTag} // Passer la fonction d'édition
                        onLog={pageLog} // Passer la fonction de log si nécessaire
                    />
                )}
                {activeTab === 'readings' && <ReadingsList readings={readings} onSortReadings={onSortReadings} />}
            </div>
        </div>
    );
};

export default Tabs;
