output "Resources" {
  value = {
    s3_init_last_modified: local.s3_init_last_modified
    s3_buckets = { for k, v in module.s3_buckets.buckets : k => "s3://${v.bucket}" }
    queues = { for k, v in module.sqs_queue.queues : k => v.url }
    lambdas = { for k, v in module.lambdas.functions : k => [
      v.function_name,
      v.s3_object_version,
      v.runtime,
      join(", ", v.architectures)
    ] }
    dynamodb_tables = { for k, v in module.dynamodb.tables : k => v.name }
  }
}
