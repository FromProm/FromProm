import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { promptApi, userApi, creditApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { usePurchaseStore } from '../../store/purchaseStore';
import { useCartStore } from '../../store/cartStore';
import { promptTypeToCategory } from '../../services/dummyData';
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
  const [searchParams] = useSearchParams();
  const { userInfo, fetchUserInfo, updateUserInfo, isAuthenticated, logout } = useAuthStore();
  const { getPurchasedPrompts } = usePurchaseStore();
  const { items: cartItems, getTotalPrice: getCartTotalPrice } = useCartStore();
  
  // URL 쿼리 파라미터에서 탭 설정 (예: ?tab=selling)
  const getInitialTab = (): MenuTab => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'selling') return 'selling';
    if (tabParam === 'purchased') return 'purchased';
    if (tabParam === 'analytics') return 'analytics';
    if (tabParam === 'settings') return 'settings';
    return 'profile';
  };
  
  const [activeTab, setActiveTab] = useState<MenuTab>(getInitialTab());
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

  // 좋아요/북마크 개수 상태
  const [likedCount, setLikedCount] = useState(0);
  const [bookmarkedCount, setBookmarkedCount] = useState(0);

  // 회원탈퇴 모달 상태
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawPassword, setWithdrawPassword] = useState('');
  const [withdrawError, setWithdrawError] = useState('');

  // 검토 중 프롬프트 팝업 상태
  const [showReviewingModal, setShowReviewingModal] = useState(false);

  // 삭제 확인 모달 상태
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingPromptId, setDeletingPromptId] = useState<string | null>(null);
  const [deletingPromptTitle, setDeletingPromptTitle] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState(false);

  // 설정 관련 상태
  const [nickname, setNickname] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

  // 좋아요/북마크 개수 가져오기
  useEffect(() => {
    const fetchInteractionCounts = async () => {
      if (!userInfo?.sub) return;
      
      try {
        const [likesRes, bookmarksRes] = await Promise.all([
          promptApi.getUserLikedPrompts(userInfo.sub, 100),
          promptApi.getUserBookmarkedPrompts(userInfo.sub, 100)
        ]);
        
        if (likesRes.data.prompts) {
          setLikedCount(likesRes.data.prompts.length);
        }
        if (bookmarksRes.data.prompts) {
          setBookmarkedCount(bookmarksRes.data.prompts.length);
        }
      } catch (error) {
        console.error('Failed to fetch interaction counts:', error);
      }
    };
    
    fetchInteractionCounts();
  }, [userInfo?.sub]);

  // 크레딧 히스토리 가져오기
  useEffect(() => {
    if (activeTab === 'profile' || activeTab === 'analytics') {
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
    if (!withdrawPassword) {
      setWithdrawError('비밀번호를 입력해주세요.');
      return;
    }
    
    setIsSaving(true);
    setWithdrawError('');
    
    try {
      // 먼저 비밀번호 검증 (로그인 API 사용)
      await userApi.login({ email: userInfo?.email || '', password: withdrawPassword });
      
      // 비밀번호가 맞으면 탈퇴 진행
      await userApi.withdraw();
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('idToken');
      logout(); // auth store 상태 초기화
      alert('회원 탈퇴가 완료되었습니다.');
      navigate('/');
    } catch (error: any) {
      if (error.response?.status === 401 || error.response?.data?.message?.includes('password') || error.response?.data?.message?.includes('Incorrect')) {
        setWithdrawError('비밀번호가 일치하지 않습니다.');
      } else {
        setWithdrawError(error.response?.data?.message || '회원 탈퇴에 실패했습니다.');
      }
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

  // 프롬프트 삭제 핸들러
  const handleDeletePrompt = async () => {
    if (!deletingPromptId) return;
    
    setIsDeleting(true);
    try {
      await promptApi.deletePrompt(deletingPromptId);
      // 삭제 성공 시 목록에서 제거
      setMyPrompts(prev => prev.filter(p => p.promptId !== deletingPromptId));
      setMessage({ type: 'success', text: '프롬프트가 삭제되었습니다.' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || '프롬프트 삭제에 실패했습니다.' });
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
      setDeletingPromptId(null);
      setDeletingPromptTitle('');
    }
  };

  // 삭제 모달 열기
  const openDeleteModal = (e: React.MouseEvent, promptId: string, title: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDeletingPromptId(promptId);
    setDeletingPromptTitle(title);
    setShowDeleteModal(true);
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
    { id: 'profile' as MenuTab, label: '내 프로필' },
    { id: 'purchased' as MenuTab, label: '구매한 프롬프트' },
    { id: 'selling' as MenuTab, label: '판매 중인 프롬프트' },
    { id: 'analytics' as MenuTab, label: '판매 분석' },
    { id: 'settings' as MenuTab, label: '개인정보 설정' },
  ];

  const purchasedPrompts = getPurchasedPrompts();

  // 영어 크레딧 설명을 한국어로 변환
  const translateCreditDescription = (description: string): string => {
    if (!description) return description;
    
    // 일반적인 영어 패턴을 한국어로 변환 (판매 수익 / 구매 / 충전 으로 통일)
    let translated = description
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
      .replace(/^Prompt Sales$/i, '판매 수익')
      .replace(/^Prompt sales$/i, '판매 수익')
      .replace(/^Sale$/i, '판매 수익')
      .replace(/^Sales$/i, '판매 수익')
      .replace(/^프롬프트 판매$/i, '판매 수익')
      // 기타
      .replace(/^Refund:/i, '환불')
      .replace(/^Refund$/i, '환불')
      .replace(/^Bonus$/i, '보너스')
      .replace(/^Welcome bonus$/i, '가입 보너스')
      .replace(/^Sign up bonus$/i, '가입 보너스')
      .replace(/^Signup bonus$/i, '가입 보너스');
    
    return translated;
  };

  // 판매 프롬프트 수에 따른 배지 계산
  const getSellerBadge = (count: number) => {
    if (count >= 50) return { label: '프롬프트 마스터', color: 'from-purple-500 to-pink-500', icon: '👑' };
    if (count >= 30) return { label: '프롬프트 전문가', color: 'from-yellow-400 to-orange-500', icon: '⭐' };
    if (count >= 15) return { label: '프롬프트 크리에이터', color: 'from-blue-400 to-indigo-500', icon: '🎨' };
    if (count >= 5) return { label: '프롬프트 메이커', color: 'from-green-400 to-teal-500', icon: '🌱' };
    if (count >= 1) return { label: '프롬프트 입문자', color: 'from-gray-400 to-gray-500', icon: '🔰' };
    return { label: '초보 판매자', color: 'from-gray-300 to-gray-400', icon: '🌟' };
  };

  // 판매 통계 계산 (크레딧 히스토리에서 판매 수익 집계)
  const getSalesStats = () => {
    const salesHistory = creditHistory.filter(item => {
      const desc = item.user_description?.toLowerCase() || '';
      return desc.includes('sale') || desc.includes('판매');
    });
    
    const totalSales = salesHistory.length;
    const totalRevenue = salesHistory.reduce((sum, item) => sum + (item.amount || 0), 0);
    
    return { totalSales, totalRevenue };
  };

  const salesStats = getSalesStats();
  const sellerBadge = getSellerBadge(myPrompts.length);

  return (
    <div className="min-h-screen bg-white">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* 프로필 헤더 */}
        <AnimatedContent once distance={50} duration={0.6} delay={0}>
          <div className="bg-gradient-to-br from-blue-100 via-blue-50 to-white rounded-xl shadow-lg border border-blue-200 p-4 sm:p-8 mb-6 sm:mb-8">
            <div className="flex flex-col lg:flex-row items-center lg:items-start gap-4 sm:gap-6">
              {/* 프로필 아바타 - 닉네임 이니셜 */}
              <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full border-4 border-white shadow-xl flex-shrink-0 bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center">
                <span className="text-white text-2xl sm:text-4xl font-bold">
                  {(userInfo?.nickname || '사용자').charAt(0)}
                </span>
              </div>
              {/* 닉네임 & 자기소개 */}
              <div className="flex-1 text-center lg:text-left w-full">
                <div className="flex flex-col sm:flex-row items-center lg:items-start gap-2 sm:gap-3 mb-3">
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{userInfo?.nickname || '사용자'}</h1>
                  <span className={`inline-flex items-center gap-1 px-2 sm:px-3 py-1 rounded-full text-white text-xs sm:text-sm font-medium bg-gradient-to-r ${sellerBadge.color}`}>
                    <span>{sellerBadge.icon}</span>
                    {sellerBadge.label}
                  </span>
                </div>
                {isEditingBio ? (
                  <div>
                    <textarea value={editBio} onChange={(e) => setEditBio(e.target.value)}
                      placeholder="자기소개를 입력하세요..." maxLength={200} rows={3}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 resize-none text-sm sm:text-base"
                    />
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs sm:text-sm text-gray-500">{editBio.length}/200</span>
                      <div className="flex gap-2 sm:gap-3">
                        <button onClick={handleCancelEdit} className="px-3 sm:px-4 py-2 text-gray-600 hover:text-gray-800 font-medium text-sm">취소</button>
                        <button onClick={handleSaveBio} disabled={isSaving}
                          className="px-3 sm:px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 disabled:opacity-50 font-medium text-sm">
                          {isSaving ? '저장 중...' : '저장'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 items-center lg:items-start">
                    <p className="text-gray-600 leading-relaxed text-sm sm:text-base">{userInfo?.bio || '자기소개가 없습니다. 클릭하여 추가해보세요!'}</p>
                    <button onClick={() => setIsEditingBio(true)} className="px-3 py-1.5 text-sm text-blue-900 hover:text-white hover:bg-blue-900 rounded-lg transition-colors border border-blue-900">
                      수정
                    </button>
                  </div>
                )}
              </div>
              {/* 크레딧 & 장바구니 카드 */}
              <div className="flex flex-row gap-3 sm:gap-4 w-full lg:w-auto">
                {/* 크레딧 */}
                <Link to="/credit" className="flex-1 lg:flex-none bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 rounded-xl px-4 sm:px-6 py-4 sm:py-5 text-white lg:min-w-[180px] shadow-lg flex flex-col transition-all">
                  <p className="text-xs sm:text-sm opacity-80 mb-1">보유 크레딧</p>
                  <p className="text-xl sm:text-3xl font-bold mb-2 sm:mb-3">{(userInfo?.credit || 0).toLocaleString()}P</p>
                  <div className="mt-auto bg-white/20 text-white text-xs sm:text-sm font-medium px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-center">
                    충전하기
                  </div>
                </Link>
                {/* 장바구니 */}
                <Link to="/cart" className="flex-1 lg:flex-none bg-gradient-to-r from-orange-400 to-red-400 rounded-xl px-4 sm:px-6 py-4 sm:py-5 text-white hover:from-orange-500 hover:to-red-500 transition-all lg:min-w-[180px] shadow-lg flex flex-col">
                  <p className="text-xs sm:text-sm opacity-80 mb-1">장바구니</p>
                  <p className="text-xl sm:text-3xl font-bold mb-2 sm:mb-3">{cartItems.length}개</p>
                  <div className="mt-auto bg-white/20 text-white text-xs sm:text-sm font-medium px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-center">
                    {cartItems.length > 0 ? `${getCartTotalPrice().toLocaleString()}P` : '비어있음'}
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </AnimatedContent>

        {/* 메시지 표시 */}
        {message.text && (
          <div className={`mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg text-sm sm:text-base ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {message.text}
          </div>
        )}

        {/* 메인 컨텐츠 영역 */}
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
          {/* 좌측 메뉴 - 모바일에서는 가로 스크롤 */}
          <div className="lg:w-64 flex-shrink-0">
            <AnimatedContent once distance={50} duration={0.6} delay={0.1}>
              <div className="bg-gradient-to-br from-blue-100 via-blue-50 to-white rounded-xl shadow-lg border border-blue-200 p-2 sm:p-4">
                <div className="relative">
                  <nav className="flex lg:flex-col gap-1 sm:gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 scrollbar-hide">
                    {menuItems.map((item) => (
                      <button key={item.id} onClick={() => setActiveTab(item.id)}
                        className={`whitespace-nowrap px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-left transition-all text-sm sm:text-base ${
                          activeTab === item.id 
                            ? 'bg-white border-2 border-blue-900 text-gray-900 font-bold' 
                            : 'text-gray-700 hover:bg-white hover:shadow-sm font-medium'
                        }`}>
                        {item.label}
                      </button>
                    ))}
                  </nav>
                  {/* 모바일에서 오른쪽 스크롤 힌트 */}
                  <div className="absolute right-0 top-0 bottom-2 w-12 bg-gradient-to-l from-blue-100 via-blue-100/80 to-transparent pointer-events-none flex items-center justify-end pr-2 lg:hidden">
                    <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>
            </AnimatedContent>
          </div>

          {/* 우측 컨텐츠 */}
          <div className="flex-1">
            <AnimatedContent once distance={50} duration={0.6} delay={0.2}>
              <div className="bg-gradient-to-br from-blue-100 via-blue-50 to-white rounded-xl shadow-lg border border-blue-200 p-4 sm:p-8 min-h-[400px] sm:min-h-[500px]">
                {/* 내 프로필 탭 */}
                {activeTab === 'profile' && (
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6 sm:mb-8">내 프로필</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                      {/* 좋아요 누른 프롬프트 */}
                      <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-100 rounded-full flex items-center justify-center">
                            <span className="text-lg sm:text-xl">❤️</span>
                          </div>
                          <h3 className="font-semibold text-gray-900 text-sm sm:text-base">좋아요 누른 프롬프트</h3>
                        </div>
                        <div className="flex items-baseline justify-center gap-1.5 py-3 sm:py-4 mb-3 sm:mb-4">
                          <span className="text-4xl sm:text-5xl font-bold text-red-500">{likedCount}</span>
                          <span className="text-gray-500 self-end pb-1 text-sm sm:text-base">개의 프롬프트</span>
                        </div>
                        <button onClick={() => openModal('likes')} className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-medium py-2 sm:py-2.5 rounded-lg transition-colors text-sm sm:text-base">
                          모두 보기
                        </button>
                      </div>
                      {/* 댓글 남긴 프롬프트 */}
                      <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-lg sm:text-xl">💬</span>
                          </div>
                          <h3 className="font-semibold text-gray-900 text-sm sm:text-base">댓글 남긴 프롬프트</h3>
                        </div>
                        <div className="flex items-baseline justify-center gap-1.5 py-3 sm:py-4 mb-3 sm:mb-4">
                          <span className="text-4xl sm:text-5xl font-bold text-blue-500">0</span>
                          <span className="text-gray-500 self-end pb-1 text-sm sm:text-base">개의 프롬프트</span>
                        </div>
                        <button onClick={() => openModal('comments')} className="w-full bg-blue-50 hover:bg-blue-100 text-blue-600 font-medium py-2 sm:py-2.5 rounded-lg transition-colors text-sm sm:text-base">
                          모두 보기
                        </button>
                      </div>
                      {/* 북마크한 프롬프트 */}
                      <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                            <span className="text-lg sm:text-xl">🔖</span>
                          </div>
                          <h3 className="font-semibold text-gray-900 text-sm sm:text-base">북마크한 프롬프트</h3>
                        </div>
                        <div className="flex items-baseline justify-center gap-1.5 py-3 sm:py-4 mb-3 sm:mb-4">
                          <span className="text-4xl sm:text-5xl font-bold text-yellow-500">{bookmarkedCount}</span>
                          <span className="text-gray-500 self-end pb-1 text-sm sm:text-base">개의 프롬프트</span>
                        </div>
                        <button onClick={() => openModal('bookmarks')} className="w-full bg-yellow-50 hover:bg-yellow-100 text-yellow-600 font-medium py-2 sm:py-2.5 rounded-lg transition-colors text-sm sm:text-base">
                          모두 보기
                        </button>
                      </div>
                    </div>
                    {/* 크레딧 히스토리 */}
                    <div className="mt-6 sm:mt-8 bg-white rounded-xl p-4 sm:p-6 border border-gray-100 shadow-sm">
                      <div className="flex justify-between items-center mb-4 sm:mb-6">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900">📜 최근 크레딧 내역</h3>
                        <Link to="/dashboard/credit-history" className="text-blue-600 font-medium hover:underline text-sm sm:text-base">전체 보기 →</Link>
                      </div>
                      {isLoadingHistory ? (
                        <div className="text-center py-4"><div className="w-6 h-6 mx-auto border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>
                      ) : creditHistory.length > 0 ? (
                        <div className="space-y-2">
                          {creditHistory.slice(0, 3).map((item, idx) => {
                            const description = translateCreditDescription(item.user_description);
                            const isExpense = description?.includes('구매') || item.user_description?.includes('Purchase');
                            return (
                              <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                <span className="text-xs sm:text-sm text-gray-700 truncate mr-2">{description}</span>
                                <span className={`text-xs sm:text-sm font-medium whitespace-nowrap ${isExpense ? 'text-red-600' : 'text-green-600'}`}>
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
                    <div className="flex justify-between items-center mb-4 sm:mb-6">
                      <div>
                        <h2 className="text-lg sm:text-xl font-bold text-gray-900">구매한 프롬프트</h2>
                        <p className="text-xs sm:text-sm text-gray-500 mt-1">총 {purchasedPrompts.length}개의 프롬프트</p>
                      </div>
                      {purchasedPrompts.length > 0 && (
                        <Link 
                          to="/dashboard/purchased"
                          className="bg-blue-200 text-blue-900 font-medium px-3 py-1.5 rounded-md text-sm hover:bg-blue-900 hover:text-white transition-colors"
                        >
                          상세하게 보기 →
                        </Link>
                      )}
                    </div>
                    {purchasedPrompts.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        {purchasedPrompts.map((prompt) => (
                          <Link key={prompt.id} to={`/prompt/${prompt.id}`} 
                            className="bg-white rounded-xl p-4 sm:p-5 border border-gray-200 hover:shadow-lg hover:border-blue-200 transition-all group">
                            <div className="flex justify-between items-start mb-2 sm:mb-3">
                              <h3 className="font-semibold text-gray-900 group-hover:text-blue-900 transition-colors text-sm sm:text-base line-clamp-1 flex-1 mr-2">{prompt.title}</h3>
                              <span className="text-blue-900 font-bold text-base sm:text-lg whitespace-nowrap">{prompt.price}P</span>
                            </div>
                            <p className="text-gray-600 text-xs sm:text-sm mb-3 sm:mb-4 line-clamp-2">{prompt.description}</p>
                            <div className="flex justify-between items-center">
                              <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">{prompt.category}</span>
                              <span className="text-xs text-gray-500 truncate ml-2">by {prompt.sellerName}</span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-10 sm:py-16 bg-white rounded-xl border border-gray-100">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 bg-blue-50 rounded-full flex items-center justify-center">
                          <svg className="w-8 h-8 sm:w-10 sm:h-10 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                        </div>
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">아직 구매한 프롬프트가 없어요</h3>
                        <p className="text-gray-500 mb-4 sm:mb-6 text-sm sm:text-base px-4">마켓플레이스에서 다양한 프롬프트를 둘러보세요</p>
                        <Link to="/marketplace" className="inline-flex items-center px-4 sm:px-6 py-2.5 sm:py-3 bg-blue-900 text-white rounded-lg hover:bg-blue-800 font-medium transition-colors text-sm sm:text-base">
                          마켓플레이스 둘러보기
                        </Link>
                      </div>
                    )}
                  </div>
                )}

                {/* 판매 중인 프롬프트 탭 */}
                {activeTab === 'selling' && (
                  <div>
                    <div className="mb-4 sm:mb-6">
                      <h2 className="text-lg sm:text-xl font-bold text-gray-900">판매 중인 프롬프트</h2>
                      <p className="text-xs sm:text-sm text-gray-500 mt-1">총 {myPrompts.length}개의 프롬프트</p>
                    </div>
                    {isLoadingPrompts ? (
                      <div className="text-center py-12"><div className="w-8 h-8 mx-auto border-2 border-blue-900 border-t-transparent rounded-full animate-spin"></div></div>
                    ) : myPrompts.length > 0 ? (
                      <div className="space-y-3 sm:space-y-4">
                        {myPrompts.map((prompt) => (
                          prompt.status === 'completed' ? (
                            <Link key={prompt.promptId} to={`/prompt/${prompt.promptId}`}
                              className="block bg-white rounded-xl p-4 sm:p-5 border border-gray-200 hover:shadow-lg hover:border-blue-200 transition-all group">
                              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-0">
                                <div className="flex-1">
                                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-900 transition-colors text-sm sm:text-base">{prompt.title}</h3>
                                    <span className="text-xs px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full font-medium bg-green-100 text-green-700">
                                      검증 완료
                                    </span>
                                  </div>
                                  <p className="text-gray-600 text-xs sm:text-sm mb-3 sm:mb-4 line-clamp-2">{prompt.description}</p>
                                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500">
                                    <span className="bg-gray-100 px-2 py-0.5 rounded text-xs">{promptTypeToCategory[prompt.promptType] || prompt.promptType}</span>
                                    <span className="flex items-center gap-1">
                                      <span>❤️</span> {prompt.likeCount}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <span>💬</span> {prompt.commentCount}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <span>📌</span> {prompt.bookmarkCount}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex sm:flex-col justify-between sm:text-right sm:ml-4 items-center sm:items-end gap-2">
                                  <p className="text-lg sm:text-xl font-bold text-blue-900">{prompt.price}P</p>
                                  <p className="text-xs text-gray-400 sm:mt-1">{new Date(prompt.created_at).toLocaleDateString()}</p>
                                  <button
                                    onClick={(e) => openDeleteModal(e, prompt.promptId, prompt.title)}
                                    className="text-xs px-2 py-1 text-red-500 hover:text-white hover:bg-red-500 border border-red-300 rounded transition-colors"
                                  >
                                    삭제
                                  </button>
                                </div>
                              </div>
                            </Link>
                          ) : (
                            <div key={prompt.promptId} onClick={() => setShowReviewingModal(true)}
                              className="block bg-white rounded-xl p-4 sm:p-5 border border-gray-200 hover:shadow-lg hover:border-yellow-200 transition-all group cursor-pointer">
                              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-0">
                                <div className="flex-1">
                                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                                    <h3 className="font-semibold text-gray-900 text-sm sm:text-base">{prompt.title}</h3>
                                    <span className="text-xs px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full font-medium bg-yellow-100 text-yellow-700">
                                      검증 중
                                    </span>
                                  </div>
                                  <p className="text-gray-600 text-xs sm:text-sm mb-3 sm:mb-4 line-clamp-2">{prompt.description}</p>
                                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500">
                                    <span className="bg-gray-100 px-2 py-0.5 rounded text-xs">{promptTypeToCategory[prompt.promptType] || prompt.promptType}</span>
                                    <span className="flex items-center gap-1">
                                      <span>❤️</span> {prompt.likeCount}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <span>💬</span> {prompt.commentCount}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <span>📌</span> {prompt.bookmarkCount}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex sm:flex-col justify-between sm:text-right sm:ml-4 items-center sm:items-end gap-2">
                                  <p className="text-lg sm:text-xl font-bold text-blue-900">{prompt.price}P</p>
                                  <p className="text-xs text-gray-400 sm:mt-1">{new Date(prompt.created_at).toLocaleDateString()}</p>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openDeleteModal(e, prompt.promptId, prompt.title);
                                    }}
                                    className="text-xs px-2 py-1 text-red-500 hover:text-white hover:bg-red-500 border border-red-300 rounded transition-colors"
                                  >
                                    삭제
                                  </button>
                                </div>
                              </div>
                            </div>
                          )
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-10 sm:py-16 bg-white rounded-xl border border-gray-100">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 bg-blue-50 rounded-full flex items-center justify-center">
                          <svg className="w-8 h-8 sm:w-10 sm:h-10 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                        </div>
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">아직 등록한 프롬프트가 없어요</h3>
                        <p className="text-gray-500 mb-4 sm:mb-6 text-sm sm:text-base px-4">나만의 프롬프트를 등록하고 수익을 창출해보세요</p>
                        <Link to="/prompt/create" className="inline-flex items-center px-4 sm:px-6 py-2.5 sm:py-3 bg-blue-900 text-white rounded-lg hover:bg-blue-800 font-medium transition-colors text-sm sm:text-base">
                          프롬프트 등록하기
                        </Link>
                      </div>
                    )}
                  </div>
                )}

                {/* 판매 분석 탭 */}
                {activeTab === 'analytics' && (
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6">판매 분석</h2>
                    <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
                      <div className="bg-white rounded-lg p-3 sm:p-4 border border-gray-200 text-center">
                        <p className="text-gray-500 text-xs sm:text-sm">총 판매 수</p>
                        <p className="text-xl sm:text-2xl font-bold text-gray-900">{salesStats.totalSales}</p>
                      </div>
                      <div className="bg-white rounded-lg p-3 sm:p-4 border border-gray-200 text-center">
                        <p className="text-gray-500 text-xs sm:text-sm">총 수익</p>
                        <p className="text-xl sm:text-2xl font-bold text-green-600">{salesStats.totalRevenue.toLocaleString()}P</p>
                      </div>
                      <div className="bg-white rounded-lg p-3 sm:p-4 border border-gray-200 text-center">
                        <p className="text-gray-500 text-xs sm:text-sm">등록 프롬프트</p>
                        <p className="text-xl sm:text-2xl font-bold text-blue-600">{myPrompts.length}</p>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-4 sm:p-6 border border-gray-200 text-center">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                        <span className="text-xl sm:text-2xl">📊</span>
                      </div>
                      <p className="text-gray-500 text-sm sm:text-base">상세 분석 기능은 준비 중입니다</p>
                    </div>
                  </div>
                )}

                {/* 개인정보 설정 탭 */}
                {activeTab === 'settings' && (
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6">개인정보 설정</h2>
                    {/* 닉네임 변경 */}
                    <div className="bg-white rounded-lg p-3 sm:p-4 border border-gray-200 mb-3 sm:mb-4">
                      <h3 className="font-semibold text-gray-900 mb-3 sm:mb-4 text-sm sm:text-base">닉네임 변경</h3>
                      <form onSubmit={handleNicknameChange} className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                        <input type="text" value={nickname} onChange={(e) => setNickname(e.target.value)}
                          className="flex-1 border border-gray-300 rounded-lg px-3 sm:px-4 py-2 focus:outline-none focus:border-blue-900 text-sm sm:text-base" required />
                        <button type="submit" disabled={isSaving}
                          className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 disabled:opacity-50 text-sm sm:text-base whitespace-nowrap">
                          {isSaving ? '변경 중...' : '변경'}
                        </button>
                      </form>
                    </div>
                    {/* 비밀번호 변경 */}
                    <div className="bg-white rounded-lg p-3 sm:p-4 border border-gray-200 mb-3 sm:mb-4">
                      <h3 className="font-semibold text-gray-900 mb-3 sm:mb-4 text-sm sm:text-base">비밀번호 변경</h3>
                      <form onSubmit={handlePasswordChange} className="space-y-3">
                        {/* 현재 비밀번호 */}
                        <div className="relative">
                          <input 
                            type={showCurrentPassword ? "text" : "password"} 
                            placeholder="현재 비밀번호" 
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 sm:px-4 py-2 pr-10 focus:outline-none focus:border-blue-900 text-sm sm:text-base" 
                            required 
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                          >
                            {showCurrentPassword ? (
                              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            )}
                          </button>
                        </div>
                        
                        {/* 새 비밀번호 */}
                        <div>
                          <div className="relative">
                            <input 
                              type={showNewPassword ? "text" : "password"} 
                              placeholder="새 비밀번호" 
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              className="w-full border border-gray-300 rounded-lg px-3 sm:px-4 py-2 pr-10 focus:outline-none focus:border-blue-900 text-sm sm:text-base" 
                              required 
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                            >
                              {showNewPassword ? (
                                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                </svg>
                              ) : (
                                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              )}
                            </button>
                          </div>
                          <p className="mt-1 text-xs text-gray-500">8자 이상, 대문자를 포함한 영문/숫자/특수문자 포함</p>
                        </div>
                        
                        {/* 새 비밀번호 확인 */}
                        <div>
                          <div className="relative">
                            <input 
                              type={showConfirmPassword ? "text" : "password"} 
                              placeholder="새 비밀번호 확인" 
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              className={`w-full border rounded-lg px-3 sm:px-4 py-2 pr-10 focus:outline-none text-sm sm:text-base ${
                                confirmPassword && newPassword !== confirmPassword
                                  ? 'border-red-300 focus:border-red-500'
                                  : 'border-gray-300 focus:border-blue-900'
                              }`}
                              required 
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                            >
                              {showConfirmPassword ? (
                                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                </svg>
                              ) : (
                                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              )}
                            </button>
                          </div>
                          {confirmPassword && newPassword !== confirmPassword && (
                            <p className="mt-1 text-xs text-red-500">비밀번호가 일치하지 않습니다</p>
                          )}
                        </div>
                        
                        <button type="submit" disabled={isSaving}
                          className="w-full sm:w-auto px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 disabled:opacity-50 text-sm sm:text-base">
                          {isSaving ? '변경 중...' : '비밀번호 변경'}
                        </button>
                      </form>
                    </div>
                    {/* 회원 탈퇴 */}
                    <div className="bg-white rounded-lg p-3 sm:p-4 border border-red-200">
                      <h3 className="font-semibold text-red-600 mb-2 text-sm sm:text-base">회원 탈퇴</h3>
                      <p className="text-gray-600 text-xs sm:text-sm mb-3 sm:mb-4">회원 탈퇴 시 모든 데이터가 삭제되며, 되돌릴 수 없습니다.</p>
                      <button onClick={() => { setShowWithdrawModal(true); setWithdrawPassword(''); setWithdrawError(''); }} disabled={isSaving}
                        className="w-full sm:w-auto px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm sm:text-base">
                        회원 탈퇴
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[85vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between p-3 sm:p-4 border-b">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">{getModalTitle()}</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 p-1">
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {/* 모달 내용 */}
            <div className="p-3 sm:p-4 overflow-y-auto max-h-[65vh]">
              {isLoadingModal ? (
                <div className="text-center py-6 sm:py-8">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 mx-auto border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-gray-500 mt-2 text-sm sm:text-base">로딩 중...</p>
                </div>
              ) : modalData.length > 0 ? (
                <div className="space-y-2 sm:space-y-3">
                  {modalData.map((prompt) => (
                    <Link key={prompt.promptId} to={`/prompt/${prompt.promptId}`} onClick={closeModal}
                      className="block p-3 sm:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-900 text-sm sm:text-base truncate mr-2">{prompt.title}</span>
                        <span className="text-blue-600 font-medium text-sm sm:text-base whitespace-nowrap">{prompt.price}P</span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 sm:py-12">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <span className="text-xl sm:text-2xl">
                      {modalType === 'likes' ? '❤️' : modalType === 'comments' ? '💬' : '🔖'}
                    </span>
                  </div>
                  <p className="text-gray-500 text-sm sm:text-base">
                    {modalType === 'likes' && '좋아요 누른 프롬프트가 없습니다'}
                    {modalType === 'comments' && '댓글 남긴 프롬프트가 없습니다'}
                    {modalType === 'bookmarks' && '북마크한 프롬프트가 없습니다'}
                  </p>
                  <Link to="/marketplace" onClick={closeModal}
                    className="inline-block mt-3 sm:mt-4 text-blue-600 hover:underline text-sm sm:text-base">
                    마켓플레이스 둘러보기 →
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 회원탈퇴 모달 */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowWithdrawModal(false)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-red-600 mb-4">회원 탈퇴</h3>
            <p className="text-gray-600 text-sm mb-4">
              회원 탈퇴 시 모든 데이터가 삭제되며, 되돌릴 수 없습니다.<br/>
              계속하시려면 비밀번호를 입력해주세요.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">비밀번호 확인</label>
              <input
                type="password"
                value={withdrawPassword}
                onChange={(e) => setWithdrawPassword(e.target.value)}
                placeholder="현재 비밀번호를 입력하세요"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              {withdrawError && (
                <p className="mt-2 text-sm text-red-600">{withdrawError}</p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isSaving}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {isSaving ? '처리 중...' : '탈퇴하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 검토 중 프롬프트 모달 */}
      {showReviewingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowReviewingModal(false)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-yellow-100 rounded-full flex items-center justify-center">
                <span className="text-3xl">⏳</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">검토 중입니다</h3>
              <p className="text-gray-600 text-sm mb-6">
                AI가 프롬프트를 분석하고 있습니다.<br/>
                검토가 완료되면 등록하신 이메일로<br/>
                결과가 발송됩니다.
              </p>
              <button
                onClick={() => setShowReviewingModal(false)}
                className="px-6 py-2.5 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors font-medium"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 프롬프트 삭제 확인 모달 */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowDeleteModal(false)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-3xl">🗑️</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">프롬프트 삭제</h3>
              <p className="text-gray-600 text-sm mb-2">
                정말로 이 프롬프트를 삭제하시겠습니까?
              </p>
              <p className="text-gray-900 font-medium mb-4 px-4 py-2 bg-gray-100 rounded-lg">
                "{deletingPromptTitle}"
              </p>
              <p className="text-red-500 text-xs mb-6">
                삭제된 프롬프트는 복구할 수 없습니다.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  취소
                </button>
                <button
                  onClick={handleDeletePrompt}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors font-medium"
                >
                  {isDeleting ? '삭제 중...' : '삭제'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyprofilePage;
