# Terraform Main Configuration

#4개의 ecr 리포지토리를 테라폼이 관리하도록 정의
resource "aws_ecr_repository" "auth" {
    name = "fromprom/auth"
    image_scanning_configuration {
      scan_on_push = true
    }
}
resource "aws_ecr_repository" "ai" {
    name = "fromprom/ai"
    image_scanning_configuration {
      scan_on_push = true
    }
}
resource "aws_ecr_repository" "front" {
    name = "fromprom/front"
    image_scanning_configuration {
      scan_on_push = true
    }
}
resource "aws_ecr_repository" "search" {
    name = "fromprom/search"
    image_scanning_configuration {
      scan_on_push = true
    }
}


## DynamoDB 테이블 생성
# DynamoDB Table
resource "aws_dynamodb_table" "fromprom" {
  name           = "FromProm_Table"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "PK"
  range_key      = "SK"

  # Primary Key Attributes
  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  # GSI Attributes
  attribute {
    name = "BOOKMARK_INDEX_PK"
    type = "S"
  }

  attribute {
    name = "BOOKMARK_INDEX_SK"
    type = "S"
  }

  attribute {
    name = "CREDIT_INDEX_PK"
    type = "S"
  }

  attribute {
    name = "CREDIT_INDEX_SK"
    type = "S"
  }

  attribute {
    name = "LIKE_INDEX_PK"
    type = "S"
  }

  attribute {
    name = "LIKE_INDEX_SK"
    type = "S"
  }

  attribute {
    name = "PROMPT_INDEX_PK"
    type = "S"
  }

  attribute {
    name = "PROMPT_INDEX_SK"
    type = "S"
  }

  attribute {
    name = "email"
    type = "S"
  }

  attribute {
    name = "nickname"
    type = "S"
  }

  # Global Secondary Indexes
  global_secondary_index {
    name            = "bookmark-index"
    hash_key        = "BOOKMARK_INDEX_PK"
    range_key       = "BOOKMARK_INDEX_SK"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "nickname-index"
    hash_key        = "nickname"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "like-index"
    hash_key        = "LIKE_INDEX_PK"
    range_key       = "LIKE_INDEX_SK"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "credit-index"
    hash_key        = "CREDIT_INDEX_PK"
    range_key       = "CREDIT_INDEX_SK"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "email-index"
    hash_key        = "email"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "prompt-index"
    hash_key        = "PROMPT_INDEX_PK"
    range_key       = "PROMPT_INDEX_SK"
    projection_type = "ALL"
  }

  tags = {
    Name        = "FromProm_Table"
    Environment = "production"
    Project     = "FromProm"
  }
}

resource "aws_sns_topic" "fromprom" {
  name = "fromprom_sns"
    tags = {
        Name        = "fromprom_sns"
        Environment = "production"
        Project     = "FromProm"
    }
}

## sqs queue - dead letter queue (us-east-1)
resource "aws_sqs_queue" "dlq" {
    provider = aws.us-east-1
    name                      = "fromprom-dlq"
    message_retention_seconds = 345600  # 14 days
    max_message_size = 1048576
    
    tags = {
        Name        = "fromprom_dlq"
        Environment = "production"
        Project     = "FromProm"
    }
}

## SQS Queue - Main Queue (us-east-1)
resource "aws_sqs_queue" "ai_queue" {
  provider = aws.us-east-1
  
  name                       = "prompt-evaluation-queue"
  visibility_timeout_seconds = 900  # 15분 (Lambda timeout)
  message_retention_seconds  = 345600  # 4일
  max_message_size = 1048576
  
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq.arn
    maxReceiveCount     = 3
  })
  
  tags = {
    Name        = "prompt-evaluation-queue"
    Environment = "production"
    Project     = "FromProm"
  }
}

## SQS Queue Policy - SNS가 메시지 보낼 수 있도록
resource "aws_sqs_queue_policy" "ai_queue_policy" {
  provider  = aws.us-east-1
  queue_url = aws_sqs_queue.ai_queue.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowSNSPublish"
        Effect = "Allow"
        Principal = {
          Service = "sns.amazonaws.com"
        }
        Action   = "SQS:SendMessage"
        Resource = aws_sqs_queue.ai_queue.arn
        Condition = {
          ArnEquals = {
            "aws:SourceArn" = aws_sns_topic.fromprom.arn
          }
        }
      }
    ]
  })
}

