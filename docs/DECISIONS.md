# CATTIPU OS — Engineering Decisions

## Decision #1

**We are not replacing Windows.**

Reason:

The operating system is the experience, not the kernel.

---

## Decision #2

**Identity locked at v0.2.5.**

Future work extends the system.

No redesigns.

---

## Decision #3

**Architect is the hero product.**

Every roadmap decision should strengthen Architect before expanding Forge.

---

## Decision #4

**Project Memory is the long-term moat.**

We preserve engineering decisions, not just chats.

---

## Decision #5

**One AI entry point.**

All future model calls flow through:

`lib/ai/generateArchitecture.ts`

This prevents AI logic from becoming fragmented.
