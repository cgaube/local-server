variable "lambdas_functions" {
  description = "A map of lambda_functions"
  type = map(object({
    function_name  = string
    source         = string
    s3_key         = string
    handler        = string
    runtime        = string
    architectures  = optional(list(string), ["x86_64"])
  }))
}

variable "lambdas_functions_env" {
  description = "A map of lambda functions env variables"
  type = map(
    map(string)
  )
}

