resource "aws_s3_bucket" "all_buckets" {
  for_each = toset(var.bucket_names)

  bucket = each.value

  force_destroy = true

}

resource "aws_s3_bucket_cors_configuration" "all_buckets_cors" {
  for_each = toset(var.bucket_names)

  bucket = each.value

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "POST", "PUT"]
    allowed_origins = ["http://localhost:3000"]
    expose_headers  = ["ETag"]
  }
}

resource "aws_s3_bucket_versioning" "versioning" {
  for_each = toset(var.bucket_names)

  bucket = each.value

  versioning_configuration {
    status = "Enabled"
  }
}
