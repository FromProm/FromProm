import requests
import json
import time

# 테스트 요청 데이터
with open('test_request.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print("🚀 Starting MCP test...")
start_time = time.time()

# POST 요청
response = requests.post('http://localhost:8000/jobs', json=data)

if response.status_code == 200:
    result = response.json()
    job_id = result.get('job_id')
    print(f"✅ Job created: {job_id}")
    
    # 결과 확인
    get_response = requests.get(f'http://localhost:8000/jobs/{job_id}')
    if get_response.status_code == 200:
        job_result = get_response.json()
        end_time = time.time()
        
        print(f"⏱️ Total time: {end_time - start_time:.2f} seconds")
        print(f"📊 Hallucination score: {job_result.get('metrics', {}).get('hallucination', {}).get('score', 'N/A')}")
        
        # 환각탐지 상세 결과 확인
        hallucination_details = job_result.get('metrics', {}).get('hallucination', {}).get('details', {})
        if hallucination_details:
            print(f"🔍 Total claims: {hallucination_details.get('total_claims', 0)}")
            print(f"🔍 Unique claims: {hallucination_details.get('unique_claims', 0)}")
    else:
        print(f"❌ Failed to get job result: {get_response.status_code}")
else:
    print(f"❌ Failed to create job: {response.status_code}")
    print(response.text)