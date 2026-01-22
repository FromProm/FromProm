# Provider Versions
terraform {
    required_version = ">= 1.0"
    required_providers {
      aws = {
        source = "hashicorp/aws"
        version = "~> 6.0"
      }
    }
}

provider "aws" {
    region = "ap-northeast-2"
    shared_credentials_files = ["~/.aws/credentials"]
    profile = "default"
}

provider "aws" {
    alias  = "us-east-1"
    region = "us-east-1"
    shared_credentials_files = ["~/.aws/credentials"]
    profile = "default"
}
