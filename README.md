# ARIA: Adaptive Responsive Intelligence Assistant

**A privacy-first, multi-user household voice assistant**

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL%203.0-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb)](https://react.dev/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ed)](https://www.docker.com/)

ARIA is a self-hosted voice assistant designed for small households (2-5 members) to coordinate calendars, manage tasks, share shopping lists, track budgets, and stay organized—all through natural conversation.

## Features

- **Voice-First Interaction:** Talk to ARIA naturally, get spoken responses
- **Multi-User Support:** Separate personal data, shared household resources
- **Privacy-First:** Self-hosted on your server, zero telemetry, you own your data
- **Multi-LLM Support:** Choose Claude, Gemini, OpenAI, or local models (Ollama)
- **Household Coordination:** Shared calendars, shopping lists, budget tracking
- **Personal Productivity:** Tasks, notes, break reminders, focus sessions
- **Beautiful UI:** Mobile-first web app, animated particle face, light/dark themes

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
# Edit .env with your API keys (Claude, Gemini, or OpenAI)

# Launch with Docker
docker-compose up -d

# Access ARIA
# Frontend: http://localhost:3000
# Backend API: http://localhost:5000
# Python Agent: http://localhost:8000
```

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

**Phase 0.5: Gamified Onboarding** ✅ **COMPLETED**
- ✅ 5-step interactive onboarding with animations
- ✅ AI voice welcome with auto-play
- ✅ Voice selection (8 voices with previews)
- ✅ Avatar selection (8 animated styles)
- ✅ Personality selection (4 traits)
- ✅ Particle visualization with audio reactivity

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
