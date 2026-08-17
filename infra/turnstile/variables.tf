variable "cloudflare_api_token" {
  description = "Cloudflare API token with Account Turnstile Edit permission."
  type        = string
  sensitive   = true
}

variable "cloudflare_account_id" {
  description = "Cloudflare account that owns the Turnstile widget."
  type        = string
  default     = "97f0a5f451a5ccd64839ce612eca932b"
}
