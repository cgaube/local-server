# Lambdas

## Webhook Gateway

API gateway to be used with ngrok to receive webhook events

- Debug -> only display the payload
- Queue -> forward the webhook to a SQS queue (TODO make it configurable)

```bash
cd ./scripts/lambda/webhook-to-queue
sam build
sam local start-api -p 2999 --docker-network=shared_network
```

```bash
ngrok http --domain=romantic-civet-remarkably.ngrok-free.app 2999
```
