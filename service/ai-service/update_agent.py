"""
AgentCore 코드 업데이트 스크립트
"""
import boto3
import zipfile
import os
from pathlib import Path

def update_agentcore():
    """agent.py와 app 폴더를 zip으로 압축해서 AgentCore 업데이트"""
    
    # AgentCore 정보
    agent_id = "ai_service-IiSUYrFdjB"
    region = "us-east-1"
    
    # 압축할 파일들
    files_to_zip = [
        "agent.py",
        ".env",
        "pyproject.toml",
    ]
    
    # app 폴더 전체 포함
    app_dir = Path("app")
    
    # zip 파일 생성
    zip_path = "agent_update.zip"
    
    print(f"Creating zip file: {zip_path}")
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        # 개별 파일 추가
        for file in files_to_zip:
            if os.path.exists(file):
                zipf.write(file)
                print(f"  Added: {file}")
        
        # app 폴더 전체 추가
        for file_path in app_dir.rglob("*"):
            if file_path.is_file() and not file_path.name.endswith('.pyc'):
                arcname = str(file_path)
                zipf.write(file_path, arcname)
                print(f"  Added: {arcname}")
    
    print(f"\nZip file created: {zip_path}")
    print(f"Size: {os.path.getsize(zip_path) / 1024 / 1024:.2f} MB")
    
    # S3에 업로드
    s3_client = boto3.client('s3', region_name=region)
    bucket = "fromprom-s3"
    s3_key = f"agentcore/{agent_id}/agent_update.zip"
    
    print(f"\nUploading to S3: s3://{bucket}/{s3_key}")
    s3_client.upload_file(zip_path, bucket, s3_key)
    print("Upload complete!")
    
    # AgentCore 업데이트
    print(f"\nUpdating AgentCore: {agent_id}")
    bedrock_client = boto3.client('bedrock-agent-runtime', region_name=region)
    
    # 참고: 실제 업데이트 API는 bedrock-agentcore 전용이므로
    # 콘솔에서 수동으로 업데이트하거나 AWS CLI 사용 필요
    
    print(f"\nNext steps:")
    print(f"1. Go to AWS Bedrock AgentCore console")
    print(f"2. Find agent: {agent_id}")
    print(f"3. Update with S3 location: s3://{bucket}/{s3_key}")
    print(f"   OR upload the local file: {zip_path}")
    
    return zip_path

if __name__ == "__main__":
    update_agentcore()
