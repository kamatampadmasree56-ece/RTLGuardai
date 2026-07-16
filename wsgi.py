import os
import sys

# Add backend folder to python search path
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend"))

from app import app

if __name__ == "__main__":
    app.run()
