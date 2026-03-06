output "queues" {
  value = { for k, v in aws_sqs_queue.all_queues : k => v }
}

output "dld_queue" {
  value = aws_sqs_queue.dlq
}

