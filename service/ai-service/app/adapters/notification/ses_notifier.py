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
            subject = "[FromProm] 프롬프트 평가 완료"

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

        # 점수에 따른 색상 및 등급
        if final_score >= 90:
            score_color = "#10b981"
            grade = "Excellent"
            grade_ko = "최우수"
            grade_emoji = "🏆"
        elif final_score >= 70:
            score_color = "#22c55e"
            grade = "Good"
            grade_ko = "우수"
            grade_emoji = "✨"
        elif final_score >= 50:
            score_color = "#f59e0b"
            grade = "Average"
            grade_ko = "보통"
            grade_emoji = "📊"
        else:
            score_color = "#ef4444"
            grade = "Needs Improvement"
            grade_ko = "개선 필요"
            grade_emoji = "💡"

        # 프롬프트 타입 한글 변환
        prompt_type_labels = {
            "type_a": "Information (정보/사실 기반)",
            "type_b_text": "Creative Text (창작 글)",
            "type_b_image": "Creative Image (창작 이미지)"
        }
        prompt_type_label = prompt_type_labels.get(prompt_type, prompt_type)

        html = f"""
        <!DOCTYPE html>
        <html lang="ko">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>FromProm 평가 결과</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6; line-height: 1.6;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
                <tr>
                    <td align="center">
                        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">

                            <!-- Header -->
                            <tr>
                                <td style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%); padding: 48px 40px; text-align: center;">
                                    <table width="100%" cellpadding="0" cellspacing="0">
                                        <tr>
                                            <td align="center">
                                                <div style="width: 64px; height: 64px; background-color: rgba(255,255,255,0.2); border-radius: 16px; margin: 0 auto 20px; display: inline-block; line-height: 64px; font-size: 32px;">
                                                    📊
                                                </div>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td align="center">
                                                <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">프롬프트 평가 완료</h1>
                                                <p style="margin: 12px 0 0; color: rgba(255,255,255,0.85); font-size: 16px;">AI가 프롬프트 품질을 분석했습니다</p>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>

                            <!-- Score Section -->
                            <tr>
                                <td style="padding: 40px 40px 20px;">
                                    <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%); border-radius: 16px; border: 1px solid #e5e7eb;">
                                        <tr>
                                            <td style="padding: 32px; text-align: center;">
                                                <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Final Score</p>
                                                <div style="margin: 16px 0;">
                                                    <span style="font-size: 72px; font-weight: 800; color: {score_color}; letter-spacing: -2px;">{final_score:.0f}</span>
                                                    <span style="font-size: 24px; color: #9ca3af; font-weight: 500;">/100</span>
                                                </div>
                                                <div style="display: inline-block; background-color: {score_color}; color: white; padding: 8px 20px; border-radius: 50px; font-size: 14px; font-weight: 600;">
                                                    {grade_emoji} {grade_ko} ({grade})
                                                </div>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>

                            <!-- Details Section -->
                            <tr>
                                <td style="padding: 20px 40px 40px;">
                                    <table width="100%" cellpadding="0" cellspacing="0">
                                        <tr>
                                            <td style="padding: 16px 20px; background-color: #f9fafb; border-radius: 12px; margin-bottom: 12px;">
                                                <table width="100%" cellpadding="0" cellspacing="0">
                                                    <tr>
                                                        <td width="40" style="vertical-align: top;">
                                                            <div style="width: 36px; height: 36px; background-color: #ede9fe; border-radius: 8px; text-align: center; line-height: 36px; font-size: 18px;">🏷️</div>
                                                        </td>
                                                        <td style="padding-left: 16px; vertical-align: middle;">
                                                            <p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">프롬프트 타입</p>
                                                            <p style="margin: 4px 0 0; color: #111827; font-size: 15px; font-weight: 600;">{prompt_type_label}</p>
                                                        </td>
                                                    </tr>
                                                </table>
                                            </td>
                                        </tr>
                                        <tr><td style="height: 12px;"></td></tr>
                                        <tr>
                                            <td style="padding: 16px 20px; background-color: #f9fafb; border-radius: 12px;">
                                                <table width="100%" cellpadding="0" cellspacing="0">
                                                    <tr>
                                                        <td width="40" style="vertical-align: top;">
                                                            <div style="width: 36px; height: 36px; background-color: #dbeafe; border-radius: 8px; text-align: center; line-height: 36px; font-size: 18px;">🔑</div>
                                                        </td>
                                                        <td style="padding-left: 16px; vertical-align: middle;">
                                                            <p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">프롬프트 ID</p>
                                                            <p style="margin: 4px 0 0; color: #111827; font-size: 13px; font-weight: 500; font-family: 'SF Mono', Monaco, 'Courier New', monospace;">{job_id[:8]}...{job_id[-8:]}</p>
                                                        </td>
                                                    </tr>
                                                </table>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>

                            <!-- CTA Button -->
                            <tr>
                                <td style="padding: 0 40px 40px; text-align: center;">
                                    <a href="https://fromprom.cloud" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 12px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px 0 rgba(99, 102, 241, 0.4);">
                                        FromProm 바로가기 →
                                    </a>
                                </td>
                            </tr>

                            <!-- Footer -->
                            <tr>
                                <td style="background-color: #f9fafb; padding: 32px 40px; border-top: 1px solid #e5e7eb;">
                                    <table width="100%" cellpadding="0" cellspacing="0">
                                        <tr>
                                            <td align="center">
                                                <p style="margin: 0; color: #6b7280; font-size: 13px;">
                                                    <strong style="color: #374151;">FromProm</strong> - AI Prompt Evaluation Platform
                                                </p>
                                                <p style="margin: 12px 0 0; color: #9ca3af; font-size: 12px;">
                                                    이 이메일은 프롬프트 평가 요청에 의해 자동 발송되었습니다.
                                                </p>
                                                <p style="margin: 16px 0 0;">
                                                    <a href="https://fromprom.cloud" style="color: #6366f1; text-decoration: none; font-size: 12px; margin: 0 8px;">웹사이트</a>
                                                    <span style="color: #d1d5db;">|</span>
                                                    <a href="https://fromprom.cloud/support" style="color: #6366f1; text-decoration: none; font-size: 12px; margin: 0 8px;">고객지원</a>
                                                    <span style="color: #d1d5db;">|</span>
                                                    <a href="https://fromprom.cloud/settings/notifications" style="color: #6366f1; text-decoration: none; font-size: 12px; margin: 0 8px;">알림설정</a>
                                                </p>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>

                        </table>

                        <!-- Copyright -->
                        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px;">
                            <tr>
                                <td style="padding: 24px 40px; text-align: center;">
                                    <p style="margin: 0; color: #9ca3af; font-size: 11px;">
                                        © 2025 FromProm. All rights reserved.
                                    </p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
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
🔖 프롬프트 타입: {prompt_type}

🔗 FromProm 바로가기: https://fromprom.cloud

━━━━━━━━━━━━━━━━━━━━━━

이 이메일은 자동으로 발송되었습니다.
FromProm - AI Prompt Evaluation Service
        """
        return text.strip()
