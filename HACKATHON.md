## Taico + Codex App Server: An Issue Tracker That Gets the Work Done

For this hackathon, I used the event as an excuse to explore what I could build with the Codex App Server.

The result is an implementation inspired by OpenAI’s **Symphony** white paper, published two days ago. Symphony describes a model for orchestrating coding agents around real software work, and that immediately resonated with something I had already been building: **Taico**, a lightweight issue tracker designed around simple task flow, shared context, and human/AI collaboration.

The important thing is that this is **not a new standalone agent demo**. It is an extension to an existing issue tracker.

Taico already has the basic primitives of software work: tasks, statuses, comments, context, assignees, and review flow. The new Codex integration adds a missing capability: tasks can now be assigned directly to Codex, and Codex can work on them in the background.

That changes the shape of the product.

Instead of using an issue tracker only as a place where humans describe work, Taico becomes a place where work can actually be executed. A user can create a task, provide context, assign it to Codex, and let the agent pick it up. Codex then works against the task, makes progress, and eventually produces a result that can be reviewed.

The core idea is simple:

**An issue tracker should not just track work. It should help get the work done.**

This integration turns Taico into a lightweight orchestration layer for coding agents. Humans still define priorities, review outcomes, and make decisions, but agents can now participate directly in the workflow as workers.

In practical terms, the demo shows:

- An existing Taico task board
- Tasks that can be assigned to Codex
- Codex picking up assigned work
- Background execution through the Codex App Server
- The issue tracker remaining the source of truth for the work

The goal was not to build a flashy one-off hackathon toy. The goal was to test a real product direction: what happens when an issue tracker, a coding agent, and shared project context are treated as parts of the same system?

That is the space Taico is exploring.

Symphony gave language to a lot of the same ideas: coding agents need orchestration, context, task ownership, review loops, and a way to participate in real engineering workflows. Taico is my take on that idea, starting from the issue tracker and extending outward.

This hackathon project is a small but concrete step in that direction: assigning real tasks to Codex and letting it work on them in the background, inside the system where the work already lives.
