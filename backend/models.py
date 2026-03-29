"""Database models for the Customer Complaint Analysis system."""

from datetime import datetime, timezone
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class Complaint(db.Model):
    """Model representing a customer complaint."""

    __tablename__ = "complaints"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    customer_name = db.Column(db.String(150), nullable=False)
    email = db.Column(db.String(254), nullable=False)
    complaint_text = db.Column(db.Text, nullable=False)
    sentiment = db.Column(db.String(20), nullable=True)
    sentiment_score = db.Column(db.Float, nullable=True)
    priority = db.Column(db.String(10), nullable=False, default="Medium")
    category = db.Column(db.String(100), nullable=True)
    timestamp = db.Column(
        db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    status = db.Column(db.String(20), nullable=False, default="Pending")

    # ---------- helpers ----------

    VALID_PRIORITIES = {"High", "Medium", "Low"}
    VALID_STATUSES = {"Pending", "Resolved"}

    def to_dict(self):
        """Serialize the complaint to a JSON-friendly dictionary."""
        return {
            "id": self.id,
            "customer_name": self.customer_name,
            "email": self.email,
            "complaint_text": self.complaint_text,
            "sentiment": self.sentiment,
            "sentiment_score": self.sentiment_score,
            "priority": self.priority,
            "category": self.category,
            "timestamp": self.timestamp.isoformat() + "Z" if self.timestamp else None,
            "status": self.status,
        }
