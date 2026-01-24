import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { promptApi, userApi, creditApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { usePurchaseStore } from '../../store/purchaseStore';
import { useCartStore } from '../../store/cartStore';
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

// 인터랙션 프롬프트 타입
interface InteractionPrompt {
  promptId: string;
  title: string;
  price: number;
  createdAt: string;
}

type MenuTab = 'profile' | 'purchased' | 'selling' | 'analytics' | 'settings';
type ModalType = 'likes' | 'comments' | 'bookmarks' | null;

const MyprofilePage = () => {
  const navigate = useNavigate();
  const { userInfo, fetchUserInfo, updateUserInfo, isAuthenticated } = useAuthStore();
  const { getPurchasedPrompts } = usePurchaseStore();
  const { items: cartItems, getTotalPrice: getCartTotalPrice } = useCartStore();
  const [activeTab, setActiveTab] = useState<MenuTab>('profile');
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [editBio, setEditBio] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [myPrompts, setMyPrompts] = useState<MyPrompt[]>([]);
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(true);
  const [creditHistory, setCreditHistory] = useState<CreditHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // 모달 관련 상태
  const [modalType, setModalType] = useState<ModalType>(null);
  const [modalData, setModalData] = useState<InteractionPrompt[]>([]);
  const [isLoadingModal, setIsLoadingModal] = useState(false);

  // 설정 관련 상태
  const [nickname, setNickname] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

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
    if (isAuthenticated) {
      fetchUserInfo();
    }
  }, [isAuthenticated, fetchUserInfo]);

  // editBio, nickname 초기값 설정
  useEffect(() => {
    if (userInfo?.bio !== undefined) setEditBio(userInfo.bio);
    if (userInfo?.nickname) setNickname(userInfo.nickname);
  }, [userInfo?.bio, userInfo?.nickname]);

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

  // 크레딧 히스토리 가져오기
  useEffect(() => {
    if (activeTab === 'profile') {
      const fetchHistory = async () => {
        setIsLoadingHistory(true);
        try {
          const response = await creditApi.getCreditHistory();
          setCreditHistory(response.data.history || []);
        } catch (error) {
          console.error('Failed to fetch credit history:', error);
        } finally {
          setIsLoadingHistory(false);
        }
      };
      fetchHistory();
    }
  }, [activeTab]);

  // 자기소개 저장
  const handleSaveBio = async () => {
    setIsSaving(true);
    setMessage({ type: '', text: '' });
    try {
      await userApi.updateProfile({ bio: editBio });
      updateUserInfo({ bio: editBio });
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
    setEditBio(userInfo?.bio || '');
    setIsEditingBio(false);
  };

  // 닉네임 변경
  const handleNicknameChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage({ type: '', text: '' });
    try {
      await userApi.updateProfile({ nickname });
      updateUserInfo({ nickname });
      setMessage({ type: 'success', text: '닉네임이 변경되었습니다.' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || '닉네임 변경에 실패했습니다.' });
    } finally {
      setIsSaving(false);
    }
  };

  // 비밀번호 변경
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage({ type: '', text: '' });
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: '새 비밀번호가 일치하지 않습니다.' });
      setIsSaving(false);
      return;
    }
    if (newPassword.length < 8) {
      setMessage({ type: 'error', text: '비밀번호는 8자 이상이어야 합니다.' });
      setIsSaving(false);
      return;
    }
    try {
      await userApi.changePassword({ oldPassword: currentPassword, newPassword });
      setMessage({ type: 'success', text: '비밀번호가 변경되었습니다.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || '비밀번호 변경에 실패했습니다.' });
    } finally {
      setIsSaving(false);
    }
  };

  // 회원 탈퇴
  const handleDeleteAccount = async () => {
    if (!window.confirm('정말로 회원 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;
    if (!window.confirm('모든 데이터가 삭제됩니다. 계속하시겠습니까?')) return;
    setIsSaving(true);
    try {
      await userApi.withdraw();
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('idToken');
      alert('회원 탈퇴가 완료되었습니다.');
      navigate('/');
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || '회원 탈퇴에 실패했습니다.' });
    } finally {
      setIsSaving(false);
    }
  };

  // 모달 열기
  const openModal = async (type: ModalType) => {
    setModalType(type);
    setIsLoadingModal(true);
    setModalData([]);
    
    // TODO: API 연동 시 실제 데이터 가져오기
    // 현재는 빈 배열로 표시
    setTimeout(() => {
      setModalData([]);
      setIsLoadingModal(false);
    }, 500);
  };

  // 모달 닫기
  const closeModal = () => {
    setModalType(null);
    setModalData([]);
  };

  // 모달 제목 가져오기
  const getModalTitle = () => {
    switch (modalType) {
      case 'likes': return '❤️ 좋아요 누른 프롬프트';
      case 'comments': return '💬 댓글 남긴 프롬프트';
      case 'bookmarks': return '🔖 북마크한 프롬프트';
      default: return '';
    }
  };

  const menuItems = [
    { id: 'profile' as MenuTab, label: '내 프로필', icon: '👤' },
    { id: 'purchased' as MenuTab, label: '구매한 프롬프트', icon: '📥' },
    { id: 'selling' as MenuTab, label: '판매 중인 프롬프트', icon: '📤' },
    { id: 'analytics' as MenuTab, label: '판매 분석', icon: '📊' },
    { id: 'settings' as MenuTab, label: '개인정보 설정', icon: '⚙️' },
  ];

  const purchasedPrompts = getPurchasedPrompts();

  return (
    <div className="min-h-screen bg-white">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* 프로필 헤더 */}
        <AnimatedContent once distance={50} duration={0.6} delay={0}>
          <div className="bg-gradient-to-br from-blue-100 via-blue-50 to-white rounded-lg shadow-lg border border-blue-100 p-6 mb-6">
            <div className="flex items-start gap-6">
              {/* 프로필 사진 */}
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg flex-shrink-0">
                <img src="/logo.png" alt="Profile" className="w-full h-full object-cover" 
                  onError={(e) => {
                    e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%234F46E5" width="100" height="100"/><text x="50" y="60" text-anchor="middle" fill="white" font-size="40">F</text></svg>';
                  }}
                />
              </div>
              {/* 닉네임 & 자기소개 */}
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{userInfo?.nickname || '사용자'}</h1>
                {isEditingBio ? (
                  <div>
                    <textarea value={editBio} onChange={(e) => setEditBio(e.target.value)}
                      placeholder="자기소개를 입력하세요..." maxLength={200} rows={2}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-blue-500 resize-none"
                    />
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-500">{editBio.length}/200</span>
                      <div className="flex gap-2">
                        <button onClick={handleCancelEdit} className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800">취소</button>
                        <button onClick={handleSaveBio} disabled={isSaving}
                          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
                          {isSaving ? '저장 중...' : '저장'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <p className="text-gray-600 text-sm">{userInfo?.bio || '자기소개가 없습니다.'}</p>
                    <button onClick={() => setIsEditingBio(true)} className="text-blue-600 hover:text-blue-700 text-xs">수정</button>
                  </div>
                )}
              </div>
              {/* 크레딧 */}
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg px-6 py-4 text-white min-w-[160px] h-[88px] flex flex-col justify-between">
                <p className="text-sm opacity-80">보유 크레딧</p>
                <p className="text-2xl font-bold">{(userInfo?.credit || 0).toLocaleString()}P</p>
                <Link to="/credit" className="text-xs underline opacity-80 hover:opacity-100">충전하러가기 →</Link>
              </div>
              {/* 장바구니 */}
              <Link to="/cart" className="bg-gradient-to-r from-orange-500 to-red-500 rounded-lg px-6 py-4 text-white hover:from-orange-600 hover:to-red-600 transition-all min-w-[160px] h-[88px] flex flex-col justify-between">
                <p className="text-sm opacity-80">장바구니</p>
                <p className="text-2xl font-bold">{cartItems.length}개</p>
                <p className="text-xs opacity-80">{cartItems.length > 0 ? `${getCartTotalPrice().toLocaleString()}P` : '비어있음'}</p>
              </Link>
            </div>
          </div>
        </AnimatedContent>

        {/* 메시지 표시 */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {message.text}
          </div>
        )}

        {/* 메인 컨텐츠 영역 */}
        <div className="flex gap-6">
          {/* 좌측 메뉴 */}
          <div className="w-64 flex-shrink-0">
            <AnimatedContent once distance={50} duration={0.6} delay={0.1}>
              <div className="bg-gradient-to-br from-blue-100 via-blue-50 to-white rounded-lg shadow-lg border border-blue-100 p-4">
                <nav className="space-y-1">
                  {menuItems.map((item) => (
                    <button key={item.id} onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                        activeTab === item.id ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-blue-50'
                      }`}>
                      <span>{item.icon}</span>
                      <span className="font-medium">{item.label}</span>
                    </button>
                  ))}
                </nav>
              </div>
            </AnimatedContent>
          </div>

          {/* 우측 컨텐츠 */}
          <div className="flex-1">
            <AnimatedContent once distance={50} duration={0.6} delay={0.2}>
              <div className="bg-gradient-to-br from-blue-100 via-blue-50 to-white rounded-lg shadow-lg border border-blue-100 p-6 min-h-[500px]">
                {/* 내 프로필 탭 */}
                {activeTab === 'profile' && (
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-6">내 프로필</h2>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      {/* 좋아요 누른 프롬프트 */}
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center gap-2 mb-4">
                          <span className="text-lg">❤️</span>
                          <h3 className="font-semibold text-gray-900">좋아요 누른 프롬프트</h3>
                        </div>
                        <div className="text-center py-6">
                          <p className="text-2xl font-bold text-red-500 mb-1">0</p>
                          <p className="text-gray-500 text-sm">개의 프롬프트</p>
                        </div>
                        <button onClick={() => openModal('likes')} className="w-full text-blue-600 text-sm hover:underline">모두 보기 →</button>
                      </div>
                      {/* 댓글 남긴 프롬프트 */}
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center gap-2 mb-4">
                          <span className="text-lg">💬</span>
                          <h3 className="font-semibold text-gray-900">댓글 남긴 프롬프트</h3>
                        </div>
                        <div className="text-center py-6">
                          <p className="text-2xl font-bold text-blue-500 mb-1">0</p>
                          <p className="text-gray-500 text-sm">개의 프롬프트</p>
                        </div>
                        <button onClick={() => openModal('comments')} className="w-full text-blue-600 text-sm hover:underline">모두 보기 →</button>
                      </div>
                      {/* 북마크한 프롬프트 */}
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center gap-2 mb-4">
                          <span className="text-lg">🔖</span>
                          <h3 className="font-semibold text-gray-900">북마크한 프롬프트</h3>
                        </div>
                        <div className="text-center py-6">
                          <p className="text-2xl font-bold text-yellow-500 mb-1">0</p>
                          <p className="text-gray-500 text-sm">개의 프롬프트</p>
                        </div>
                        <button onClick={() => openModal('bookmarks')} className="w-full text-blue-600 text-sm hover:underline">모두 보기 →</button>
                      </div>
                    </div>
                    {/* 크레딧 히스토리 */}
                    <div className="mt-6 bg-white rounded-lg p-4 border border-gray-200">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold text-gray-900">최근 크레딧 내역</h3>
                        <Link to="/dashboard/credit-history" className="text-blue-600 text-sm hover:underline">전체 보기</Link>
                      </div>
                      {isLoadingHistory ? (
                        <div className="text-center py-4"><div className="w-6 h-6 mx-auto border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>
                      ) : creditHistory.length > 0 ? (
                        <div className="space-y-2">
                          {creditHistory.slice(0, 3).map((item, idx) => {
                            const isExpense = item.user_description?.includes('구매') || item.user_description?.includes('Purchase');
                            return (
                              <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                <span className="text-sm text-gray-700">{item.user_description}</span>
                                <span className={`text-sm font-medium ${isExpense ? 'text-red-600' : 'text-green-600'}`}>
                                  {isExpense ? '' : '+'}{item.amount.toLocaleString()}P
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm text-center py-4">크레딧 내역이 없습니다</p>
                      )}
                    </div>
                  </div>
                )}

                {/* 구매한 프롬프트 탭 */}
                {activeTab === 'purchased' && (
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-6">구매한 프롬프트</h2>
                    {purchasedPrompts.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {purchasedPrompts.map((prompt) => (
                          <div key={prompt.id} className="bg-white rounded-lg p-4 border border-gray-200">
                            <div className="flex justify-between items-start mb-2">
                              <h3 className="font-medium text-gray-900">{prompt.title}</h3>
                              <span className="text-blue-600 font-medium">{prompt.price}P</span>
                            </div>
                            <p className="text-gray-600 text-sm mb-3 line-clamp-2">{prompt.description}</p>
                            <div className="flex justify-between items-center text-xs text-gray-500">
                              <span>{prompt.category}</span>
                              <span>by {prompt.sellerName}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                          <span className="text-2xl">📥</span>
                        </div>
                        <p className="text-gray-500 mb-4">구매한 프롬프트가 없습니다</p>
                        <Link to="/marketplace" className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                          마켓플레이스 둘러보기
                        </Link>
                      </div>
                    )}
                  </div>
                )}

                {/* 판매 중인 프롬프트 탭 */}
                {activeTab === 'selling' && (
                  <div>
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-bold text-gray-900">판매 중인 프롬프트</h2>
                      <Link to="/prompt/create" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                        + 새 프롬프트 등록
                      </Link>
                    </div>
                    {isLoadingPrompts ? (
                      <div className="text-center py-12"><div className="w-8 h-8 mx-auto border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>
                    ) : myPrompts.length > 0 ? (
                      <div className="space-y-4">
                        {myPrompts.map((prompt) => (
                          <Link key={prompt.promptId} to={`/prompt/${prompt.promptId}`}
                            className="block bg-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h3 className="font-medium text-gray-900">{prompt.title}</h3>
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                                    prompt.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                  }`}>
                                    {prompt.status === 'completed' ? '완료' : '처리중'}
                                  </span>
                                </div>
                                <p className="text-gray-600 text-sm mb-2 line-clamp-1">{prompt.description}</p>
                                <div className="flex items-center gap-4 text-xs text-gray-500">
                                  <span>{prompt.promptType}</span>
                                  <span>❤️ {prompt.likeCount}</span>
                                  <span>💬 {prompt.commentCount}</span>
                                  <span>🔖 {prompt.bookmarkCount}</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-bold text-blue-600">{prompt.price}P</p>
                                <p className="text-xs text-gray-500">{new Date(prompt.created_at).toLocaleDateString()}</p>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                          <span className="text-2xl">📤</span>
                        </div>
                        <p className="text-gray-500 mb-4">등록한 프롬프트가 없습니다</p>
                        <Link to="/prompt/create" className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                          프롬프트 등록하기
                        </Link>
                      </div>
                    )}
                  </div>
                )}

                {/* 판매 분석 탭 */}
                {activeTab === 'analytics' && (
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-6">판매 분석</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
                        <p className="text-gray-500 text-sm">총 판매 수</p>
                        <p className="text-2xl font-bold text-gray-900">0</p>
                      </div>
                      <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
                        <p className="text-gray-500 text-sm">총 수익</p>
                        <p className="text-2xl font-bold text-green-600">0P</p>
                      </div>
                      <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
                        <p className="text-gray-500 text-sm">등록 프롬프트</p>
                        <p className="text-2xl font-bold text-blue-600">{myPrompts.length}</p>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-6 border border-gray-200 text-center">
                      <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                        <span className="text-2xl">📊</span>
                      </div>
                      <p className="text-gray-500">상세 분석 기능은 준비 중입니다</p>
                    </div>
                  </div>
                )}

                {/* 개인정보 설정 탭 */}
                {activeTab === 'settings' && (
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-6">개인정보 설정</h2>
                    {/* 닉네임 변경 */}
                    <div className="bg-white rounded-lg p-4 border border-gray-200 mb-4">
                      <h3 className="font-semibold text-gray-900 mb-4">닉네임 변경</h3>
                      <form onSubmit={handleNicknameChange} className="flex gap-3">
                        <input type="text" value={nickname} onChange={(e) => setNickname(e.target.value)}
                          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500" required />
                        <button type="submit" disabled={isSaving}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                          {isSaving ? '변경 중...' : '변경'}
                        </button>
                      </form>
                    </div>
                    {/* 비밀번호 변경 */}
                    <div className="bg-white rounded-lg p-4 border border-gray-200 mb-4">
                      <h3 className="font-semibold text-gray-900 mb-4">비밀번호 변경</h3>
                      <form onSubmit={handlePasswordChange} className="space-y-3">
                        <input type="password" placeholder="현재 비밀번호" value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500" required />
                        <input type="password" placeholder="새 비밀번호" value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500" required />
                        <input type="password" placeholder="새 비밀번호 확인" value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500" required />
                        <button type="submit" disabled={isSaving}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                          {isSaving ? '변경 중...' : '비밀번호 변경'}
                        </button>
                      </form>
                    </div>
                    {/* 회원 탈퇴 */}
                    <div className="bg-white rounded-lg p-4 border border-red-200">
                      <h3 className="font-semibold text-red-600 mb-2">회원 탈퇴</h3>
                      <p className="text-gray-600 text-sm mb-4">회원 탈퇴 시 모든 데이터가 삭제되며, 되돌릴 수 없습니다.</p>
                      <button onClick={handleDeleteAccount} disabled={isSaving}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
                        {isSaving ? '처리 중...' : '회원 탈퇴'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </AnimatedContent>
          </div>
        </div>
      </div>

      {/* 모달 */}
      {modalType && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={closeModal}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">{getModalTitle()}</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {/* 모달 내용 */}
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {isLoadingModal ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 mx-auto border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-gray-500 mt-2">로딩 중...</p>
                </div>
              ) : modalData.length > 0 ? (
                <div className="space-y-3">
                  {modalData.map((prompt) => (
                    <Link key={prompt.promptId} to={`/prompt/${prompt.promptId}`} onClick={closeModal}
                      className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-900">{prompt.title}</span>
                        <span className="text-blue-600 font-medium">{prompt.price}P</span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <span className="text-2xl">
                      {modalType === 'likes' ? '❤️' : modalType === 'comments' ? '💬' : '🔖'}
                    </span>
                  </div>
                  <p className="text-gray-500">
                    {modalType === 'likes' && '좋아요 누른 프롬프트가 없습니다'}
                    {modalType === 'comments' && '댓글 남긴 프롬프트가 없습니다'}
                    {modalType === 'bookmarks' && '북마크한 프롬프트가 없습니다'}
                  </p>
                  <Link to="/marketplace" onClick={closeModal}
                    className="inline-block mt-4 text-blue-600 hover:underline">
                    마켓플레이스 둘러보기 →
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyprofilePage;
