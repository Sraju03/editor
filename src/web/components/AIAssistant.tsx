import React from 'react';

const AIAssistant: React.FC = () => {
  return (
    <div style={{ padding: 10 }}>
      <h3 style={{ fontSize: 18, fontWeight: 500 }}>AI Assistant</h3>
      <p style={{ color: '#666' }}>Ask me anything about your document!</p>
      <textarea style={{ width: '100%', height: 100, marginTop: 10, padding: 8, borderRadius: 4, border: '1px solid #ccc' }} placeholder="Type your query here..."></textarea>
      <button style={{ marginTop: 10, padding: '6px 12px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Send</button>
    </div>
  );
};

export default AIAssistant;