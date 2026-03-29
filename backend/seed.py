"""
Seed script — populates the SQLite database with 20 sample complaints.
Run:  python seed.py
"""

from app import app
from models import db, Complaint
from nlp_engine import analyze_complaint
from datetime import datetime, timezone, timedelta
import random

SAMPLE_COMPLAINTS = [
    # HIGH priority / Negative
    {"customer_name": "Rahul Mehta", "email": "rahul.mehta@mail.com",
     "complaint_text": "This is absolutely unacceptable! I was charged twice for the same order and nobody is responding. I need a refund immediately or I will take legal action."},
    {"customer_name": "Sarah Johnson", "email": "sarah.j@outlook.com",
     "complaint_text": "Your product is dangerous — the battery started smoking and nearly caught fire. This is a critical safety hazard and I demand an urgent recall."},
    {"customer_name": "Mike Torres", "email": "mike.t@gmail.com",
     "complaint_text": "I believe this is a scam. I paid for premium service but received nothing. This is fraud and I am contacting my lawyer immediately."},
    {"customer_name": "Priya Sharma", "email": "priya.s@yahoo.com",
     "complaint_text": "The broken appliance caused water damage to my kitchen floor. This is outrageous — I want replacement and compensation for the damage immediately."},

    # HIGH priority / Neutral
    {"customer_name": "David Kim", "email": "d.kim@company.org",
     "complaint_text": "I need to report a critical system error. The login page has been broken since yesterday. Our entire team cannot access the platform urgently."},

    # MEDIUM priority / Negative
    {"customer_name": "Emma Wilson", "email": "emma.w@gmail.com",
     "complaint_text": "My delivery was delayed by two weeks and the package arrived damaged. Very disappointed with the shipping quality and lack of tracking updates."},
    {"customer_name": "Carlos Rivera", "email": "carlos.r@hotmail.com",
     "complaint_text": "The app keeps crashing every time I try to open my account. This error has persisted for days. It's frustrating and I can't access my billing info."},
    {"customer_name": "Ananya Patel", "email": "ananya.p@mail.com",
     "complaint_text": "I was overcharged on my last invoice by $45. The pricing shown on the website was wrong compared to what I was billed. Very disappointing."},
    {"customer_name": "James O'Brien", "email": "james.ob@icloud.com",
     "complaint_text": "Your customer service representative was rude and unhelpful. I had to wait 40 minutes on hold and the issue is still not resolved. Poor service overall."},
    {"customer_name": "Lisa Zhang", "email": "lisa.z@gmail.com",
     "complaint_text": "The product I received is defective — the screen has dead pixels and the device runs extremely slow. Not working as advertised at all."},
    {"customer_name": "Ahmed Hassan", "email": "ahmed.h@outlook.com",
     "complaint_text": "I placed my order 3 weeks ago and still haven't received it. The tracking shows it's been stuck in transit. This is a very frustrating experience with your delivery."},
    {"customer_name": "Nina Kowalski", "email": "nina.k@mail.com",
     "complaint_text": "Received the wrong item in my order. I ordered a blue jacket size M but got a red shirt size XL. Missing what I actually ordered. Very annoying."},

    # MEDIUM priority / Neutral
    {"customer_name": "Tom Bradley", "email": "tom.b@work.com",
     "complaint_text": "There seems to be an issue with my subscription renewal. The payment went through but my account still shows expired. Could you look into this error?"},

    # LOW priority / Positive
    {"customer_name": "Sophie Martin", "email": "sophie.m@gmail.com",
     "complaint_text": "I love your product overall and the quality is great! Just a small suggestion — it would be nice if you could add more color options to the premium line."},
    {"customer_name": "Raj Kapoor", "email": "raj.k@yahoo.com",
     "complaint_text": "Great service so far! I have a quick question about the warranty coverage — could you clarify if accidental damage is included? Thanks!"},
    {"customer_name": "Maria Garcia", "email": "maria.g@mail.com",
     "complaint_text": "Your team has been wonderful. Just some minor feedback: the checkout page could load a bit faster. Otherwise everything is fantastic, keep it up!"},

    # LOW priority / Neutral
    {"customer_name": "Alex Turner", "email": "alex.t@outlook.com",
     "complaint_text": "I'm curious about your return policy for items purchased on sale. Could you provide more information? Just an inquiry, not an urgent matter."},
    {"customer_name": "Jenny Liu", "email": "jenny.l@gmail.com",
     "complaint_text": "Would like to recommend adding a dark mode feature to the mobile app. It's a small suggestion but would improve the experience for many users."},

    # LOW priority / Negative (mild)
    {"customer_name": "Chris Evans", "email": "chris.e@hotmail.com",
     "complaint_text": "The font size on the mobile website is a bit small and hard to read. Minor issue but I'd like to give this feedback for your design team to consider."},

    # MEDIUM priority / Positive (mixed)
    {"customer_name": "Diana Prince", "email": "diana.p@company.com",
     "complaint_text": "I appreciate the quick response from your support team last time. However, my latest order is still delayed and I haven't received a tracking update. Could you check?"},
]


def seed():
    """Insert 20 sample complaints into the database."""
    with app.app_context():
        existing = Complaint.query.count()
        if existing > 0:
            print(f"Database already has {existing} complaints. Skipping seed.")
            return

        base_time = datetime.now(timezone.utc) - timedelta(days=14)
        statuses = ["Pending"] * 14 + ["Resolved"] * 6
        random.shuffle(statuses)

        for i, data in enumerate(SAMPLE_COMPLAINTS):
            nlp = analyze_complaint(data["complaint_text"])
            complaint = Complaint(
                customer_name=data["customer_name"],
                email=data["email"],
                complaint_text=data["complaint_text"],
                sentiment=nlp["sentiment"],
                sentiment_score=nlp["score"],
                priority=nlp["priority"],
                category=nlp["category"],
                status=statuses[i] if i < len(statuses) else "Pending",
                timestamp=base_time + timedelta(hours=i * 8, minutes=random.randint(0, 59)),
            )
            db.session.add(complaint)

        db.session.commit()
        print(f"Seeded {len(SAMPLE_COMPLAINTS)} sample complaints.")


if __name__ == "__main__":
    seed()
