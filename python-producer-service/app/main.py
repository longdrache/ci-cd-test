import os
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from app.kafka_producer import publish_event, get_producer

app = FastAPI(title="python-producer-service", description="Kafka producer-only service (FastAPI)")

KAFKA_TOPIC = os.getenv("KAFKA_TOPIC", "demo.events")


class EventIn(BaseModel):
    type: str
    data: Optional[Dict[str, Any]] = None


@app.on_event("startup")
def startup_event():
    # Warm up the Kafka connection at startup so the first request isn't slow.
    get_producer()


@app.get("/health")
def health():
    return {"status": "ok", "service": "python-producer-service", "role": "producer-only"}


@app.post("/events", status_code=201)
def create_event(event_in: EventIn):
    if not event_in.type:
        raise HTTPException(status_code=400, detail="'type' is required")

    event = {
        "id": str(uuid.uuid4()),
        "type": event_in.type,
        "data": event_in.data or {},
        "producedAt": datetime.now(timezone.utc).isoformat(),
        "producedBy": "python-producer-service",
    }

    try:
        publish_event(event, topic=KAFKA_TOPIC)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Failed to publish event: {exc}")

    return {"message": "Event published", "event": event}
