import py_compile
import os
import sys

def check_syntax():
    backend_path = "/home/harit/Harit_Portfolio/apps/backend"
    has_error = False
    
    for root, dirs, files in os.walk(backend_path):
        if ".venv" in root or "__pycache__" in root:
            continue
        for file in files:
            if file.endswith(".py"):
                full_path = os.path.join(root, file)
                try:
                    py_compile.compile(full_path, doraise=True)
                except Exception as e:
                    print(f"Syntax error in {full_path}: {e}")
                    has_error = True
                    
    if not has_error:
        print("All Python backend files compile successfully. 0 syntax errors.")
    else:
        sys.exit(1)

if __name__ == "__main__":
    check_syntax()
