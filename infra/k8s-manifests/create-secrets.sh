#!/bin/bash

# Kubernetes Secret 생성 스크립트
# GitLab CI/CD 변수를 사용하여 Kubernetes Secret을 생성합니다.

set -e

echo "🔐 Creating Kubernetes Secrets from GitLab CI/CD Variables..."
echo ""

# Auth Service Secrets
echo "Creating auth-service-secrets..."
kubectl create secret generic auth-service-secrets \
  --from-literal=cognito-client-id="${AWS_COGNITO_CLIENT_ID}" \
  --from-literal=cognito-user-pool-id="${AWS_COGNITO_USER_POOL_ID}" \
  --from-literal=sns-topic-arn="${AWS_SNS_TOPIC_ARN}" \
  --dry-run=client -o yaml | kubectl apply -f -

echo "✓ auth-service-secrets created"
echo ""

# Auth Service ConfigMap
echo "Creating auth-service-config..."
kubectl create configmap auth-service-config \
  --from-literal=dynamodb-table-name="${AWS_DYNAMODB_TABLE_NAME}" \
  --dry-run=client -o yaml | kubectl apply -f -

echo "✓ auth-service-config created"
echo ""

echo "✅ All secrets and configmaps created successfully!"
echo ""
echo "Verify with:"
echo "  kubectl get secrets"
echo "  kubectl get configmaps"
