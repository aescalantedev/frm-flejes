import { useState, useEffect } from 'react';

export function useUnitSystem() {
  const [unitSystem, setUnitSystem] = useState(() => localStorage.getItem('unitSystem') || 'kg');

  useEffect(() => {
    const handleStorageChange = () => {
      setUnitSystem(localStorage.getItem('unitSystem') || 'kg');
    };
    window.addEventListener('unit-change', handleStorageChange);
    return () => window.removeEventListener('unit-change', handleStorageChange);
  }, []);

  const toggleUnitSystem = (val) => {
    const nextUnit = val || (unitSystem === 'kg' ? 't' : 'kg');
    localStorage.setItem('unitSystem', nextUnit);
    window.dispatchEvent(new Event('unit-change'));
  };

  return { unitSystem, isTN: unitSystem === 't', toggleUnitSystem };
}
