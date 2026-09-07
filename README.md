# Kafka Producer/Consumer Split Boilerplate (Express + KafkaJS + Apache Kafka)

Boilerplate với **2 service tách biệt hoàn toàn theo vai trò**:

- **producer-service** (Node.js/Express) — CHỈ publish message lên Kafka. HTTP API `POST /events` ở port `3001`.
- **consumer-service** (Node.js) — CHỈ consume message từ Kafka. Background worker, không có HTTP API.
- **python-producer-service** (Python/FastAPI) — CHỈ publish message lên Kafka. HTTP API `POST /events` ở port `3003`.
- **go-consumer-service** (Go) — CHỈ consume message từ Kafka. Background worker, không có HTTP API.
- **kafka** — dùng image chính thức `apache/kafka:3.9.0` (KRaft mode, không cần Zookeeper).
- **kafka-init** — job chạy 1 lần để tạo sẵn topic `demo.events` trước khi mọi producer/consumer khởi động, tránh lỗi `UNKNOWN_TOPIC_OR_PARTITION` do race condition với auto-create.

Cả 4 service đều publish/consume chung 1 topic `demo.events`, nên mọi consumer (Node và Go) đều nhận được event dù event đó được publish từ producer Node hay Python — minh hoạ khả năng giao tiếp liên ngôn ngữ qua Kafka.

Đây là mô hình phổ biến khi bạn muốn tách rõ ràng service nào tạo dữ liệu/sự kiện (producer) và service nào xử lý/phản ứng với sự kiện đó (consumer), ví dụ: 1 service ghi log/audit event, 1 service xử lý nghiệp vụ downstream.

## Cấu trúc thư mục

```
kafka-producer-consumer-boilerplate/
├── docker-compose.yml
├── producer-service/              # Node.js, role: producer ONLY
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── index.js
│       ├── kafka/
│       │   ├── client.js
│       │   └── producer.js
│       └── routes/
│           └── event.routes.js
├── consumer-service/               # Node.js, role: consumer ONLY
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── index.js
│       └── kafka/
│           ├── client.js
│           └── consumer.js
├── python-producer-service/        # Python/FastAPI, role: producer ONLY
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py                 # FastAPI app, POST /events
│       └── kafka_producer.py       # publish_event()
└── go-consumer-service/            # Go, role: consumer ONLY
    ├── Dockerfile
    ├── go.mod
    └── main.go                     # background worker, reads demo.events
```

## Chạy thử

```bash
docker compose up --build
```

Nếu chạy lại lần 2 mà từng đổi image Kafka trước đó / gặp lỗi metadata, nên xoá volume cũ trước:
```bash
docker compose down -v
docker compose up --build
```

### Nếu vẫn gặp lỗi `UNKNOWN_TOPIC_OR_PARTITION` / "This server does not host this topic-partition"

- Đảm bảo container `kafka-init` chạy xong và log ra `Topic demo.events is ready` trước khi 2 service kia start (xem bằng `docker compose logs kafka-init`). Nếu `kafka-init` thoát với lỗi, `producer-service`/`consumer-service` sẽ không start (do `condition: service_completed_successfully`).
- `consumer-service` đã có sẵn cơ chế retry-subscribe (8 lần, cách nhau 2s) để chịu được độ trễ propagate metadata trên broker.
- Nếu dùng Docker Compose bản cũ không hỗ trợ `condition: service_completed_successfully`, nâng cấp Docker Compose lên bản mới (>= v2.20), hoặc bỏ điều kiện đó và chỉ dựa vào cơ chế retry ở trên.

## Test luồng

`producer-service` (Node) chạy ở `http://localhost:3001`. Gửi event:

```bash
curl -X POST http://localhost:3001/events \
  -H "Content-Type: application/json" \
  -d '{"type": "order.created", "data": {"orderId": "abc123", "amount": 99.5}}'
```

`python-producer-service` (FastAPI) chạy ở `http://localhost:3003`. Gửi event tương tự:

```bash
curl -X POST http://localhost:3003/events \
  -H "Content-Type: application/json" \
  -d '{"type": "user.created", "data": {"userId": "u-001", "email": "a@example.com"}}'
```

FastAPI cũng có Swagger UI sẵn để test bằng trình duyệt: `http://localhost:3003/docs`

`consumer-service` (Node) và `go-consumer-service` (Go) không có port public, cả hai đều đăng ký cùng topic `demo.events` nhưng với `group.id` khác nhau, nên **cả hai đều nhận được mọi event**, bất kể event đó được publish từ producer Node hay Python:

```bash
docker compose logs -f consumer-service go-consumer-service
```

Bạn sẽ thấy cả 2 consumer cùng log ra event vừa gửi, ví dụ:
```
consumer-service      | [consumer-service] Received event on "demo.events" ...
go-consumer-service   | 2026/09/06 ... [go-consumer-service] Received event on "demo.events" ...
```

## Mở rộng

- Đổi tên topic: sửa biến `KAFKA_TOPIC` trong `docker-compose.yml` VÀ trong lệnh tạo topic ở service `kafka-init` (đổi cả 2 chỗ cho khớp).
- Thêm nhiều consumer group cùng đọc 1 topic: tạo thêm service tương tự `consumer-service`/`go-consumer-service`, đổi `KAFKA_GROUP_ID` khác đi để nhận được bản sao riêng của mọi message.
- Thêm logic thật: sửa `handleEvent()` trong `consumer-service/src/kafka/consumer.js` (Node) hoặc hàm `handleEvent()` trong `go-consumer-service/main.go` (Go) để lưu DB, gọi service khác, v.v.
- Muốn producer publish nhiều loại topic khác nhau: sửa route `/events` (Node ở `event.routes.js`, Python ở `app/main.py`) để nhận `topic` từ body hoặc tạo route riêng cho từng loại event.
- Go dùng multi-stage Docker build, tự chạy `go mod tidy` trong lúc build để sinh `go.sum` — cần máy build có mạng internet lúc `docker compose build`.
- `python-producer-service` dùng `kafka-python-ng` (fork được maintain của `kafka-python`) thay vì `kafka-python` gốc, vì bản gốc bị lỗi `ModuleNotFoundError: No module named 'kafka.vendor.six.moves'` trên Python 3.12. Nếu muốn dùng `kafka-python` gốc, phải hạ base image xuống `python:3.11-slim` trong Dockerfile.
