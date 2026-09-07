FROM golang:1.22-alpine AS builder

WORKDIR /app

COPY go.mod ./
COPY main.go ./

# go.sum is generated here since it isn't checked in; requires network access at build time.
RUN go mod tidy && go build -o consumer main.go

FROM alpine:3.20

WORKDIR /app
COPY --from=builder /app/consumer .

CMD ["./consumer"]
