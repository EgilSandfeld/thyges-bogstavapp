import { useEffect } from 'react';
import AppV55 from './AppV55';
import { Version6Controls } from './Version6Controls';

export default function AppV6() {
  useEffect(() => {
    const updateVersionLabel = () => {
      const label = document.querySelector<HTMLElement>('.brand-copy p');
      if (label && label.textContent !== 'Version 6 · tegn, byg og pynt')
        label.textContent = 'Version 6 · tegn, byg og pynt';
    };

    updateVersionLabel();
    const observer = new MutationObserver(updateVersionLabel);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <AppV55 />
      <Version6Controls />
    </>
  );
}
