import React, { createContext, useState } from 'react';

export const ThemeContext = createContext({});

const ThemeContextProvider = ({ children }) => {
  const [showNavBar, setShowNavBar] = useState(true);

  return (
    <ThemeContext.Provider value={{ showNavBar, setShowNavBar }}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContextProvider;
