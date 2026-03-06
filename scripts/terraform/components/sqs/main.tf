resource "aws_sqs_queue" "dlq" {
  name = "dead_letter_queue"
}

resource "aws_sqs_queue" "all_queues" {
  for_each = toset(var.queue_names)

  name = each.value
  visibility_timeout_seconds = 10

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq.arn
    maxReceiveCount     = 5
  })
}
