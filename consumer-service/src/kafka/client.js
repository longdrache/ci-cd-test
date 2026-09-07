const { Kafka, logLevel } = require("kafkajs");

const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID || "consumer-service",
  brokers: [process.env.KAFKA_BROKER || "localhost:9092"],
  logLevel: logLevel.NOTHING,
  retry: {
    initialRetryTime: 300,
    retries: 10,
  },
});

module.exports = kafka;
