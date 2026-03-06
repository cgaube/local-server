resource "aws_sqs_queue" "dlq" {
  name = "dead_letter_queue"
}


resource "aws_sns_topic" "all_sns_topics" {
  for_each = toset(var.sns_topics)
  name = each.value
}
