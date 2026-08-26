# CATTIPU OS — Architecture

## Core Principle

Every project is a living workspace.

Data flows through shared stores instead of isolated apps.

## High-Level Architecture

User
↓
Desktop Shell
↓
Window Manager
↓
Zustand Stores
↓
Apps

## Core Stores

### useWindowStore

Responsibilities:

* Open windows
* Focus
* Minimize
* Maximize
* Position memory

### useProjectStore

Stores:

* Projects
* Architecture
* Roadmaps
* Export history

### useSettingsStore

Stores:

* Wallpaper
* Dock preferences
* Cursor
* Sound

### useArchitectStore

Stores:

* Prompt
* Nodes
* Edges
* ER Diagram
* APIs
* Recommendations
* Playback State

## Current Tech Stack

| Technology    | Purpose            |
| ------------- | ------------------ |
| Next.js 15    | Framework          |
| React         | UI                 |
| TypeScript    | Safety             |
| Tailwind v4   | Styling            |
| Zustand       | State              |
| React Flow    | Architecture Graph |
| Framer Motion | Animation          |
| react-rnd     | Window Manager     |

## Future Architecture

AI Generation

`lib/ai/generateArchitecture.ts`

Every future model integration should enter through this file.

Never scatter AI calls across components.
