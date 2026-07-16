import os
import sys
import platform
import subprocess

# Add backend folder to python search path
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend"))

from app import app

def main():
    port = int(os.getenv("PORT", 5000))
    is_windows = platform.system() == "Windows"
    
    print("=" * 60)
    print("  RTLGuard AI — Starting Production Server")
    print(f"  Host OS: {platform.system()} {platform.release()}")
    print(f"  Listening on: http://0.0.0.0:{port}")
    print("=" * 60)

    # Ensure debug mode is disabled for production
    app.debug = False

    if is_windows:
        print("[WSGI] Starting Waitress server...")
        try:
            from waitress import serve
            serve(app, host="0.0.0.0", port=port, threads=8)
        except ImportError:
            print("[ERROR] Waitress is not installed. Please run: pip install waitress")
            sys.exit(1)
    else:
        # Check if gunicorn is installed
        try:
            import gunicorn
            gunicorn_available = True
        except ImportError:
            gunicorn_available = False

        if gunicorn_available:
            print("[WSGI] Starting Gunicorn server...")
            cmd = [
                "gunicorn",
                "wsgi:app",
                "-b", f"0.0.0.0:{port}",
                "--workers", "4",
                "--threads", "2",
                "--log-level", "info"
            ]
            try:
                subprocess.run(cmd, check=True)
            except KeyboardInterrupt:
                print("\n[WSGI] Gunicorn server stopped.")
            except Exception as e:
                print(f"[ERROR] Failed to run Gunicorn: {e}")
                sys.exit(1)
        else:
            print("[WSGI] Gunicorn not found. Falling back to Waitress server...")
            try:
                from waitress import serve
                serve(app, host="0.0.0.0", port=port, threads=8)
            except ImportError:
                print("[ERROR] Neither Gunicorn nor Waitress is installed. Please run: pip install gunicorn waitress")
                sys.exit(1)

if __name__ == "__main__":
    main()
