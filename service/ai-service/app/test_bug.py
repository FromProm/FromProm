# 테스트용 Bug 코드 (SonarQube 테스트)

def test_function():
    """SonarQube Bug 감지 테스트"""
    
    # Bug 1: 잘못된 비교 연산자
    x = 5
    if x = 10:  # = 대신 == (Syntax Error)
        print("Bug")
    
    return None


def another_bug():
    """또 다른 Bug"""
    
    # Bug 2: 너무 광범위한 except
    try:
        data = {}
    except:  # Bug: bare except
        pass
    
    return data


def type_bug() -> int:
    """타입 힌트 Bug"""
    # Bug 3: 타입 불일치
    return "string"  # int 반환해야 하는데 str 반환

