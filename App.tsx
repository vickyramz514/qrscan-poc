import { useState } from 'react';

import { QrItemsProvider } from './hooks/useQrItems';
import { HomeScreen } from './screens/HomeScreen';
import { ScannerScreen } from './screens/ScannerScreen';

export default function App() {
  return (
    <QrItemsProvider>
      <Root />
    </QrItemsProvider>
  );
}

function Root() {
  const [screen, setScreen] = useState<'home' | 'scanner'>('home');

  if (screen === 'scanner') {
    return <ScannerScreen onClose={() => setScreen('home')} />;
  }

  return <HomeScreen onStartScanning={() => setScreen('scanner')} />;
}
