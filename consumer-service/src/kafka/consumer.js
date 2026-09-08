const kafk = require("./client");

const TOPIC = process.env.KAFKA_TOPIC || "demo.events";

const consumer = kafka.consumer({
  groupId: process.env.KAFKA_GROUP_ID || "consumer-service-group",
});

async function subscribeWithRetry(maxAttempts = 8, delayMs = 2000) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await consumer.subscribe({ topic: TOPIC, fromBeginning: true });
      console.log(`[consumer-service] Subscribesd t topic "${TOPIC}"`);
      return;
    } catch (err) {
      console.warn(
        `[consumer-service] Subscribe attempt ${attempt}/${maxAttempts} failed (${err.message}). Retrying in ${delayMs}ms...`,
      );
      if (attempt === maxAttempts) throw err;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

async function startConsumer() {
  await consumer.connect();
  console.log("[consumer-service] Kafka consumer connected");

  await subscribeWithRetry();

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const raw = message.value ? message.value.toString() : null;

      let event;
      try {
        event = JSON.parse(raw);
      } catch (err) {
        console.error("[consumer-service] Invalid JSON payload:", raw);
        return;
      }

      console.log(
        `[consumer-service] Received event on "${topic}" (partition ${partition}, offset ${message.offset}):`,
        event,
      );

      // TODO: put real business logic here (save to DB, trigger side effects, etc.)
      await handleEvent(event);
    },
  });
}

async function handleEvent(event) {
  switch (event.type) {
    case "order.created":
      console.log("[consumer-service] Handling order.created:", event.data);
      break;
    case "user.created":
      console.log("[consumer-service] Handling user.created:", event.data);
      break;
    default:
      console.log("[consumer-service] Unhandled event type:", event.type);
  }
}

async function shutdown() {
  console.log("[consumer-service] Shutting down consumer...");
  await consumer.disconnect();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

module.exports = { startConsumer };