## SNS → SQS Subscription (Cross-Region)
resource "aws_sns_topic_subscription" "sqs_subscription" {
  topic_arn = aws_sns_topic.fromprom.arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.ai_queue.arn
}

## S3 Bucket - Frontend  
resource "aws_s3_bucket" "front" {
    bucket = "fromprom-front"

    tags = {
        Name        = "fromprom-front"
        Environment = "production"
        Project     = "FromProm"
    }
}

# S3 버전 관리
resource "aws_s3_bucket_versioning" "front" {
  bucket = aws_s3_bucket.front.id
  
  versioning_configuration {
    status = "Enabled"
  }
}

# S3 암호화
resource "aws_s3_bucket_server_side_encryption_configuration" "front" {
  bucket = aws_s3_bucket.front.id
  
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

# S3 퍼블릭 액세스 차단
resource "aws_s3_bucket_public_access_block" "front" {
  bucket = aws_s3_bucket.front.id
  
  block_public_acls       = true
  ignore_public_acls      = true
  block_public_policy     = true
  restrict_public_buckets = true
}

# S3 정적 웹사이트 호스팅
resource "aws_s3_bucket_website_configuration" "front" {
  bucket = aws_s3_bucket.front.id
  
  index_document {
    suffix = "index.html"
  }
  
  error_document {
    key = "index.html"
  }
}

## Cognito User Pool
resource "aws_cognito_user_pool" "fromprom" {
  provider = aws.us-east-1
  name     = "User pool - FromProm"
  
  deletion_protection = "ACTIVE"
  
  # 사용자명 설정
  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]
  
  username_configuration {
    case_sensitive = false
  }
  
  # 필수 속성
  schema {
    name                = "email"
    attribute_data_type = "String"
    required            = true
    mutable             = true
    
    string_attribute_constraints {
      min_length = 0
      max_length = 2048
    }
  }
  
  schema {
    name                = "nickname"
    attribute_data_type = "String"
    required            = true
    mutable             = true
    
    string_attribute_constraints {
      min_length = 0
      max_length = 2048
    }
  }
  
  # 비밀번호 정책
  password_policy {
    minimum_length    = 8
    require_uppercase = true
    require_lowercase = true
    require_numbers   = true
    require_symbols   = true
    temporary_password_validity_days = 7
  }
  
  # 계정 복구
  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
    
    recovery_mechanism {
      name     = "verified_phone_number"
      priority = 2
    }
  }
  
  # 이메일 설정
  email_configuration {
    email_sending_account = "COGNITO_DEFAULT"
  }
  
  # 관리자 생성 사용자 설정
  admin_create_user_config {
    allow_admin_create_user_only = false
    
    invite_message_template {
      email_subject = "Your temporary password"
      email_message = "Your username is {username} and temporary password is {####}."
      sms_message   = "Your username is {username} and temporary password is {####}."
    }
  }
  
  # 이메일 검증
  verification_message_template {
    default_email_option = "CONFIRM_WITH_CODE"
  }
  
  # MFA 설정
  mfa_configuration = "OFF"
  
  tags = {
    Name        = "User pool - FromProm"
    Environment = "production"
    Project     = "FromProm"
  }
}

# Cognito User Pool Domain
resource "aws_cognito_user_pool_domain" "fromprom" {
  provider    = aws.us-east-1
  domain      = "us-east-1zrmvfhdk4"
  user_pool_id = aws_cognito_user_pool.fromprom.id
}

# Cognito User Pool Client
resource "aws_cognito_user_pool_client" "fromprom" {
  provider    = aws.us-east-1
  name        = "FromProm"
  user_pool_id = aws_cognito_user_pool.fromprom.id
  
  # 토큰 유효 기간
  refresh_token_validity = 5
  access_token_validity  = 60
  id_token_validity      = 60
  
  token_validity_units {
    access_token  = "minutes"
    id_token      = "minutes"
    refresh_token = "days"
  }
  
  # 인증 플로우
  explicit_auth_flows = [
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_AUTH",
    "ALLOW_USER_SRP_AUTH"
  ]
  
  # OAuth 설정
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["code"]
  allowed_oauth_scopes                 = ["email", "openid", "phone"]
  supported_identity_providers         = ["COGNITO"]
  
  callback_urls = ["https://d84l1y8p4kdic.cloudfront.net"]
  
  # 보안 설정
  prevent_user_existence_errors = "ENABLED"
  enable_token_revocation      = true
  enable_propagate_additional_user_context_data = false
  
  auth_session_validity = 3
}
