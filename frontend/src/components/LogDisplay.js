import React from 'react';

const LogDisplay = ({ messages }) => {
    return (
        <div style={{ whiteSpace: 'pre-wrap', border: '1px solid #ccc', padding: '10px', marginTop: '10px' }}>
            {messages}
        </div>
    );
};

export default LogDisplay;