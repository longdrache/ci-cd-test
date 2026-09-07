import json
import os
import time
from kafka import KafkaProducer
from kafka.errors import NoBrokersAvailable

KAFKA_BROKER = os.getenv("KAFKA_BROKER", "localhost:9092")
KAFKA_TOPIC = os.getenv("KAFKA_TOPIC", "demo.events")

_producer = None


def get_producer():
    """Lazily create and cache a KafkaProducer, retrying while the broker
    is still starting up."""
    global _producer
    if _producer is not None:
        return _producer

    attempts = 0
    max_attempts = 15
    while attempts < max_attempts:
        try:
            _producer = KafkaProducer(
                bootstrap_servers=KAFKA_BROKER,
                value_serializer=lambda v: json.dumps(v).encode("utf-8"),
                key_serializer=lambda k: k.encode("utf-8") if k else None,
                retries=5,
            )
            print(f"[python-producer-service] Connected to Kafka at {KAFKA_BROKER}")
            return _producer
        except NoBrokersAvailable:
            attempts += 1
            print(
                f"[python-producer-service] Kafka not available yet "
                f"(attempt {attempts}/{max_attempts}), retrying in 2s..."
            )
            time.sleep(2)

    raise RuntimeError("Could not connect to Kafka after multiple attempts")


def publish_event(event: dict, topic: str = None):
    producer = get_producer()
    target_topic = topic or KAFKA_TOPIC
    future = producer.send(target_topic, key=event.get("id"), value=event)
    producer.flush()
    record_metadata = future.get(timeout=10)
    print(
        f"[python-producer-service] Published event to '{record_metadata.topic}' "
        f"(partition {record_metadata.partition}, offset {record_metadata.offset}): {event}"
    )
    return record_metadata
