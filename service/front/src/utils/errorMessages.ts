// AWS Cognito 및 백엔드 에러 메시지를 사용자 친화적으로 변환

const errorMessageMap: Record<string, string> = {
  // Cognito 인증 관련 - 중복 이메일
  'UsernameExistsException': '이미 가입된 이메일입니다. 로그인을 시도해주세요.',
  'User already exists': '이미 가입된 이메일입니다. 로그인을 시도해주세요.',
  'An account with the given email already exists': '이미 가입된 이메일입니다. 로그인을 시도해주세요.',
  'email already exists': '이미 가입된 이메일입니다. 로그인을 시도해주세요.',
  'already exists': '이미 가입된 이메일입니다. 로그인을 시도해주세요.',
  'already registered': '이미 가입된 이메일입니다. 로그인을 시도해주세요.',
  'duplicate': '이미 가입된 이메일입니다. 로그인을 시도해주세요.',
  'user exists': '이미 가입된 이메일입니다. 로그인을 시도해주세요.',
  
  // Cognito 인증 관련 - 기타
  'NotAuthorizedException': '인증에 실패했습니다. 다시 로그인해주세요.',
  'UserNotFoundException': '사용자를 찾을 수 없습니다.',
  'InvalidPasswordException': '비밀번호 형식이 올바르지 않습니다.',
  'CodeMismatchException': '인증 코드가 일치하지 않습니다.',
  'ExpiredCodeException': '인증 코드가 만료되었습니다. 다시 요청해주세요.',
  'LimitExceededException': '요청 횟수가 초과되었습니다. 잠시 후 다시 시도해주세요.',
  'TooManyRequestsException': '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
  'InvalidParameterException': '입력 정보가 올바르지 않습니다.',
  'UserNotConfirmedException': '이메일 인증이 완료되지 않았습니다.',
  'PasswordResetRequiredException': '비밀번호 재설정이 필요합니다.',
  
  // 회원 탈퇴 관련
  'User deletion failed': '회원 탈퇴에 실패했습니다. 잠시 후 다시 시도해주세요.',
  'Cannot delete user': '회원 탈퇴를 처리할 수 없습니다. 고객센터에 문의해주세요.',
  
  // 구매 관련
  'Insufficient credits': '크레딧이 부족합니다. 충전 후 다시 시도해주세요.',
  'Insufficient balance': '잔액이 부족합니다. 충전 후 다시 시도해주세요.',
  'Already purchased': '이미 구매한 프롬프트입니다.',
  'Cannot purchase own prompt': '본인이 등록한 프롬프트는 구매할 수 없습니다.',
  'Prompt not found': '프롬프트를 찾을 수 없습니다.',
  'Seller not found': '판매자 정보를 찾을 수 없습니다.',
  'Transaction failed': '결제 처리에 실패했습니다. 잠시 후 다시 시도해주세요.',
  
  // 비밀번호 관련
  'Incorrect username or password': '이메일 또는 비밀번호가 올바르지 않습니다.',
  'Password did not conform with policy': '비밀번호는 8자 이상, 대소문자, 숫자, 특수문자를 포함해야 합니다.',
  'Attempt limit exceeded': '시도 횟수가 초과되었습니다. 잠시 후 다시 시도해주세요.',
  
  // 네트워크/서버 관련
  'Network Error': '네트워크 연결을 확인해주세요.',
  'Internal Server Error': '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
  'Service Unavailable': '서비스가 일시적으로 이용 불가합니다. 잠시 후 다시 시도해주세요.',
  'Request timeout': '요청 시간이 초과되었습니다. 다시 시도해주세요.',
};

export const getFriendlyErrorMessage = (error: any): string => {
  // error.response?.data?.message 형태의 메시지 추출
  const rawMessage = 
    error?.response?.data?.message || 
    error?.response?.data?.error ||
    error?.message || 
    error?.code ||
    (typeof error === 'string' ? error : '');

  // 정확히 매칭되는 메시지가 있으면 반환
  if (errorMessageMap[rawMessage]) {
    return errorMessageMap[rawMessage];
  }

  // 부분 매칭 검사
  for (const [key, value] of Object.entries(errorMessageMap)) {
    if (rawMessage.toLowerCase().includes(key.toLowerCase())) {
      return value;
    }
  }

  // AWS 에러 코드 패턴 검사 (예: "User: ... is not authorized")
  if (rawMessage.includes('not authorized') || rawMessage.includes('Access Denied')) {
    return '접근 권한이 없습니다. 다시 로그인해주세요.';
  }

  if (rawMessage.includes('expired') || rawMessage.includes('Expired')) {
    return '세션이 만료되었습니다. 다시 로그인해주세요.';
  }

  // HTTP 상태 코드 기반 메시지
  const status = error?.response?.status;
  const rawMessageLower = rawMessage.toLowerCase();
  
  // 회원가입 중복 이메일 체크 (더 넓은 범위)
  if (rawMessageLower.includes('exist') || rawMessageLower.includes('already') || rawMessageLower.includes('duplicate') || rawMessageLower.includes('registered')) {
    return '이미 가입된 이메일입니다. 로그인을 시도해주세요.';
  }
  
  if (status) {
    switch (status) {
      case 400:
        return '이미 가입된 이메일이거나 입력 정보가 올바르지 않습니다.';
      case 401:
        return '인증이 필요합니다. 다시 로그인해주세요.';
      case 403:
        return '접근 권한이 없습니다.';
      case 404:
        return '요청한 정보를 찾을 수 없습니다.';
      case 409:
        return '이미 처리된 요청입니다.';
      case 429:
        return '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.';
      case 500:
        return '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
      case 502:
      case 503:
      case 504:
        return '서비스가 일시적으로 이용 불가합니다. 잠시 후 다시 시도해주세요.';
    }
  }

  // 기본 메시지
  return '오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
};

export default getFriendlyErrorMessage;
