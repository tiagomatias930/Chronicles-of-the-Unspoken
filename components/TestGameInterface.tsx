import React, { useState, useEffect } from 'react';

const TestGameInterface: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    console.log('TestGameInterface mounted');
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <div style={{
      width: '100%',
      height: '100%',
      backgroundColor: '#050505',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#dcdcdc',
      fontFamily: "'Courier Prime', monospace"
    }}>
      <h1 style={{ fontSize: '48px', color: '#dc2626', marginBottom: '20px' }}>
        CHRONICLES OF THE UNSPOKEN
      </h1>
      <div style={{ fontSize: '18px', marginBottom: '20px' }}>
        Status: System Online ✓
      </div>
      <div style={{ fontSize: '14px', color: '#999', marginBottom: '40px' }}>
        Loading game interface...
      </div>
      
      {/* Test elements to verify rendering */}
      <div style={{
        border: '2px solid #dc2626',
        padding: '20px',
        marginTop: '20px',
        backgroundColor: '#1a1a1a'
      }}>
        <div>System Test: Basic UI Working</div>
        <div style={{ marginTop: '10px', color: '#00ff00' }}>
          ✓ Text rendering enabled
        </div>
        <div style={{ marginTop: '10px', color: '#00ff00' }}>
          ✓ Color system active
        </div>
      </div>
    </div>
  );
};

export default TestGameInterface;
