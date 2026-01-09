import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePurchaseStore } from '../../store/purchaseStore';
import { useCartStore } from '../../store/cartStore';
import { userApi, promptApi } from '../../services/api';
import AnimatedContent from '../../components/AnimatedContent';

// 내 프롬프트 타입 정의
interface MyPrompt {
  promptId: string;
  title: string;
  description: string;
  price: number;
  promptType: string;
  model: string;
  status: string;
  likeCount: number;
  commentCount: number;
  bookmarkCount: number; 
  isPublic: boolean;
  created_at: string;
}

const MyprofilePage = () => {
  const navigate = useNavigate();
  const [nickname, setNickname] = useState<string>('');
  const [bio, setBio] = useState<string>('');
  const [credit, setCredit] = useState<number>(0);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [editBio, setEditBio] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [myPrompts, setMyPrompts] = useState<MyPrompt[]>([]);
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(true);
  
  const { getPurchasedPrompts } = usePurchaseStore();
  const { getItemCount } = useCartStore();

  // 로그인 체크
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      alert('로그인이 필요한 서비스입니다.');
      navigate('/auth/login');
    }
  }, [navigate]);

  // 사용자 정보 가져오기
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await userApi.getMe();
        setNickname(response.data.nickname || '사용자');
        setBio(response.data.bio || '');
        setCredit(response.data.credit || 0);
        setEditBio(response.data.bio || '');
      } catch (error) {
        console.error('Failed to fetch user info:', error);
        setNickname('사용자');
      }
    };
    fetchUserInfo();
  }, []);

  // 내 프롬프트 목록 가져오기
  useEffect(() => {
    const fetchMyPrompts = async () => {
      setIsLoadingPrompts(true);
      try {
        const response = await promptApi.getMyPrompts();
        if (response.data.success) {
          setMyPrompts(response.data.prompts || []);
        }
      } catch (error) {
        console.error('Failed to fetch my prompts:', error);
      } finally {
        setIsLoadingPrompts(false);
      }
    };
    fetchMyPrompts();
  }, []);

  // 자기소개 저장
  const handleSaveBio = async () => {
    setIsSaving(true);
    setMessage({ type: '', text: '' });
    try {
      await userApi.updateProfile({ bio: editBio });
      setBio(editBio);
      setIsEditingBio(false);
      setMessage({ type: 'success', text: '자기소개가 저장되었습니다.' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || '저장에 실패했습니다.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditBio(bio);
    setIsEditingBio(false);
  };
  
  const purchasedPrompts = getPurchasedPrompts();
  const cartItemCount = getItemCount();
  
  // 통계 데이터
  const stats = {
    totalPurchased: purchasedPrompts.length,
    totalSpent: purchasedPrompts.reduce((sum, prompt) => sum + prompt.price, 0),
    cartItems: cartItemCount,
    favoriteCategory: purchasedPrompts.length > 0 
      ? purchasedPrompts.reduce((acc, prompt) => {
          acc[prompt.category] = (acc[prompt.category] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      : {}
  };
  
  const mostUsedCategory = Object.keys(stats.favoriteCategory).length > 0
    ? Object.entries(stats.favoriteCategory).sort(([,a], [,b]) => b - a)[0][0]
    : '없음';

  return (
    <div className="min-h-screen bg-white">
      {/* 배경 그라데이션 효과 */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-900/5 via-transparent to-blue-900/5 pointer-events-none"></div>
      
      <div className="relative w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">내 프로필</h1>
        </div>

        {/* 메시지 표시 */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {message.text}
          </div>
        )}

        {/* 프로필 및 크레딧 카드 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* 자기소개 카드 */}
          <AnimatedContent once distance={50} duration={0.6} delay={0}>
          <div className="bg-gradient-to-br from-blue-100 via-blue-50 to-white rounded-lg shadow-lg border border-blue-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">자기소개</h3>
              {!isEditingBio && (
                <button
                  onClick={() => setIsEditingBio(true)}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  수정
                </button>
              )}
            </div>
            {isEditingBio ? (
              <div>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="자기소개를 입력하세요..."
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
                  rows={3}
                  maxLength={200}
                />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-500">{editBio.length}/200</span>
                  <div className="flex space-x-2">
                    <button
                      onClick={handleCancelEdit}
                      className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                    >
                      취소
                    </button>
                    <button
                      onClick={handleSaveBio}
                      disabled={isSaving}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isSaving ? '저장 중...' : '저장'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-600">
                {bio || '아직 자기소개가 없습니다. 수정 버튼을 눌러 자기소개를 작성해보세요!'}
              </p>
            )}
          </div>
          </AnimatedContent>

          {/* 크레딧 카드 */}
          <AnimatedContent once distance={50} duration={0.6} delay={0.1}>
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white shadow-lg shadow-blue-500/20">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium mb-1">보유 크레딧</h2>
                <p className="text-3xl font-bold">{credit.toLocaleString()}P</p>
              </div>
              <div className="flex space-x-2">
                <Link
                  to="/dashboard/credit-history"
                  className="bg-white/20 hover:bg-white/30 text-white font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  사용 내역
                </Link>
                <Link
                  to="/credit"
                  className="bg-white/20 hover:bg-white/30 text-white font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  충전하기
                </Link>
              </div>
            </div>
          </div>
          </AnimatedContent>
        </div>

        {/* 빠른 액션 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* 최근 구매한 프롬프트 */}
          <AnimatedContent once distance={50} duration={0.6} delay={0}>
          <div className="bg-gradient-to-br from-blue-100 via-blue-50 to-white rounded-lg shadow-lg border border-blue-100 p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-900/8 to-transparent rounded-full -translate-y-16 translate-x-16"></div>
            <div className="relative">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">최근 구매한 프롬프트</h3>
              {purchasedPrompts.length > 0 ? (
                <div className="space-y-3">
                  {purchasedPrompts.slice(0, 3).map((prompt) => (
                    <div key={prompt.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 text-sm truncate">{prompt.title}</h4>
                        <p className="text-xs text-gray-500">{prompt.category}</p>
                      </div>
                      <div className="text-sm font-medium text-blue-900">{prompt.price}P</div>
                    </div>
                  ))}
                  <Link
                    to="/dashboard/purchased"
                    className="block text-center text-blue-900 text-sm font-medium hover:underline mt-4"
                  >
                    모든 구매 내역 보기 →
                  </Link>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 text-sm mb-4">아직 구매한 프롬프트가 없습니다</p>
                  <Link
                    to="/marketplace"
                    className="inline-flex items-center px-4 py-2 bg-blue-900 text-white text-sm font-medium rounded-lg hover:bg-blue-800 transition-colors"
                  >
                    프롬프트 둘러보기
                  </Link>
                </div>
              )}
            </div>
          </div>
          </AnimatedContent>

          {/* 내 프롬프트 */}
          <AnimatedContent once distance={50} duration={0.6} delay={0.1}>
          <div className="bg-gradient-to-br from-blue-100 via-blue-50 to-white rounded-lg shadow-lg border border-blue-100 p-6 relative overflow-hidden">
            <div className="absolute bottom-0 left-0 w-28 h-28 bg-gradient-to-tr from-blue-900/6 to-transparent rounded-full translate-y-14 -translate-x-14"></div>
            <div className="relative">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">내 프롬프트</h3>
              {isLoadingPrompts ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 mx-auto border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-gray-500 text-sm mt-2">로딩 중...</p>
                </div>
              ) : myPrompts.length > 0 ? (
                <div className="space-y-3">
                  {myPrompts.slice(0, 3).map((prompt) => (
                    <Link
                      key={prompt.promptId}
                      to={`/prompt/${prompt.promptId}`}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-gray-900 text-sm truncate">{prompt.title}</h4>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            prompt.status === 'completed' ? 'bg-green-100 text-green-700' :
                            prompt.status === 'processing' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {prompt.status === 'completed' ? '완료' : prompt.status === 'processing' ? '처리중' : prompt.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                          <span>{prompt.promptType}</span>
                          <span>❤️ {prompt.likeCount}</span>
                          <span>💬 {prompt.commentCount}</span>
                        </div>
                      </div>
                      <div className="text-sm font-medium text-blue-900">{prompt.price}P</div>
                    </Link>
                  ))}
                  <Link
                    to="/dashboard/selling"
                    className="block text-center text-blue-900 text-sm font-medium hover:underline mt-4"
                  >
                    모든 내 프롬프트 보기 →
                  </Link>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <p className="text-gray-500 text-sm mb-4">아직 등록한 프롬프트가 없습니다</p>
                  <Link
                    to="/prompt/create"
                    className="inline-flex items-center px-4 py-2 bg-blue-900 text-white text-sm font-medium rounded-lg hover:bg-blue-800 transition-colors"
                  >
                    프롬프트 등록하기
                  </Link>
                </div>
              )}
            </div>
          </div>
          </AnimatedContent>
        </div>

        {/* 추가 메뉴 */}
        <AnimatedContent once distance={50} duration={0.6} delay={0}>
        <div className="bg-gradient-to-br from-blue-100 via-blue-50 to-white rounded-lg shadow-lg border border-blue-100 p-6 relative overflow-hidden">
          <div className="absolute top-0 left-1/2 w-40 h-40 bg-gradient-to-b from-blue-900/5 to-transparent rounded-full -translate-y-20 -translate-x-1/2"></div>
          <div className="relative">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">더 많은 기능</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Link
                to="/dashboard/analytics"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors group"
              >
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-4 group-hover:bg-purple-200 transition-colors">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">분석 및 통계</h4>
                  <p className="text-sm text-gray-500">상세한 사용 통계 및 분석</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
        </AnimatedContent>
      </div>
    </div>
  );
};

export default MyprofilePage;
