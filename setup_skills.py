import os

# 基本ディレクトリ
BASE_DIR = "skills"

# 目次ファイルの内容
INDEX_CONTENT = """# Skill Index
This file lists available specialized capabilities.
To use a skill, YOU MUST READ the `SKILL.md` file in the specific directory FIRST.

- **Antigravity Game Dev** (`skills/antigravity_game/SKILL.md`)
  - Create 2D/3D games that run directly in the browser preview.
  - Stack: HTML5 Canvas, Matter.js (2D), Three.js (3D).

- **Unreal Engine Blueprint** (`skills/unreal_blueprint/SKILL.md`)
  - Generates T3D format text for DIRECT COPY-PASTE into UE5 Graph Editor.
  - Use this when the user needs Blueprint logic nodes.

- **Unity C# Expert** (`skills/unity_csharp/SKILL.md`)
  - Generates modern, clean C# MonoBehaviour scripts.
  - Rules: New Input System, [SerializeField] private, UniTask.

- **Godot GDScript** (`skills/godot_gdscript/SKILL.md`)
  - Generates GDScript 2.0 code for Godot 4.x.
  - Rules: Static typing, clean signal connections.
"""

# 各スキルの詳細指示書（SKILL.md）の内容
SKILLS = {
    "antigravity_game": """# Antigravity Internal Game Dev

## Context
You are building games that run inside the Google Antigravity preview.

## Tech Stack
- **2D Physics:** Matter.js (Use CDN or local import)
- **3D Graphics:** Three.js
- **Simple 2D:** Vanilla HTML5 Canvas

## Rules
1. Create a single `index.html` containing CSS, HTML, and JS.
2. Handle window resize events.
3. Use `requestAnimationFrame` for game loops.
""",

    "unreal_blueprint": """# Unreal Engine Blueprint Architect

## Context
You are an expert UE5 developer. The user wants to COPY your output and PASTE it directly into the Unreal Engine Graph Editor.

## CRITICAL OUTPUT RULE
**DO NOT** describe the nodes in English.
**MUST** output the internal **T3D Text Format** (`Begin Object Class=...`).

## Example Output
To create a variable or node, output like this:

```text
Begin Object Class=/Script/BlueprintGraph.K2Node_Event Name="K2Node_Event_0"
   EventReference=(MemberParent=Class'/Script/Engine.Actor',MemberName="ReceiveBeginPlay")
   NodePosX=0
   NodePosY=0
End Object
```

## Logic
- Connect Exec pins correctly.
- Set reasonable NodePosX/Y values so nodes don't overlap when pasted.
""",

    "unity_csharp": """# Unity C# Specialist

## Context
You are a Senior Unity Developer.

## Coding Standards
1. **Variables:** ALWAYS use `[SerializeField] private` for inspector fields. NO `public` variables.
2. **Input:** Assume **New Input System** (`UnityEngine.InputSystem`).
3. **Async:** Prefer `UniTask` or `async/await`.
4. **Performance:** Cache `GetComponent` in `Awake`.

## Output
Provide the full class file including necessary `using` statements.
""",

    "godot_gdscript": """# Godot 4.x Specialist

## Context
You are a Godot Engine expert using GDScript 2.0.

## Coding Standards
1. **Static Typing:** MANDATORY. Use `var health: int = 10`.
2. **Signals:** Connect signals in code `node.signal.connect(_on_signal)`.
3. **Syntax:** Use Godot 4 syntax (`move_and_slide()` takes no args).
4. **Nodes:** Suggest the Scene Tree structure before writing the script.
"""
}

def create_skills():
    # フォルダ作成
    if not os.path.exists(BASE_DIR):
        os.makedirs(BASE_DIR)
        print(f"Created directory: {BASE_DIR}")

    # 目次ファイルの作成
    index_path = os.path.join(BASE_DIR, "skill_index.md")
    with open(index_path, "w", encoding="utf-8") as f:
        f.write(INDEX_CONTENT)
    print(f"Created index: {index_path}")

    # 各スキルファイルの作成
    for folder, content in SKILLS.items():
        folder_path = os.path.join(BASE_DIR, folder)
        if not os.path.exists(folder_path):
            os.makedirs(folder_path)
        
        file_path = os.path.join(folder_path, "SKILL.md")
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Created skill: {file_path}")

    print("\nSUCCESS! All skills generated.")
    print("Please add the 'Skill Loading Rule' to your .antigravity/rules or System Prompt.")

if __name__ == "__main__":
    create_skills()