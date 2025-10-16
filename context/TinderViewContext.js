import React, { createContext, useContext, useRef, useState } from 'react';

const TinderViewContext = createContext();

export const TinderViewProvider = ({ children }) => {
  const tinderViewRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // ✅ Reset function now also resets currentIndex
  const resetTinderView = () => {
    setCurrentIndex(0);
    if (tinderViewRef.current) {
      tinderViewRef.current = null;
    }
  };

  return (
    <TinderViewContext.Provider value={{ tinderViewRef, currentIndex, setCurrentIndex, resetTinderView }}>
      {children}
    </TinderViewContext.Provider>
  );
};

export const useTinderView = () => {
  const context = useContext(TinderViewContext);
  if (!context) {
    throw new Error('useTinderView must be used within a TinderViewProvider');
  }
  return context;
};