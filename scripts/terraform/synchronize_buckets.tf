# Synchronize the source files to the S3 buckets
# This will be executed all the time "apply" command is executed.
resource "null_resource" "update_source_files" {
  for_each = toset(local.s3_buckets)
  depends_on = [module.s3_buckets]

  triggers = {
    last_modified = local.s3_init_last_modified
  }

  provisioner "local-exec" {
    command = "[ -d \"${var.s3_buckets_folder}${each.value}\" ] && awslocal s3 sync ${var.s3_buckets_folder}${each.value} s3://${each.value}/ --delete --checksum-algorithm SHA1"
  }
}
