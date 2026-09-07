const { startConsumer } = require("./kafka/consumer");

async function start() {
  try {
    await startConsumer();
    console.log("[consumer-service] Worker is running and listening for messages...");
  } catch (err) {
    console.error("[consumer-service] Failed to start:", err);
    process.exit(1);
  }
}

start();
