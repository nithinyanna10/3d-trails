# Installation & Setup

## Quick Start

### 1. Install Frontend Dependencies

```bash
cd frontend
npm install
```

This will install all new dependencies including:
- react-router-dom
- zustand
- framer-motion
- tailwindcss
- And all UI components

### 2. Start Backend (Terminal 1)

```bash
cd /Users/nithinyanna/Downloads/3d-trails
./start-backend.sh
```

Or manually:
```bash
cd backend
python3 -m pip install --upgrade pip
python3 -m pip install -r requirements.txt
python3 -m uvicorn main:app --reload --port 8000
```

### 3. Start Frontend (Terminal 2)

```bash
cd /Users/nithinyanna/Downloads/3d-trails
./start-frontend.sh
```

Or manually:
```bash
cd frontend
npm install  # First time only
npm run dev
```

### 4. Open Browser

Navigate to: `http://localhost:5173`

## Pages

- **Landing** (`/`): Hero page with live demo
- **Studio** (`/studio`): Main workspace
- **Gallery** (`/gallery`): Preset gallery

## Features

✅ Multi-page premium experience
✅ Glowing ribbon trail with arc-length resampling
✅ Premium visual effects (bloom, vignette, fog)
✅ Timeline scrubber
✅ Bottom control dock
✅ Keyboard shortcuts (Cmd+Enter)
✅ Zustand state management
✅ Framer Motion animations

## Troubleshooting

If you see import errors, make sure all dependencies are installed:
```bash
cd frontend
npm install
```

If Tailwind styles aren't loading:
```bash
cd frontend
npm install -D tailwindcss postcss autoprefixer
```

