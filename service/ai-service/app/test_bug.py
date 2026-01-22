# 테스트용 Bug 코드 (SonarQube 테스트)

def test_function():
    """SonarQube Bug 감지 테스트"""
    
    # Bug 1: 너무 광범위한 except
    try:
        data = {}
    except:  # Bug: bare except (SonarQube가 잡음)
        pass
    
    return None


def another_bug():
    """또 다른 Bug"""
    
    # Bug 2: 또 다른 bare except
    try:
        result = 10
    except:  # Bug
        result = 0
    
    return result


