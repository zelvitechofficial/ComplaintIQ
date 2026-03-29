"""
NLP Engine for Customer Complaint Analysis
===========================================
Provides sentiment analysis (VADER), rule-based priority detection,
and keyword-based category classification.
"""

import nltk
from nltk.sentiment.vader import SentimentIntensityAnalyzer

try:
    nltk.data.find("sentiment/vader_lexicon.zip")
except LookupError:
    nltk.download("vader_lexicon", quiet=True)

_sia = SentimentIntensityAnalyzer()

# ---------------------------------------------------------------------------
# Priority keywords
# ---------------------------------------------------------------------------

_HIGH_KEYWORDS = [
    "urgent", "broken", "fraud", "legal", "lawsuit",
    "dangerous", "immediately", "critical", "scam",
    "threatening", "hazardous", "emergency", "safety",
    "unacceptable", "outrageous", "illegal",
]

_MEDIUM_KEYWORDS = [
    "delayed", "issue", "not working", "disappointed",
    "slow", "wrong", "error", "poor", "bad",
    "frustrating", "annoying", "inconvenient", "overcharged",
    "defective", "malfunction", "missing", "damaged",
]

_LOW_KEYWORDS = [
    "suggestion", "inquiry", "feedback", "question",
    "wondering", "curious", "minor", "small",
    "would like", "could you", "recommend", "improve",
]

# ---------------------------------------------------------------------------
# Category keyword maps
# ---------------------------------------------------------------------------

_CATEGORY_KEYWORDS = {
    "Billing": [
        "bill", "billing", "charge", "charged", "invoice", "payment",
        "refund", "overcharged", "price", "pricing", "fee", "subscription",
        "transaction", "receipt", "credit card", "debit",
    ],
    "Technical": [
        "bug", "crash", "error", "glitch", "not working", "login",
        "password", "software", "app", "application", "website", "server",
        "update", "install", "load", "freeze", "screen", "connection",
        "technical", "malfunction", "code",
    ],
    "Delivery": [
        "delivery", "deliver", "shipping", "shipped", "package", "parcel",
        "tracking", "courier", "late", "delayed", "not received",
        "wrong address", "damaged in transit", "lost", "dispatch",
    ],
    "Service Quality": [
        "rude", "unprofessional", "poor service", "bad service",
        "customer service", "support", "representative", "staff",
        "behaviour", "behavior", "attitude", "wait time", "hold",
        "response time", "ignored", "disrespectful", "unhelpful",
    ],
    "Product": [
        "product", "item", "quality", "defective", "broken", "damaged",
        "faulty", "warranty", "replacement", "size", "color", "colour",
        "material", "specification", "feature", "design", "manufacture",
    ],
}

# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def analyze_sentiment(text):
    scores = _sia.polarity_scores(text)
    compound = scores["compound"]
    if compound >= 0.05:
        label = "Positive"
    elif compound <= -0.05:
        label = "Negative"
    else:
        label = "Neutral"
    return label, round(compound, 4)


def detect_priority(text):
    lowered = text.lower()
    for kw in _HIGH_KEYWORDS:
        if kw in lowered:
            return "High"
    for kw in _MEDIUM_KEYWORDS:
        if kw in lowered:
            return "Medium"
    for kw in _LOW_KEYWORDS:
        if kw in lowered:
            return "Low"
    _, score = analyze_sentiment(text)
    if score <= -0.5:
        return "Medium"
    return "Low"


def classify_category(text):
    lowered = text.lower()
    scores = {}
    for category, keywords in _CATEGORY_KEYWORDS.items():
        count = sum(1 for kw in keywords if kw in lowered)
        if count > 0:
            scores[category] = count
    if not scores:
        return "Other"
    return max(scores, key=scores.get)


def analyze_complaint(text):
    if not text or not text.strip():
        return {
            "sentiment": "Neutral",
            "priority": "Low",
            "category": "Other",
            "score": 0.0,
        }
    sentiment, score = analyze_sentiment(text)
    priority = detect_priority(text)
    category = classify_category(text)
    return {
        "sentiment": sentiment,
        "priority": priority,
        "category": category,
        "score": score,
    }
