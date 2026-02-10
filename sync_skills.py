import os
import re

BASE_DIR = "skills"
INDEX_FILE = os.path.join(BASE_DIR, "skill_index.md")

def get_skill_info(file_path):
    """SKILL.mdの中身を読んでタイトルと概要を抜き出す"""
    if not os.path.exists(file_path):
        return None
    
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # # タイトル を抽出
    title_match = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
    title = title_match.group(1).strip() if title_match else "Unknown Skill"
    
    # フォルダ名（これがスキルIDになる）
    folder_name = os.path.basename(os.path.dirname(file_path))
    
    return f"- **{title}** (`skills/{folder_name}/SKILL.md`)"

def sync_index():
    if not os.path.exists(BASE_DIR):
        print(f"Error: '{BASE_DIR}' directory not found.")
        return

    print("Scanning skills...")
    skill_lines = []
    
    # skillsフォルダ内のサブフォルダを全部走査
    for folder_name in os.listdir(BASE_DIR):
        folder_path = os.path.join(BASE_DIR, folder_name)
        if os.path.isdir(folder_path):
            skill_md = os.path.join(folder_path, "SKILL.md")
            info = get_skill_info(skill_md)
            if info:
                skill_lines.append(info)
                print(f"Found: {folder_name}")

    # 目次ファイルの中身を作成
    new_content = """# Skill Index
This file lists available specialized capabilities.
To use a skill, YOU MUST READ the `SKILL.md` file in the specific directory FIRST.

""" + "\n\n".join(skill_lines)

    # 上書き保存
    with open(INDEX_FILE, "w", encoding="utf-8") as f:
        f.write(new_content)
    
    print(f"\nUpdated {INDEX_FILE} successfully!")

if __name__ == "__main__":
    sync_index()