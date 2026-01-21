"""
User Repository - FromProm Single Table에서 User 정보 조회
"""

import boto3
import logging
from typing import Optional
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)


class UserRepository:
    """
    Single Table Design에서 User 정보 조회

    테이블 구조:
    - PK: USER#<user_id>
    - SK: PROFILE
    - Attributes: email, name, bio, ...
    """

    def __init__(
        self,
        table_name: str = "FromProm_Table",
        region_name: str = "ap-northeast-2"  # 서울 리전
    ):
        self.table_name = table_name
        self.dynamodb = boto3.resource('dynamodb', region_name=region_name)
        self.table = self.dynamodb.Table(table_name)

    async def get_user_email(self, user_id: str) -> Optional[str]:
        """
        User ID로 이메일 조회

        Args:
            user_id: User UUID (예: b4c83d8c-e061-701a-276d-7b4480...)

        Returns:
            이메일 주소 또는 None
        """
        try:
            # PK/SK 구성
            pk = f"USER#{user_id}"
            sk = "PROFILE"

            logger.info(f"Querying user email: PK={pk}, SK={sk}")

            response = self.table.get_item(
                Key={
                    'PK': pk,
                    'SK': sk
                }
            )

            if 'Item' in response:
                item = response['Item']
                email = item.get('email')

                if email:
                    logger.info(f"User email found: {email}")
                    return email
                else:
                    logger.warning(f"User profile found but no email: {pk}")
                    return None
            else:
                logger.warning(f"User profile not found: {pk}")
                return None

        except ClientError as e:
            error_code = e.response['Error']['Code']
            logger.error(f"DynamoDB error ({error_code}): {str(e)}")
            return None
        except Exception as e:
            logger.error(f"Failed to get user email: {str(e)}")
            return None

    async def get_user_profile(self, user_id: str) -> Optional[dict]:
        """
        User ID로 전체 프로필 조회

        Args:
            user_id: User UUID

        Returns:
            User 프로필 데이터 또는 None
        """
        try:
            pk = f"USER#{user_id}"
            sk = "PROFILE"

            response = self.table.get_item(
                Key={
                    'PK': pk,
                    'SK': sk
                }
            )

            if 'Item' in response:
                return response['Item']
            return None

        except Exception as e:
            logger.error(f"Failed to get user profile: {str(e)}")
            return None
