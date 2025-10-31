import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { DEFAULT_BRE } from '../constants';
import { apiFetchBre, apiSaveBre } from '../api';
import { useToast } from './ToastContext';

const BreContext = createContext();

export const useBre = () => {
  return useContext(BreContext);
};

export const BreProvider = ({ children }) => {
  const [bre, setBre] = useState(DEFAULT_BRE);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();

  // Load BRE from API on mount
  useEffect(() => {
    apiFetchBre().then(fetchedBre => {
      setBre(fetchedBre);
      setIsLoading(false);
    });
  }, []);

  const saveBreConfig = useCallback(async (newBre) => {
    setIsLoading(true);
    try {
      await apiSaveBre(newBre);
      setBre(newBre);
      showToast('BRE configuration saved!', 'success');
    } catch (e) {
      showToast('Failed to save BRE', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);
  
  const resetBre = useCallback(async () => {
    await saveBreConfig(DEFAULT_BRE);
    showToast('BRE configuration reset.', 'warning');
  }, [saveBreConfig, showToast]);

  const value = {
    bre,
    isLoading,
    saveBreConfig,
    resetBre
  };

  return <BreContext.Provider value={value}>{children}</BreContext.Provider>;
};