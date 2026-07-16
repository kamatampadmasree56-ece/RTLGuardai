import sys
code = open('src/pages/RTLAnalyzer.js', encoding='utf-8').read()
lines = code.split('\n')
depth = 0
min_depth_after = 999
for i, line in enumerate(lines):
    for c in line:
        if c == '(':
            depth += 1
        elif c == ')':
            depth -= 1
    # Print significant depth changes (every time depth reaches 0 or 1)
    if depth <= 1:
        safe_line = line.rstrip().encode('ascii', errors='replace').decode('ascii')
        print(f'L{i+1:4d} d={depth:+3d}  {safe_line[:90]}')
