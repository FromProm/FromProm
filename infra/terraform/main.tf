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

## Cognito User Pool - US East (Virginia) - CloudFront용
resource "aws_cognito_user_pool" "fromprom_us" {
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

# Cognito User Pool Domain - US
resource "aws_cognito_user_pool_domain" "fromprom_us" {
  provider    = aws.us-east-1
  domain      = "us-east-1zrmvfhdk4"
  user_pool_id = aws_cognito_user_pool.fromprom_us.id
}

# Cognito User Pool Client - US
resource "aws_cognito_user_pool_client" "fromprom_us" {
  provider    = aws.us-east-1
  name        = "FromProm"
  user_pool_id = aws_cognito_user_pool.fromprom_us.id
  
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

## Cognito User Pool - AP Northeast (Seoul) - 서울 리소스용
resource "aws_cognito_user_pool" "fromprom_kr" {
  name = "User pool - FromProm"

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

  # 이메일 설정 - SES 사용
  email_configuration {
    email_sending_account = "DEVELOPER"
    source_arn           = "arn:aws:ses:ap-northeast-2:261595668962:identity/fromprom.cloud"
    from_email_address   = "noreply@fromprom.cloud"
  }

  # 관리자 생성 사용자 설정
  admin_create_user_config {
    allow_admin_create_user_only = false
  }

  # 이메일 검증 - 커스텀 메시지
  verification_message_template {
    default_email_option = "CONFIRM_WITH_CODE"
    email_subject        = "[FromProm] 이메일 인증 코드"
    email_message        = "<div style=\"font-family: Arial, sans-serif; padding: 20px;\">\n  <h2>FromProm 이메일 인증</h2>\n  <p>회원가입을 위한 인증 코드입니다.</p>\n  <h3>{####}</h3>\n</div>"
    sms_message          = "Your verification code is {####}."
  }

  # MFA 설정
  mfa_configuration = "OFF"

  tags = {
    Name        = "User pool - FromProm (Seoul)"
    Environment = "production"
    Project     = "FromProm"
    Region      = "ap-northeast-2"
  }
}

# Cognito User Pool Domain - Seoul
resource "aws_cognito_user_pool_domain" "fromprom_kr" {
  domain       = "ap-northeast-2xz41ydjbw"
  user_pool_id = aws_cognito_user_pool.fromprom_kr.id
}

# Cognito User Pool Client - Seoul
resource "aws_cognito_user_pool_client" "fromprom_kr" {
  name         = "FromProm"
  user_pool_id = aws_cognito_user_pool.fromprom_kr.id

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
    "ALLOW_USER_PASSWORD_AUTH",
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

## CloudFront Origin Access Control - S3 접근 권한
resource "aws_cloudfront_origin_access_control" "s3_oac" {
  name                              = "oac-fromprom-front.s3.ap-northeast-2.amazonaws.com-mkdr7zk8ujj"
  description                       = "Created by CloudFront"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

## CloudFront Distribution
resource "aws_cloudfront_distribution" "main" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "Fromprom-CloudFront"
  price_class         = "PriceClass_All"
  http_version        = "http2"
  
  # 커스텀 도메인
  aliases = [
    "fromprom.cloud",
    "www.fromprom.cloud"
  ]
  
  # Origin 1: S3 (프론트엔드)
  origin {
    domain_name              = aws_s3_bucket.front.bucket_regional_domain_name
    origin_id                = "fromprom-front.s3.ap-northeast-2.amazonaws.com-mkdqk3pj8me"
    origin_access_control_id = aws_cloudfront_origin_access_control.s3_oac.id
    
    connection_attempts = 3
    connection_timeout  = 10
  }
  
  # Origin 2: EKS ALB (백엔드 API)
  origin {
    domain_name = "k8s-default-fromprom-9d9d373c16-1811167122.ap-northeast-2.elb.amazonaws.com"
    origin_id   = "ALB-Backend"
    
    custom_origin_config {
      http_port                = 80
      https_port               = 443
      origin_protocol_policy   = "https-only"
      origin_ssl_protocols     = ["TLSv1.2"]
      origin_read_timeout      = 30
      origin_keepalive_timeout = 5
    }
    
    connection_attempts = 3
    connection_timeout  = 10
  }
  
  # 기본 동작: S3 (프론트엔드)
  default_cache_behavior {
    target_origin_id       = "fromprom-front.s3.ap-northeast-2.amazonaws.com-mkdqk3pj8me"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true
    
    allowed_methods = ["GET", "HEAD"]
    cached_methods  = ["GET", "HEAD"]
    
    # AWS 관리형 Cache Policy
    cache_policy_id = "658327ea-f89d-4fab-a63d-7e88639e58f6"
  }
  
  # /api/* 동작: EKS ALB (백엔드)
  ordered_cache_behavior {
    path_pattern           = "/api/*"
    target_origin_id       = "ALB-Backend"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true
    
    allowed_methods = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods  = ["GET", "HEAD"]
    
    # AWS 관리형 정책들
    cache_policy_id          = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad"
    origin_request_policy_id = "216adef6-5c7f-47e4-b989-5492eafa07d3"
  }
  
  # 에러 응답 (SPA용)
  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 10
  }
  
  # SSL 인증서 (ACM)
  viewer_certificate {
    acm_certificate_arn      = "arn:aws:acm:us-east-1:261595668962:certificate/5b331f71-3df3-454b-98bf-657edf532940"
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
  
  # 지역 제한 없음
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
  
  # WAF 연결
  web_acl_id = "arn:aws:wafv2:us-east-1:261595668962:global/webacl/CreatedByCloudFront-fcd8d0db/2aeb0729-a0e9-4bbb-882f-8f8c9fb3b80f"
  
  tags = {
    Name        = "Fromprom-CloudFront"
    Environment = "production"
    Project     = "FromProm"
  }
}


## Lambda Function - SQS to AgentCore
resource "aws_lambda_function" "sqs_core" {
  provider      = aws.us-east-1
  function_name = "SQS_core"
  role          = "arn:aws:iam::261595668962:role/sqs-lambda"
  handler       = "lambda_function.lambda_handler"
  runtime       = "python3.14"
  
  # 코드는 수동 배포되므로 lifecycle로 무시
  filename         = "dummy.zip"  # import 후 실제 코드로 대체됨
  source_code_hash = "zGufqSnvKmN8T+iNSAod8eLt6hKBVMu4fgDN3n5J6jA="
  
  timeout     = 900
  memory_size = 512
  
  # 환경변수
  environment {
    variables = {
      AGENTCORE_ENDPOINT_NAME = "DEFAULT"
      AGENTCORE_RUNTIME_ARN   = "arn:aws:bedrock-agentcore:us-east-1:261595668962:runtime/ai_service-IiSUYrFdjB"
    }
  }
  
  # 스토리지
  ephemeral_storage {
    size = 512
  }
  
  # 아키텍처
  architectures = ["x86_64"]
  
  # 트레이싱
  tracing_config {
    mode = "Active"
  }
  
  # 로깅
  logging_config {
    log_format = "Text"
    log_group  = "/aws/lambda/SQS_core"
  }
  
  # 코드 변경 무시 (수동 배포)
  lifecycle {
    ignore_changes = [
      filename,
      source_code_hash,
      last_modified
    ]
  }
  
  tags = {
    Name        = "SQS_core"
    Environment = "production"
    Project     = "FromProm"
  }
}

## Lambda Event Source Mapping - SQS 트리거
resource "aws_lambda_event_source_mapping" "sqs_trigger" {
  provider          = aws.us-east-1
  event_source_arn  = aws_sqs_queue.ai_queue.arn
  function_name     = aws_lambda_function.sqs_core.arn
  enabled           = true
  batch_size        = 10
  
  # Batch window는 0 (즉시 처리)
  maximum_batching_window_in_seconds = 0
}
