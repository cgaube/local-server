output "buckets" {
  value = { for k, v in aws_s3_bucket.all_buckets : k => v }
}
