variable "sns_topics" {
  description = "List of sns topics"
  type        = list(string)
  default     = ["default"]
}
