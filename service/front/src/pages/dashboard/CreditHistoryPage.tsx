import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { creditApi } from '../../services/api';
import AnimatedContent from '../../components/AnimatedContent';
import SplitText from '../../components/SplitText';

interface CreditHistoryItem {
  PK: string;
  SK: string;
  type: string;
  amount: number;
  balance: number;
  user_description: string;
  prompt_titles?: string[];
  created_at: string;
}

const CreditHistoryPage = () => {
  const [history, setHistory] = useState<CreditHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await creditApi.getCreditHistory();
        setHistory(response.data.history || []);
      } catch (error) {
        console.error('Failed to fetch credit history:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHistory();
  }, []);

  // 날짜 포맷팅 함수
  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const getTypeLabel = (description: string) => {
    if (description?.includes('Charge') || description?.includes('충전')) return '충전';
    if (description?.includes('Purchase') || description?.includes('구매')) return '구매';
    if (description?.includes('Sale') || description?.includes('판매')) return '판매 수익';
    return '기타';
  };

  const getTypeColor = (description: string) => {
    if (description?.includes('Charge') || description?.includes('충전')) return 'text-green-600 bg-green-100';
    if (description?.includes('Purchase') || description?.includes('구매')) return 'text-red-600 bg-red-100';
    if (description?.includes('Sale') || description?.includes('판매')) return 'text-blue-600 bg-blue-100';
    return 'text-gray-600 bg-gray-100';
  };

  const isExpense = (description: string) => {
    return description?.includes('Purchase') || description?.includes('구매');
  };

  // 영어 설명을 한국어로 변환 (판매 수익 / 구매 / 충전 으로 통일)
  const translateDescription = (description: string): string => {
    if (!description) return description;
    return description
      // 충전
      .replace(/^Credit charge$/i, '충전')
      .replace(/^Credit Charge$/i, '충전')
      .replace(/^Charge$/i, '충전')
      .replace(/^크레딧 충전$/i, '충전')
      // 구매
      .replace(/^Purchase:/i, '구매')
      .replace(/^Prompt purchase:/i, '구매')
      .replace(/^Prompt Purchase:/i, '구매')
      .replace(/^Prompt purchase$/i, '구매')
      .replace(/^Prompt Purchase$/i, '구매')
      .replace(/^Cart purchase$/i, '구매')
      .replace(/^Cart Purchase$/i, '구매')
      .replace(/^장바구니 구매$/i, '구매')
      .replace(/^프롬프트 구매$/i, '구매')
      .replace(/^프롬프트 구매:/i, '구매')
      // 판매 수익
      .replace(/^Prompt Sale$/i, '판매 수익')
      .replace(/^Prompt sale$/i, '판매 수익')
      .replace(/^프롬프트 판매$/i, '판매 수익')
      // 기타
      .replace(/^Refund:/i, '환불')
      .replace(/^Refund$/i, '환불')
      .replace(/^Bonus$/i, '보너스')
      .replace(/^Welcome bonus$/i, '가입 보너스')
      .replace(/^Sign up bonus$/i, '가입 보너스');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-600">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto">
          {/* 헤더 */}
          <div className="mb-8">
            <Link
              to="/dashboard"
              className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              내 프로필로 돌아가기
            </Link>
            <div>
              <SplitText
                text="크레딧 사용 내역"
                className="text-3xl font-bold text-gray-900 mb-2"
                delay={50}
                duration={0.6}
                ease="power3.out"
                splitType="chars"
                from={{ opacity: 0, y: 30 }}
                to={{ opacity: 1, y: 0 }}
                threshold={0.1}
                rootMargin="-50px"
                textAlign="left"
                tag="h1"
              />
            </div>
          </div>

          {/* 히스토리 목록 */}
          {history.length > 0 ? (
            <div className="space-y-4">
              {history.map((item, index) => (
                <AnimatedContent key={item.SK || index} once distance={50} duration={0.6} delay={index * 0.05}>
                  <div className="bg-gradient-to-br from-blue-100 via-blue-50 to-white rounded-lg border border-gray-200 p-4 shadow-sm hover:scale-[1.02] hover:shadow-md transition-all duration-200 cursor-pointer">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap flex-shrink-0 ${getTypeColor(item.user_description)}`}>
                          {getTypeLabel(item.user_description)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-900 break-words">{translateDescription(item.user_description)}</p>
                          {item.prompt_titles && item.prompt_titles.length > 0 && (
                            <p className="text-sm text-gray-600 mt-1 break-words">
                              {item.prompt_titles.join(', ')}
                            </p>
                          )}
                          <p className="text-sm text-gray-500 mt-1">{formatDate(item.created_at)}</p>
                        </div>
                      </div>
                      <div className="text-left sm:text-right flex-shrink-0 pl-[52px] sm:pl-0">
                        <p className={`text-lg font-bold ${isExpense(item.user_description) ? 'text-red-600' : 'text-green-600'}`}>
                          {isExpense(item.user_description) ? '' : '+'}{item.amount.toLocaleString()}P
                        </p>
                        <p className="text-sm text-gray-500">잔액: {item.balance.toLocaleString()}P</p>
                      </div>
                    </div>
                  </div>
                </AnimatedContent>
              ))}
            </div>
          ) : (
            <AnimatedContent once distance={50} duration={0.6} delay={0}>
              <div className="bg-gradient-to-br from-blue-100 via-blue-50 to-white rounded-lg border border-gray-200 p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">사용 내역이 없습니다</h3>
                <p className="text-gray-500 mb-6">크레딧을 충전하거나 프롬프트를 구매하면 여기에 표시됩니다.</p>
                <Link
                  to="/credit"
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  크레딧 충전하기
                </Link>
              </div>
            </AnimatedContent>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreditHistoryPage;
