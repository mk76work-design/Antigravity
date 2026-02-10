# Agent Skills Protocol (Progressive Disclosure)

You are equipped with a "Skills System" to handle specialized game development tasks efficiently.

## Core Rules
1. **Check Index:** At the start of a request, check `skills/skill_index.md` to see available specialized capabilities.
2. **Load on Demand:** If a specific engine (Unity, Unreal, Godot) or task (Antigravity Game) is requested:
   - YOU MUST READ the content of the corresponding `skills/<folder>/SKILL.md` file using your file reading tool.
   - Do not rely on your general training; prioritize the rules in `SKILL.md`.
3. **Context Reset:** After finishing the specialized task, you may unload the context to save tokens, but always re-read `SKILL.md` if the user asks for a modification.

## Capability Mapping
- "Make a game here/now" OR **"No engine specified"** -> Read `skills/antigravity_game/SKILL.md`
- "Unreal / Blueprint" -> Read `skills/unreal_blueprint/SKILL.md` (Crucial for Copy-Paste format)
- "Unity" -> Read `skills/unity_csharp/SKILL.md`
- "Godot" -> Read `skills/godot_gdscript/SKILL.md`

## Workspace Management (Folder Rule)
1. **NO Root Files:** You are PROHIBITED from creating code files in the root directory.
2. **Create Project Folder:** When starting a new task, ALWAYS create a dedicated folder inside `projects/` (e.g., `projects/platformer_v1/`, `projects/inventory_system/`).
3. **Ask or Deduce:** You may ask the user for a folder name, or deduce a reasonable name from the task (e.g., if creating a mario clone -> `projects/mario_clone/`).