"""
RTLGuard AI — Start Server
Run: python run_server.py
App opens at: http://localhost:5000
"""

import os
import sys

# Add backend folder to path
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend"))

print("=" * 50)
print("  RTLGuard AI — MongoDB + Flask Server")
print("  http://localhost:5000")
print("=" * 50)

from app import app
app.run(host="0.0.0.0", port=5000, debug=True)
