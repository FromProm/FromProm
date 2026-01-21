"""
AWS SES 이메일 발송 어댑터
"""

import logging
import boto3
from typing import Dict, Any, Optional
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)


class SESNotifier:
    """AWS SES를 사용한 이메일 발송"""

    def __init__(self, region_name: str = "ap-northeast-2"):  # 서울 리전
        self.region_name = region_name
        self.ses_client = boto3.client('ses', region_name=region_name)
        self.sender_email = "noreply@fromprom.cloud"  # SES에서 인증한 이메일 주소

    async def send_evaluation_complete_email(
        self,
        recipient_email: str,
        job_id: str,
        final_score: float,
        prompt_type: str,
        s3_result_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        평가 완료 이메일 발송

        Args:
            recipient_email: 수신자 이메일
            job_id: 작업 ID
            final_score: 최종 점수
            prompt_type: 프롬프트 타입
            s3_result_url: S3 결과 URL (선택)

        Returns:
            발송 결과
        """
        try:
            subject = f"[FromProm] 프롬프트 평가 완료 - Job ID: {job_id}"

            html_body = self._generate_html_body(
                job_id, final_score, prompt_type, s3_result_url
            )

            text_body = self._generate_text_body(
                job_id, final_score, prompt_type, s3_result_url
            )

            response = self.ses_client.send_email(
                Source=self.sender_email,
                Destination={
                    'ToAddresses': [recipient_email]
                },
                Message={
                    'Subject': {
                        'Data': subject,
                        'Charset': 'UTF-8'
                    },
                    'Body': {
                        'Text': {
                            'Data': text_body,
                            'Charset': 'UTF-8'
                        },
                        'Html': {
                            'Data': html_body,
                            'Charset': 'UTF-8'
                        }
                    }
                }
            )

            logger.info(f"Email sent successfully to {recipient_email} - MessageId: {response['MessageId']}")

            return {
                "success": True,
                "message_id": response['MessageId'],
                "recipient": recipient_email
            }

        except ClientError as e:
            error_code = e.response['Error']['Code']
            error_message = e.response['Error']['Message']
            logger.error(f"SES send failed: {error_code} - {error_message}")

            return {
                "success": False,
                "error": f"{error_code}: {error_message}"
            }
        except Exception as e:
            logger.error(f"Email send failed: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }

    def _generate_html_body(
        self,
        job_id: str,
        final_score: float,
        prompt_type: str,
        s3_result_url: Optional[str]
    ) -> str:
        """HTML 이메일 본문 생성"""

        score_color = "#22c55e" if final_score >= 70 else "#ef4444" if final_score < 50 else "#f59e0b"

        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }}
                .score-box {{ background: white; padding: 20px; margin: 20px 0; border-radius: 8px; text-align: center; border-left: 4px solid {score_color}; }}
                .score {{ font-size: 48px; font-weight: bold; color: {score_color}; }}
                .info-row {{ margin: 10px 0; padding: 10px; background: white; border-radius: 5px; }}
                .label {{ font-weight: bold; color: #6b7280; }}
                .button {{ display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }}
                .footer {{ text-align: center; margin-top: 30px; color: #9ca3af; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>✅ 프롬프트 평가 완료</h1>
                    <p>FromProm AI 서비스</p>
                </div>
                <div class="content">
                    <p>안녕하세요,</p>
                    <p>요청하신 프롬프트 평가가 성공적으로 완료되었습니다.</p>

                    <div class="score-box">
                        <div class="label">최종 점수</div>
                        <div class="score">{final_score:.1f}</div>
                        <div style="color: #6b7280;">/ 100점</div>
                    </div>

                    <div class="info-row">
                        <span class="label">작업 ID:</span> {job_id}
                    </div>
                    <div class="info-row">
                        <span class="label">프롬프트 타입:</span> {prompt_type}
                    </div>

                    {f'<a href="{s3_result_url}" class="button">상세 결과 보기</a>' if s3_result_url else ''}

                    <div class="footer">
                        <p>이 이메일은 자동으로 발송되었습니다.</p>
                        <p>FromProm - AI Prompt Evaluation Service</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        return html

    def _generate_text_body(
        self,
        job_id: str,
        final_score: float,
        prompt_type: str,
        s3_result_url: Optional[str]
    ) -> str:
        """텍스트 이메일 본문 생성"""

        text = f"""
FromProm - 프롬프트 평가 완료

안녕하세요,

요청하신 프롬프트 평가가 성공적으로 완료되었습니다.

━━━━━━━━━━━━━━━━━━━━━━
평가 결과
━━━━━━━━━━━━━━━━━━━━━━

✅ 최종 점수: {final_score:.1f} / 100점
📋 작업 ID: {job_id}
🔖 프롬프트 타입: {prompt_type}

{f'🔗 상세 결과: {s3_result_url}' if s3_result_url else ''}

━━━━━━━━━━━━━━━━━━━━━━

이 이메일은 자동으로 발송되었습니다.
FromProm - AI Prompt Evaluation Service
        """
        return text.strip()
