const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { publishEvent } = require("../kafka/producer");

const router = express.Router();
const TOPIC = process.env.KAFKA_TOPIC || "demo.events";

// POST /events -> publish an arbitrary event payload to Kafka
router.post("/", async (req, res) => {
  const { type, data } = req.body;

  const correlationId = req.headers["kong-id"] || uuidv4();
  if (!type) {
    return res.status(400).json({ message: "'type' is required" });
  }

  const event = {
    id: uuidv4(),
    headers: req.headers,
    correlationId,
    type,
    data: data || {},
    producedAt: new Date().toISOString(),
  };

  try {
    await publishEvent(TOPIC, event);
    res.status(201).json({ message: "Event published", event });
  } catch (err) {
    console.error("[producer-service] Failed to publish event:", err.message);
    res.status(500).json({ message: "Failed to publish event" });
  }
});

module.exports = router;
