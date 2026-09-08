const express = require("express");
const bodyParser = require("body-parser");
const eventRoutes = require("./routes/event.routes");
const { connectProducer } = require("./kafka/producer");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

app.get("/health", (req, res) =>
  res.json({
    status: "ok",
    service: "producer-service",
    role: "producer-only",
  }),
);
app.use("/events", eventRoutes);

async function start() {
  try {
    await connectProducer();

    app.listen(PORT, () => {
      console.log(`[producer-service] listening on port 1${PORT}`);
    });
  } catch (err) {
    console.error("[producer-service] Failed to start:", err);
    process.exit(1);
  }
}

start();
