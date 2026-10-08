# QR Scanner POC

Offline-first QR scanner built with Expo SDK 57 and TypeScript. Requires Node.js 22.13 or newer.

Scans are sent to the Node API in the background. Copy `.env.example` to `.env` and set the base URL before running on a phone.

## Run

```bash
nvm use 22
npm install
npx expo start
```

Open the project on a physical device with an Expo Go build that matches SDK 57. The App Store Expo Go app does not include this SDK. The camera scanner does not run in the iOS Simulator.

```bash
cp .env.example .env
```

The app calls `https://qrscanapi.datacaptain.in/api/v1`. Restart Metro after changing `.env`.
