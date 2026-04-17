# awslocal

Files placed in this directory are uploaded to LocalStack or Ministack via Terraform when running:

```sh
./server awslocal setup
```

Each subdirectory under `s3/` maps to an S3 bucket — adding a new folder will create a new bucket. Files placed inside are uploaded to that bucket on next setup.