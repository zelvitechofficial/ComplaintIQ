"""
API Routes – Flask Blueprint
==============================
All REST endpoints for the complaint analysis system.
"""

import io
import csv
import re
from flask import Blueprint, request, jsonify, Response
from models import db, Complaint
from nlp_engine import analyze_complaint
from auth import require_auth

api = Blueprint("api", __name__, url_prefix="/api")

EMAIL_RE = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------

def _validate_complaint_payload(data: dict) -> list[str]:
    errors: list[str] = []
    if not data.get("customer_name", "").strip():
        errors.append("'customer_name' is required and cannot be blank.")
    if not data.get("email", "").strip():
        errors.append("'email' is required and cannot be blank.")
    elif not EMAIL_RE.match(data["email"].strip()):
        errors.append("'email' is not a valid email address.")
    if not data.get("complaint_text", "").strip():
        errors.append("'complaint_text' is required and cannot be blank.")
    priority = data.get("priority")
    if priority and priority not in Complaint.VALID_PRIORITIES:
        errors.append(f"'priority' must be one of {sorted(Complaint.VALID_PRIORITIES)}.")
    status = data.get("status")
    if status and status not in Complaint.VALID_STATUSES:
        errors.append(f"'status' must be one of {sorted(Complaint.VALID_STATUSES)}.")
    return errors


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@api.route("/health", methods=["GET"])
def health():
    """Simple health check endpoint."""
    return jsonify({"status": "ok", "service": "complaint-analysis-api"}), 200


# ---------------------------------------------------------------------------
# Complaints CRUD
# ---------------------------------------------------------------------------

@api.route("/complaints", methods=["POST"])
@require_auth
def create_complaint():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body must be valid JSON."}), 400

    errors = _validate_complaint_payload(data)
    if errors:
        return jsonify({"errors": errors}), 400

    text = data["complaint_text"].strip()
    nlp_result = analyze_complaint(text)

    complaint = Complaint(
        customer_name=data["customer_name"].strip(),
        email=data["email"].strip(),
        complaint_text=text,
        sentiment=data.get("sentiment") or nlp_result["sentiment"],
        sentiment_score=nlp_result["score"],
        priority=data.get("priority") or nlp_result["priority"],
        category=data.get("category") or nlp_result["category"],
        status=data.get("status", "Pending"),
    )

    db.session.add(complaint)
    db.session.commit()

    return jsonify({"message": "Complaint created successfully.", "complaint": complaint.to_dict()}), 201


@api.route("/complaints", methods=["GET"])
def get_complaints():
    query = Complaint.query

    status = request.args.get("status")
    if status:
        query = query.filter(Complaint.status == status)
    priority = request.args.get("priority")
    if priority:
        query = query.filter(Complaint.priority == priority)
    category = request.args.get("category")
    if category:
        query = query.filter(Complaint.category == category)

    complaints = query.order_by(Complaint.timestamp.desc()).all()
    return jsonify({"complaints": [c.to_dict() for c in complaints]}), 200


@api.route("/complaints/<int:complaint_id>", methods=["GET"])
def get_complaint(complaint_id: int):
    complaint = db.session.get(Complaint, complaint_id)
    if not complaint:
        return jsonify({"error": f"Complaint with id {complaint_id} not found."}), 404
    return jsonify({"complaint": complaint.to_dict()}), 200


@api.route("/complaints/<int:complaint_id>/status", methods=["PUT"])
@require_auth
def update_complaint_status(complaint_id: int):
    complaint = db.session.get(Complaint, complaint_id)
    if not complaint:
        return jsonify({"error": f"Complaint with id {complaint_id} not found."}), 404

    data = request.get_json(silent=True)
    if not data or "status" not in data:
        return jsonify({"error": "'status' field is required in the request body."}), 400

    new_status = data["status"]
    if new_status not in Complaint.VALID_STATUSES:
        return jsonify({"error": f"'status' must be one of {sorted(Complaint.VALID_STATUSES)}."}), 400

    complaint.status = new_status
    db.session.commit()
    return jsonify({"message": "Status updated.", "complaint": complaint.to_dict()}), 200


# ---------------------------------------------------------------------------
# Stats
# ---------------------------------------------------------------------------

@api.route("/stats", methods=["GET"])
def get_stats():
    total = Complaint.query.count()
    pending = Complaint.query.filter_by(status="Pending").count()
    resolved = Complaint.query.filter_by(status="Resolved").count()

    high = Complaint.query.filter_by(priority="High").count()
    medium = Complaint.query.filter_by(priority="Medium").count()
    low = Complaint.query.filter_by(priority="Low").count()

    categories_raw = (
        db.session.query(Complaint.category, db.func.count(Complaint.id))
        .group_by(Complaint.category).all()
    )
    categories = {cat or "Uncategorized": count for cat, count in categories_raw}

    sentiments_raw = (
        db.session.query(Complaint.sentiment, db.func.count(Complaint.id))
        .group_by(Complaint.sentiment).all()
    )
    sentiments = {sent or "Unknown": count for sent, count in sentiments_raw}

    return jsonify({
        "total_complaints": total,
        "status": {"Pending": pending, "Resolved": resolved},
        "priority": {"High": high, "Medium": medium, "Low": low},
        "categories": categories,
        "sentiments": sentiments,
    }), 200


# ---------------------------------------------------------------------------
# CSV Export
# ---------------------------------------------------------------------------

@api.route("/export", methods=["GET"])
@require_auth
def export_csv():
    """Return all complaints as a downloadable CSV file. (Requires Auth)"""
    try:
        complaints = Complaint.query.order_by(Complaint.timestamp.desc()).all()
        
        output = io.StringIO()
        writer = csv.writer(output)

        # Header
        writer.writerow([
            "ID", "Customer Name", "Email", "Complaint Text",
            "Sentiment", "Sentiment Score", "Priority",
            "Category", "Status", "Timestamp",
        ])

        # Data rows
        for c in (complaints or []):
            writer.writerow([
                str(c.id),
                str(c.customer_name or ""),
                str(c.email or ""),
                str(c.complaint_text or ""),
                str(c.sentiment or "Neutral"),
                str(c.sentiment_score if c.sentiment_score is not None else 0.0),
                str(c.priority or "Medium"),
                str(c.category or "Other"),
                str(c.status or "Pending"),
                c.timestamp.isoformat() + "Z" if (c.timestamp and hasattr(c.timestamp, "isoformat")) else "",
            ])

        return Response(
            output.getvalue(),
            mimetype="text/csv",
            headers={"Content-Disposition": "attachment; filename=complaints_export.csv"},
        )
    except Exception as exc:
        print(f"ERROR in Export CSV: {exc}")
        return jsonify({"error": f"Failed to generate CSV: {str(exc)}"}), 500
