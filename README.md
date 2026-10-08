# QR Scanner POC

Offline-first QR scanner built with Expo SDK 57 and TypeScript. Requires Node.js 22.13 or newer.

There is no backend. With `API_BASE_URL` empty, saves stay on the device and a mock API marks pending records as synced once the device is online.

## Run

```bash
nvm use 22
npm install
npx expo start
```

Open the project on a physical device with an Expo Go build that matches SDK 57. The App Store Expo Go app does not include this SDK. The camera scanner does not run in the iOS Simulator.

To point sync at a real server, set `EXPO_PUBLIC_API_BASE_URL` (no trailing slash) or edit `DEFAULT_API_BASE_URL` in `services/config.ts`. The app posts to `POST /api/qr-items`.
