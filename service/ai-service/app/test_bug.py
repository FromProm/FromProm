# 테스트용 Bug 코드 (SonarQube 테스트)

def test_function():
    """SonarQube Bug 감지 테스트"""
    
    # Bug 1: Division by zero
    result = 10 / 0
    
    # Bug 2: Unreachable code
    print("This will never execute")
    
    return result


def another_bug():
    """또 다른 Bug"""
    
    # Bug 3: Null pointer dereference
    data = None
    return data.get("key")  # AttributeError


# Bug 4: Infinite loop
def infinite_loop():
    while True:
        pass
