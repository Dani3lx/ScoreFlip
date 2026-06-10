# ScoreFlip

**Hands-free PDF page turning using eye blinks.**

ScoreFlip is a Progressive Web App (PWA) that allows musicians to navigate PDF documents using double-blink gestures. It was built to solve a common frustration during practice and performance sessions: having to remove your hands from your instrument just to turn a page.

Using real-time blink detection powered by MediaPipe Face Landmarker, ScoreFlip lets you stay focused on playing while seamlessly navigating your sheet music.



<p align="center">
  <img src="https://github.com/user-attachments/assets/259ceb0c-92bf-4683-add0-81cd5bc7ee31" alt="ScoreFlip Demo" width="75%">
</p>

The application continuously tracks eye landmarks locally on your device and detects double-blink gestures to navigate between PDF pages without requiring any physical interaction.


## Features

### 👀 Blink-Controlled Navigation
Navigate PDF pages using double blinks detected through your device's camera.

### 📄 PDF Score Reader
Upload and view PDF documents directly in the browser.

### 📱 Installable Like a Native App
Built as a Progressive Web App (PWA), ScoreFlip can be installed on desktop, tablet, and mobile devices for a native-app experience.

### ⚡ Offline Support
Uses a cache-first and stale-while-revalidate strategy to continue working even without an internet connection after the app has been installed.

### 🔒 Privacy First
All processing happens locally on your device. No user data is transmitted, stored, or sent to external servers.

## Tech Stack

- **Frontend:** Next.js
- **Styling:** Tailwind CSS
- **Blink Detection:** Google MediaPipe Face Landmarker
- **PWA Support:** Serwist
- **PDF Rendering:** Browser-based PDF viewer

## How It Works

1. Open ScoreFlip
2. Upload a PDF score or document.
3. Grant toggle on blink control and grant camera access.
4. The app continuously monitors blink patterns using MediaPipe Face Landmarker.
5. Perform a double blink to advance pages without touching the screen or keyboard.
6. Continue practicing or performing uninterrupted.

## Installation

Clone the repository and install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

### Important Note

PWA functionality requires a secure context (**HTTPS**) because service workers do not run over standard HTTP connections.

As a result:

- Blink detection and general application development work normally in development mode.
- Offline caching and installable PWA features require HTTPS-enabled environments or production builds.


## Future Improvements

- Additional gesture controls
- Annotation support for scores
