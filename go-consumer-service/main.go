package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"

	kafka "github.com/segmentio/kafka-go"
)

type Event struct {
	ID         string                 `json:"id"`
	Type       string                 `json:"type"`
	Data       map[string]interface{} `json:"data"`
	ProducedAt string                 `json:"producedAt"`
	ProducedBy string                 `json:"producedBy,omitempty"`
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok && value != "" {
		return value
	}
	return fallback
}

func handleEvent(event Event) {
	switch event.Type {
	case "order.created":
		fmt.Printf("[go-consumer-service] Handling order.created: %+v\n", event.Data)
	case "user.created":
		fmt.Printf("[go-consumer-service] Handling user.created: %+v\n", event.Data)
	default:
		fmt.Printf("[go-consumer-service] Unhandled event type '%s': %+v\n", event.Type, event.Data)
	}
}

func main() {
	broker := getEnv("KAFKA_BROKER", "localhost:9092")
	topic := getEnv("KAFKA_TOPIC", "demo.events")
	groupID := getEnv("KAFKA_GROUP_ID", "go-consumer-service-group")

	log.Printf("[go-consumer-service] Connecting to Kafka broker=%s topic=%s groupID=%s", broker, topic, groupID)

	reader := kafka.NewReader(kafka.ReaderConfig{
		Brokers:     []string{broker},
		Topic:       topic,
		GroupID:     groupID,
		MinBytes:    1,
		MaxBytes:    10e6,
		StartOffset: kafka.FirstOffset,
	})
	defer reader.Close()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Graceful shutdown on SIGINT/SIGTERM
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		<-sigChan
		log.Println("[go-consumer-service] Shutting down consumer...")
		cancel()
	}()

	log.Println("[go-consumer-service] Worker is running and listening for messages...")

	for {
		msg, err := reader.ReadMessage(ctx)
		if err != nil {
			if ctx.Err() != nil {
				log.Println("[go-consumer-service] Context cancelled, exiting read loop")
				return
			}
			log.Printf("[go-consumer-service] Error reading message: %v", err)
			continue
		}

		var event Event
		if err := json.Unmarshal(msg.Value, &event); err != nil {
			log.Printf("[go-consumer-service] Invalid JSON payload: %s", string(msg.Value))
			continue
		}

		log.Printf(
			"[go-consumer-service] Received event on \"%s\" (partition %d, offset %d): %+v",
			msg.Topic, msg.Partition, msg.Offset, event,
		)

		handleEvent(event)
	}
}
