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
        final_score: float,
        prompt_type: str,
        prompt_title: Optional[str] = None,
        prompt_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        평가 완료 이메일 발송

        Args:
            recipient_email: 수신자 이메일
            final_score: 최종 점수
            prompt_type: 프롬프트 타입
            prompt_title: 프롬프트 제목 (선택)
            prompt_id: 프롬프트 ID (선택) - 상세페이지 URL용

        Returns:
            발송 결과
        """
        try:
            # 제목 생성 (프롬프트 제목이 있으면 포함)
            if prompt_title:
                subject = f"[FromProm] 프롬프트 평가 완료 - {prompt_title}"
            else:
                subject = "[FromProm] 프롬프트 평가 완료"

            html_body = self._generate_html_body(
                final_score, prompt_type, prompt_id
            )

            text_body = self._generate_text_body(
                final_score, prompt_type, prompt_id
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
        final_score: float,
        prompt_type: str,
        prompt_id: Optional[str]
    ) -> str:
        """HTML 이메일 본문 생성"""

        # 점수에 따른 등급
        if final_score >= 90:
            grade = "Excellent"
            grade_ko = "최우수"
            grade_emoji = "🏆"
        elif final_score >= 70:
            grade = "Good"
            grade_ko = "우수"
            grade_emoji = "✨"
        elif final_score >= 50:
            grade = "Average"
            grade_ko = "보통"
            grade_emoji = "📊"
        else:
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
        <body style="margin: 0; padding: 0; font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; line-height: 1.6;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
                <tr>
                    <td align="center">
                        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">

                            <!-- Header with Logo -->
                            <tr>
                                <td style="padding: 32px 40px; border-bottom: 1px solid #f1f5f9;">
                                    <table width="100%" cellpadding="0" cellspacing="0">
                                        <tr>
                                            <td>
                                                <span style="font-size: 24px; font-weight: 700; color: #1e293b;">🤖 FromProm</span>
                                            </td>
                                            <td align="right">
                                                <span style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: 600;">✓ 검증 완료</span>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>

                            <!-- Title Section -->
                            <tr>
                                <td style="padding: 40px 40px 20px; text-align: center;">
                                    <h1 style="margin: 0; color: #1e293b; font-size: 28px; font-weight: 700;">프롬프트 평가 완료</h1>
                                    <p style="margin: 12px 0 0; color: #64748b; font-size: 16px;">AI가 프롬프트 품질을 분석했습니다</p>
                                </td>
                            </tr>

                            <!-- Score Section -->
                            <tr>
                                <td style="padding: 20px 40px;">
                                    <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 20px;">
                                        <tr>
                                            <td style="padding: 40px; text-align: center;">
                                                <p style="margin: 0 0 8px; color: rgba(255,255,255,0.8); font-size: 14px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">FINAL SCORE</p>
                                                <div style="margin: 16px 0;">
                                                    <span style="font-size: 72px; font-weight: 800; color: #ffffff; letter-spacing: -2px;">{final_score:.0f}</span>
                                                    <span style="font-size: 24px; color: rgba(255,255,255,0.7); font-weight: 500;">/100</span>
                                                </div>
                                                <div style="display: inline-block; background-color: rgba(255,255,255,0.2); color: white; padding: 10px 24px; border-radius: 50px; font-size: 15px; font-weight: 600; backdrop-filter: blur(10px);">
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
                                            <td style="padding: 16px 20px; background-color: #f9fafb; border-radius: 12px;">
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
                                    </table>
                                </td>
                            </tr>

                            <!-- CTA Buttons -->
                            <tr>
                                <td style="padding: 0 40px 20px; text-align: center;">
                                    <a href="https://fromprom.cloud/prompt/{prompt_id if prompt_id else ''}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 12px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px 0 rgba(99, 102, 241, 0.4);">
                                        상세 결과 확인하기 →
                                    </a>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 0 40px 40px; text-align: center;">
                                    <a href="https://fromprom.cloud" style="display: inline-block; background: #f3f4f6; color: #374151; text-decoration: none; padding: 14px 40px; border-radius: 12px; font-size: 14px; font-weight: 600; border: 1px solid #e5e7eb;">
                                        FromProm 메인으로 →
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
        final_score: float,
        prompt_type: str,
        prompt_id: Optional[str]
    ) -> str:
        """텍스트 이메일 본문 생성"""

        detail_url = f"https://fromprom.cloud/prompt/{prompt_id}" if prompt_id else ""

        text = f"""
FromProm - 프롬프트 평가 완료

안녕하세요,

요청하신 프롬프트 평가가 성공적으로 완료되었습니다.

━━━━━━━━━━━━━━━━━━━━━━
평가 결과
━━━━━━━━━━━━━━━━━━━━━━

✅ 최종 점수: {final_score:.1f} / 100점
🔖 프롬프트 타입: {prompt_type}

🔗 상세 결과 확인: {detail_url}
🔗 FromProm 메인: https://fromprom.cloud

━━━━━━━━━━━━━━━━━━━━━━

이 이메일은 자동으로 발송되었습니다.
FromProm - AI Prompt Evaluation Service
        """
        return text.strip()
