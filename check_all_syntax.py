import subprocess, os

js_files = []
for root, dirs, files in os.walk('src'):
    for f in files:
        if f.endswith('.js'):
            js_files.append(os.path.join(root, f))

print(f"Checking {len(js_files)} JS files with Node.js...\n")

for filepath in js_files:
    result = subprocess.run(
        ['node', '--input-type=module'],
        input=open(filepath, encoding='utf-8', errors='replace').read(),
        capture_output=True, text=True
    )
    # Node will give SyntaxError if parsing fails
    if result.returncode != 0 and 'SyntaxError' in result.stderr:
        lines = result.stderr.strip().split('\n')
        print(f"SYNTAX ERROR: {filepath}")
        for l in lines[:5]:
            print(f"  {l}")
        print()
    elif result.returncode != 0:
        # Other error (like import resolution) - file parsed OK
        pass
    else:
        print(f"OK: {filepath}")
