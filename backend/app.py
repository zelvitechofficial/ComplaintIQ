"""
Customer Complaint Analysis System – Flask Backend
====================================================
Main application entry point with CORS, request logging,
and blueprint registration.
"""

import os
import logging
from datetime import datetime, timezone
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
from models import db
from routes import api

# ---------------------------------------------------------------------------
# Load environment variables from .env
# ---------------------------------------------------------------------------

load_dotenv()

# ---------------------------------------------------------------------------
# App configuration
# ---------------------------------------------------------------------------

app = Flask(__name__)

# CORS — allow React dev servers and production frontend
frontend_url = os.getenv("PRODUCTION_FRONTEND_URL")
if frontend_url:
    frontend_url = frontend_url.rstrip("/")

CORS(app, resources={r"/*": {
    "origins": [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        frontend_url,
    ] if frontend_url else [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ],
    "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    "allow_headers": ["Content-Type", "Authorization"],
}})

# ---------------------------------------------------------------------------
# Database — Neon (PostgreSQL) via DATABASE_URL env variable
# ---------------------------------------------------------------------------

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL is not set. "
        "Add it to backend/.env as your Neon PostgreSQL connection string."
    )

# SQLAlchemy requires 'postgresql://' not 'postgres://'
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

app.config["SQLALCHEMY_DATABASE_URI"] = DATABASE_URL
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db.init_app(app)

with app.app_context():
    db.create_all()

# ---------------------------------------------------------------------------
# Register blueprint
# ---------------------------------------------------------------------------

app.register_blueprint(api)

# ---------------------------------------------------------------------------
# Request logging middleware
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-5s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("complaint-api")


@app.before_request
def log_request():
    logger.info("%s %s  ← %s", request.method, request.path, request.remote_addr)


@app.after_request
def log_response(response):
    logger.info("%s %s  → %s", request.method, request.path, response.status_code)
    return response


# ---------------------------------------------------------------------------
# Generic error handlers
# ---------------------------------------------------------------------------

@app.errorhandler(404)
def not_found(_):
    return jsonify({"error": "Resource not found."}), 404


@app.errorhandler(405)
def method_not_allowed(_):
    return jsonify({"error": "Method not allowed."}), 405


@app.errorhandler(500)
def internal_error(_):
    return jsonify({"error": "An internal server error occurred."}), 500


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    # Get port from env (Render/Heroku/etc) or default to 5000
    port = int(os.environ.get("PORT", 5000))
    
    # Check if we are in development mode
    is_dev = os.getenv("FLASK_ENV") == "development"
    
    if is_dev:
        # Standard Flask development server (provides hot-reloading)
        logger.info("Starting Flask development server on port %s...", port)
        app.run(debug=True, host="0.0.0.0", port=port)
    else:
        # Production-ready WSGI server
        try:
            from waitress import serve
            logger.info("Starting production WSGI server (Waitress) on port %s...", port)
            serve(app, host="0.0.0.0", port=port)
        except ImportError:
            # Fallback for environments where Gunicorn is preferred (Linux/Mac)
            # or where Waitress isn't installed.
            logger.warning("Waitress not found. Falling back to built-in server.")
            app.run(debug=False, host="0.0.0.0", port=port)
