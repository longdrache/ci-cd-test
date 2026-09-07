FROM golang:1.22-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./

ENV GOPROXY=https://proxy.golang.org,direct
ENV GONOSUMCHECK=*
ENV GONOSUMDB=*

RUN go mod download

COPY main.go ./
RUN go build -o consumer main.go

FROM alpine:3.20

WORKDIR /app
COPY --from=builder /app/consumer .

CMD ["./consumer"]
