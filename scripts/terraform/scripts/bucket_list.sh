#!/bin/bash
# Calculate the list of directories in the S3 init directory and the last modified date of the most recently modified file
# This will allow the Terraform script to determine if the S3 buckets need to be created and re-synced
set -e

directory=${1:-""}

if [[ -n "$directory" && -d "$directory" ]]; then
  dirs=$(find "$directory" -maxdepth 1 -mindepth 1 -type d -exec basename {} \;)
  arrBuckets=(${dirs///,/ })
  csv=$(IFS=,; echo "${arrBuckets[*]}")
  lastModified=$(find "$directory" -type f -exec stat -f "%m %c %N" {} + | awk '{if($1 > $2) print $1, $3; else print $2, $3}' | sort -nr | head -n 1 | awk '{print $1}')

  # Get the creation dates of the buckets
  # Build the filter query correctly
  filter=""
  for bucket in "${arrBuckets[@]}"; do
    filter+="Name=='$bucket' || "
  done
  # Remove trailing ' || '
  filter=${filter% || }
  # Run awslocal with correct query
  creationDates=$(awslocal s3api list-buckets --query "Buckets[?${filter}].CreationDate" --output text)

  # Convert CreationDates (ISO format) to epoch seconds
  latestCreation=$(date +%s)
  for date in $creationDates; do
    if [[ -n "$date" ]]; then
      fixed_date=${date/+00:00/Z}
      epoch=$(date -j -u -f "%Y-%m-%dT%H:%M:%SZ" "$fixed_date" +"%s")
      if (( epoch > latestCreation )); then
        latestCreation=$epoch
      fi
    fi
  done

  # Use the latest bucket creation date if it's more recent
  if (( latestCreation > lastModified )); then
    lastModified=$latestCreation
  fi

  echo "{\"directories\": \"$csv\", \"last_modified\": \"$lastModified\", \"latest_bucket_creation\": \"$latestCreation\"}"
else
  echo '{}'
fi
