# ARIA: Adaptive Responsive Intelligence Assistant

**A privacy-first, multi-user household voice assistant**

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL%203.0-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb)](https://react.dev/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ed)](https://www.docker.com/)

ARIA is a self-hosted voice assistant designed for small households (2-5 members) to coordinate calendars, manage tasks, share shopping lists, track budgets, and stay organized—all through natural conversation.

## Features

- **Voice-First Interaction:** Talk to ARIA naturally, get spoken responses with natural neural voices
- **Audio-Reactive Particles:** Dynamic soundwave visualization synced to ARIA's voice in real-time
- **Multi-User Support:** Separate personal data, shared household resources
- **Privacy-First:** Self-hosted on your server, zero telemetry, you own your data
- **Azure TTS Integration:** Natural human-like voice (optional, free tier) or Web Speech API fallback
- **Multi-LLM Support:** Choose Claude, Gemini, OpenAI, or local models (Ollama)
- **Household Coordination:** Shared calendars, shopping lists, budget tracking
- **Personal Productivity:** Tasks, notes, break reminders, focus sessions
- **Beautiful UI:** Mobile-first web app, animated particle system, light/dark themes

## Tech Stack

- **Frontend:** React 19 + TypeScript + Vite + TailwindCSS + Three.js
- **Backend:** Node.js + Express + Prisma (SQLite)
- **Agent:** Python + FastAPI + LangChain
- **Deployment:** Docker Compose (single command setup)

## Quick Start

```bash
# Clone repository
git clone https://github.com/yourusername/ARIA.git
cd ARIA

# Setup environment
cp .env.example .env
# Edit .env with your API keys (see Configuration section below)

# Launch with Docker
docker-compose up -d

# Access ARIA
# Frontend: http://localhost:3004
# Backend API: http://localhost:5001
# Python Agent: http://localhost:8002
```

## Configuration

### Required Environment Variables

**Backend (.env in root):**
```bash
# MongoDB
MONGODB_URI=mongodb://localhost:27019/aria?replicaSet=rs0

# JWT Secrets
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-too

# Redis
REDIS_URL=redis://localhost:6381
```

**Frontend (.env in frontend/):**
```bash
# API Endpoint
VITE_API_URL=http://localhost:5001

# Azure TTS (Optional - for natural voice synthesis)
VITE_AZURE_SPEECH_KEY=your-azure-speech-key
VITE_AZURE_SPEECH_REGION=eastus

# Voice Settings (Fallback to Web Speech API if Azure not configured)
VITE_VOICE_ENABLED=true
```

### Azure TTS Setup (Optional but Recommended)

Azure Cognitive Services Text-to-Speech provides natural, human-like voice for ARIA instead of robotic Web Speech API.

**Free Tier:** 5 million characters/month (~16,000 interactions)

**Setup Steps:**

1. **Create Azure Account:** https://azure.microsoft.com/free/
2. **Create Speech Service:**
   - Go to Azure Portal → Create Resource → Search "Speech"
   - Create new Speech Services resource
   - Choose Free (F0) pricing tier
   - Select region (e.g., `eastus`)
3. **Get Credentials:**
   - Go to your Speech resource → Keys and Endpoint
   - Copy `KEY 1` and `LOCATION/REGION`
4. **Add to .env:**
   ```bash
   VITE_AZURE_SPEECH_KEY=your-key-here
   VITE_AZURE_SPEECH_REGION=eastus
   ```

**Without Azure:** ARIA automatically falls back to browser's Web Speech API (works but sounds robotic).

**Features with Azure:**
- Natural neural voices (Jenny Neural - warm, friendly female)
- Emotional expression (cheerful, empathetic, calm)
- Audio-reactive particle visualization synced to voice
- SSML control for rate, pitch, volume

## Documentation

- [Business Requirements](docs/plans/business-requirements.md)
- [Technical Architecture](docs/plans/technical-architecture.md)
- [Phase 0 Implementation Guide](docs/plans/phase-0-checklist.md)
- [Project Rules](docs/_rules/project_rules.md)

## Development Status

**Phase 0: Foundations** ✅ **COMPLETED**
- ✅ Docker Compose orchestration (MongoDB, Redis, backend, frontend, agent)
- ✅ MongoDB replica set for transactions
- ✅ Authentication system (JWT with refresh tokens)
- ✅ Tailwind CSS v4 with custom theme
- ✅ Backend integration tests (15/15 passing)

**Phase 0.75: Particle Voice Authentication** ✅ **COMPLETED**
- ✅ Particle-based login/register with voice guidance
- ✅ 5 dynamic particle formations (soundwave, field, button, loading, scattered)
- ✅ Azure TTS integration with neural voices (optional, free tier)
- ✅ Audio-reactive soundwave visualization (12-bar equalizer)
- ✅ Web Audio API frequency analysis in real-time
- ✅ Voice permission modal with localStorage persistence
- ✅ Smooth state machine with conversational prompts
- ✅ Emotion-based speech modulation (happy, calm, empathetic)

**Phase 1: Enhanced Voice Interface** 🚧 **IN PROGRESS**
- 🚧 Voice Activity Detection (VAD) for interrupts
- 🚧 Conversation transcript storage (30-day retention)
- 🚧 Dynamic AI tone variations
- 🚧 User preference learning system
- 🚧 Proactive engagement with news

See [Project Plan](docs/plans/project-plan.md) for detailed roadmap.

## License

**AGPL-3.0 License** - Open source with copyleft protection

Copyright (c) 2025 Artemis Innovations

This project is licensed under the GNU Affero General Public License v3.0:
- ✅ Free to use, modify, and distribute
- ✅ Must share source code of modifications
- ✅ Network use (SaaS) requires sharing source code
- ❌ Commercial use requires explicit permission

See [LICENSE](LICENSE) file for full text.

**Commercial Licensing:** Contact us for commercial licensing options.

## Contributing

This project follows strict development standards. See [Core Rules](docs/_rules/core_rules.md) for:
- Code style guidelines
- Git workflow
- Testing requirements
- PR process

**We welcome contributions!** Please open an issue first to discuss major changes.
