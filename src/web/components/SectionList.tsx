import React from 'react';

const SectionList: React.FC = () => {
  const sections: string[] = ['Section 1', 'Section 2', 'Section 3'];

  return (
    <div>
      <h3 style={{ fontSize: 18, fontWeight: 500 }}>Sections</h3>
      <ul style={{ listStyle: 'none', padding: 0, marginTop: 10 }}>
        {sections.map((section, index) => (
          <li key={index} style={{ padding: '8px 0', borderBottom: '1px solid #eee', cursor: 'pointer' }}>{section}</li>
        ))}
      </ul>
    </div>
  );
};

export default SectionList;