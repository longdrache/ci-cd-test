const kafka = require("./client");

const producer = kafka.producer();
let connected = false;

async function connectProducer() {
  if (!connected) {
    await producer.connect();
    connected = true;
    console.log("[producer-service] Kafka producer connected");
  }
}

async function disconnectProducer() {
  if (connected) {
    await producer.disconnect();
    connected = false;
  }
}

async function publishEvent(topic, message) {
  await connectProducer();
  await producer.send({
    topic,
    messages: [
      {
        key: message.id || null,
        value: JSON.stringify(message),
      },
    ],
  });
  console.log(`[producer-service] Published event to "${topic}":`, message);
}

module.exports = { connectProducer, disconnectProducer, publishEvent };
