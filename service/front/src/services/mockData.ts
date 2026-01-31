// Mock 데이터 - 로컬 개발용 (VITE_USE_MOCK=true 일 때 사용)

// Mock 사용자
export const mockUser = {
  id: 'mock-user-001',
  sub: 'mock-user-001',
  email: 'youna2510@naver.com',
  nickname: 'Youna',
  bio: '프롬프트 엔지니어링에 관심이 많습니다.',
  credit: 10000,
  password: '@Youna5214', // 로컬 테스트용
};

// Mock 프롬프트 데이터
export const mockPrompts = [
  // 사실/정보/근거 요구 (type_a)
  {
    promptId: 'mock-prompt-001',
    title: '논문 요약 및 핵심 인사이트 추출',
    description: '학술 논문을 입력하면 핵심 내용을 구조화하여 요약하고, 주요 인사이트와 한계점을 분석해줍니다.',
    content: '다음 논문을 분석해주세요:\n\n{{paper_content}}\n\n1. 연구 목적 및 배경\n2. 연구 방법론\n3. 주요 발견사항\n4. 한계점 및 향후 연구 방향\n5. 실무 적용 가능성',
    category: 'type_a',
    model: 'anthropic.claude-sonnet-4-5-20250514-v1:0',
    nickname: 'ResearchBot',
    userId: 'seller-001',
    status: 'ACTIVE',
    price: 500,
    createdAt: '2025-01-15T10:00:00Z',
    updatedAt: '2025-01-15T10:00:00Z',
    likeCount: 42,
    bookmarkCount: 18,
    commentCount: 7,
    isLiked: false,
    isBookmarked: false,
    evaluationMetrics: {
      finalScore: 71.7,
      relevance: 75.0,
      consistency: 60.5,
      hallucination: 68.2,
      informationDensity: 73.0,
      modelVariance: 81.8,
      tokenUsage: 653,
    },
  },
  {
    promptId: 'mock-prompt-002',
    title: '법률 문서 분석 및 리스크 검토',
    description: '계약서나 법률 문서를 분석하여 잠재적 리스크와 주의사항을 식별합니다.',
    content: '다음 법률 문서를 검토해주세요:\n\n{{document}}\n\n분석 항목:\n1. 주요 조항 요약\n2. 잠재적 리스크 식별\n3. 불명확한 조항\n4. 권장 수정사항',
    category: 'type_a',
    model: 'anthropic.claude-3-5-sonnet-20240620-v1:0',
    nickname: 'LegalAI',
    userId: 'seller-002',
    status: 'ACTIVE',
    price: 800,
    createdAt: '2025-01-14T09:00:00Z',
    updatedAt: '2025-01-14T09:00:00Z',
    likeCount: 35,
    bookmarkCount: 22,
    commentCount: 5,
    isLiked: false,
    isBookmarked: false,
    evaluationMetrics: {
      finalScore: 74.8,
      relevance: 78.2,
      consistency: 72.8,
      hallucination: 70.9,
      informationDensity: 75.5,
      modelVariance: 73.6,
      tokenUsage: 920,
    },
  },
  // 글 창작 및 생성 (type_b_text)
  {
    promptId: 'mock-prompt-003',
    title: '블로그 포스트 자동 생성기',
    description: '주제와 키워드만 입력하면 SEO 최적화된 블로그 포스트를 작성해줍니다.',
    content: '주제: {{topic}}\n키워드: {{keywords}}\n톤앤매너: {{tone}}\n\n위 정보를 바탕으로 다음 구조의 블로그 포스트를 작성해주세요:\n1. 눈길을 끄는 제목\n2. 서론 (문제 제기)\n3. 본론 (3-4개 섹션)\n4. 결론 (CTA 포함)\n5. 메타 설명',
    category: 'type_b_text',
    model: 'anthropic.claude-3-haiku-20240307-v1:0',
    nickname: 'ContentMaster',
    userId: 'seller-003',
    status: 'ACTIVE',
    price: 300,
    createdAt: '2025-01-13T14:00:00Z',
    updatedAt: '2025-01-13T14:00:00Z',
    likeCount: 89,
    bookmarkCount: 45,
    commentCount: 12,
    isLiked: false,
    isBookmarked: false,
    evaluationMetrics: {
      finalScore: 68.2,
      relevance: 71.5,
      consistency: 65.0,
      hallucination: 62.5,
      informationDensity: 69.8,
      modelVariance: 70.0,
      tokenUsage: 650,
    },
  },
  {
    promptId: 'mock-prompt-004',
    title: '소설 캐릭터 대화 생성기',
    description: '캐릭터 설정을 입력하면 자연스러운 대화 장면을 생성합니다. 웹소설, 시나리오 작성에 활용 가능.',
    content: '캐릭터 A: {{character_a}}\n캐릭터 B: {{character_b}}\n상황: {{situation}}\n분위기: {{mood}}\n\n위 설정으로 두 캐릭터 간의 자연스러운 대화를 작성해주세요.',
    category: 'type_b_text',
    model: 'anthropic.claude-sonnet-4-5-20250514-v1:0',
    nickname: 'StoryWeaver',
    userId: 'seller-004',
    status: 'ACTIVE',
    price: 400,
    createdAt: '2025-01-12T11:00:00Z',
    updatedAt: '2025-01-12T11:00:00Z',
    likeCount: 67,
    bookmarkCount: 31,
    commentCount: 9,
    isLiked: false,
    isBookmarked: false,
    evaluationMetrics: {
      finalScore: 71.7,
      relevance: 74.8,
      consistency: 69.0,
      hallucination: 67.0,
      informationDensity: 72.2,
      modelVariance: 70.7,
      tokenUsage: 780,
    },
  },
  // 이미지 창작 및 생성 (type_b_image)
  {
    promptId: 'mock-prompt-005',
    title: '제품 목업 이미지 생성',
    description: '제품 설명을 입력하면 전문적인 제품 목업 이미지를 생성합니다. 마케팅, 프레젠테이션용.',
    content: '제품명: {{product_name}}\n제품 설명: {{description}}\n배경: {{background}}\n스타일: {{style}}\n\n위 정보로 고품질 제품 목업 이미지를 생성해주세요.',
    category: 'type_b_image',
    model: 'amazon.nova-canvas-v1:0',
    nickname: 'DesignPro',
    userId: 'seller-005',
    status: 'ACTIVE',
    price: 600,
    createdAt: '2025-01-11T16:00:00Z',
    updatedAt: '2025-01-11T16:00:00Z',
    likeCount: 54,
    bookmarkCount: 28,
    commentCount: 6,
    isLiked: false,
    isBookmarked: false,
    evaluationMetrics: {
      finalScore: 69.4,
      relevance: 72.6,
      consistency: 68.3,
      hallucination: 65.3,
      informationDensity: 70.0,
      modelVariance: 69.9,
      tokenUsage: 450,
    },
  },
  {
    promptId: 'mock-prompt-006',
    title: '일러스트 캐릭터 생성기',
    description: '캐릭터 특징을 입력하면 다양한 스타일의 일러스트 캐릭터를 생성합니다.',
    content: '캐릭터 특징: {{features}}\n스타일: {{art_style}}\n포즈: {{pose}}\n배경: {{background}}\n\n위 설정으로 일러스트 캐릭터를 생성해주세요.',
    category: 'type_b_image',
    model: 'amazon.titan-image-generator-v2:0',
    nickname: 'ArtistAI',
    userId: 'seller-006',
    status: 'ACTIVE',
    price: 550,
    createdAt: '2025-01-10T13:00:00Z',
    updatedAt: '2025-01-10T13:00:00Z',
    likeCount: 78,
    bookmarkCount: 39,
    commentCount: 11,
    isLiked: false,
    isBookmarked: false,
    evaluationMetrics: {
      finalScore: 70.6,
      relevance: 73.7,
      consistency: 69.5,
      hallucination: 66.1,
      informationDensity: 71.3,
      modelVariance: 70.8,
      tokenUsage: 420,
    },
  },
  {
    promptId: 'mock-prompt-007',
    title: 'AWS Cloud School 팀 사진 생성기',
    description: 'AWS Cloud School 부트캠프 팀의 기념 사진을 생성합니다. 등수, 팀원 수, 표정, 배경 등을 커스터마이징할 수 있습니다.',
    content: 'AWS Cloud School 부트캠프에서 {{몇 등}}을 하고 좋아하는 팀 사진을 그려주세요. 팀 전체 인원은 {{몇 명}}이며, 남자 팀원이 {{몇 명}}, 여자 팀원은 {{몇 명}}입니다. {{표정}}으로 얼굴을 묘사해주세요. 배경은 {{색상}} 책상이 있는 교실 느낌으로 해주세요.',
    category: 'type_b_image',
    model: 'amazon.nova-canvas-v1:0',
    nickname: 'CloudArtist',
    userId: 'seller-007',
    status: 'ACTIVE',
    price: 700,
    createdAt: '2025-01-09T10:00:00Z',
    updatedAt: '2025-01-09T10:00:00Z',
    likeCount: 92,
    bookmarkCount: 48,
    commentCount: 15,
    isLiked: false,
    isBookmarked: false,
    evaluationMetrics: {
      finalScore: 73.2,
      relevance: 76.0,
      consistency: 71.5,
      hallucination: 69.8,
      informationDensity: 74.0,
      modelVariance: 72.5,
      tokenUsage: 380,
    },
  },
];

// Mock API 응답 헬퍼
export const isMockMode = () => import.meta.env.VITE_USE_MOCK === 'true';

// Mock 로그인 검증
export const mockLogin = (email: string, password: string) => {
  if (email === mockUser.email && password === mockUser.password) {
    return {
      success: true,
      accessToken: 'mock-access-token-' + Date.now(),
      refreshToken: 'mock-refresh-token-' + Date.now(),
      idToken: 'mock-id-token-' + Date.now(),
    };
  }
  return { success: false, message: '이메일 또는 비밀번호가 올바르지 않습니다.' };
};

// Mock 사용자 정보 조회
export const mockGetMe = () => ({
  nickname: mockUser.nickname,
  bio: mockUser.bio,
  credit: mockUser.credit,
  email: mockUser.email,
});

// Mock 프롬프트 목록 조회
export const mockGetAllPrompts = () => ({
  success: true,
  prompts: mockPrompts,
});

// Mock 프롬프트 상세 조회
export const mockGetPromptDetail = (promptId: string) => {
  const prompt = mockPrompts.find(p => p.promptId === promptId);
  if (!prompt) {
    return { success: false, message: '프롬프트를 찾을 수 없습니다.' };
  }
  
  // 이미지 타입인 경우 이미지 URL로 예시 출력
  const isImageType = prompt.category === 'type_b_image';
  
  // 프롬프트별 예시 데이터
  const examplesByPrompt: Record<string, Array<{ index: number; input: { inputType: string; content: string }; output: string }>> = {
    'mock-prompt-001': [
      {
        index: 0,
        input: { inputType: 'text', content: '{"paper_content": "본 연구는 딥러닝 기반 자연어 처리 모델의 성능 향상에 관한 것으로..."}' },
        output: '## 연구 요약\n\n### 1. 연구 목적 및 배경\n딥러닝 기반 NLP 모델의 성능 개선을 위한 새로운 접근법 제시\n\n### 2. 연구 방법론\nTransformer 아키텍처 기반 사전학습 모델 활용\n\n### 3. 주요 발견사항\n기존 대비 15% 성능 향상 달성',
      },
    ],
    'mock-prompt-003': [
      {
        index: 0,
        input: { inputType: 'text', content: '{"topic": "AI 프롬프트 엔지니어링", "keywords": "ChatGPT, 프롬프트, 생산성", "tone": "친근하고 전문적인"}' },
        output: '# AI 프롬프트 엔지니어링: 생산성을 10배 높이는 비밀\n\n프롬프트 하나로 업무 효율이 달라집니다. ChatGPT를 제대로 활용하는 방법을 알아보세요...',
      },
    ],
    'mock-prompt-005': [
      {
        index: 0,
        input: { inputType: 'text', content: '{"product_name": "스마트워치 Pro", "description": "건강 모니터링 기능이 탑재된 프리미엄 스마트워치", "background": "깔끔한 흰색 배경", "style": "미니멀하고 고급스러운"}' },
        output: 'https://picsum.photos/seed/smartwatch/512/512',
      },
      {
        index: 1,
        input: { inputType: 'text', content: '{"product_name": "무선 이어폰 Air", "description": "노이즈 캔슬링 기능의 프리미엄 이어폰", "background": "그라데이션 배경", "style": "모던하고 세련된"}' },
        output: 'https://picsum.photos/seed/earbuds/512/512',
      },
    ],
    'mock-prompt-006': [
      {
        index: 0,
        input: { inputType: 'text', content: '{"features": "긴 금발 머리, 파란 눈, 엘프 귀", "art_style": "애니메이션 스타일", "pose": "정면을 바라보는", "background": "숲 속 배경"}' },
        output: 'https://picsum.photos/seed/character1/512/512',
      },
    ],
    'mock-prompt-007': [
      {
        index: 0,
        input: { inputType: 'text', content: '{"몇 등": "1등", "몇 명": "5명", "남자 팀원": "3명", "여자 팀원": "2명", "표정": "방긋 웃는 표정", "색상": "흰색"}' },
        output: '/이미지 예시 출력.jpg',
      },
    ],
  };
  
  const defaultExamples = isImageType ? [
    {
      index: 0,
      input: { inputType: 'text', content: '{"product_name": "샘플 제품", "style": "미니멀"}' },
      output: 'https://picsum.photos/seed/default/512/512',
    },
  ] : [
    {
      index: 0,
      input: { inputType: 'text', content: '{"topic": "예시 입력값"}' },
      output: '이것은 예시 출력 결과입니다. 실제 프롬프트 사용 시 이와 유사한 형태의 결과를 얻을 수 있습니다.',
    },
  ];
  
  return {
    success: true,
    prompt: {
      ...prompt,
      examples: examplesByPrompt[promptId] || defaultExamples,
    },
    comments: [
      {
        commentId: 'mock-comment-001',
        content: '정말 유용한 프롬프트입니다! 추천해요.',
        userId: 'user-001',
        nickname: 'HappyUser',
        createdAt: '2025-01-20T10:00:00Z',
        updatedAt: '2025-01-20T10:00:00Z',
      },
    ],
  };
};

// Mock 크레딧 잔액 조회
export const mockGetCreditBalance = () => ({
  balance: mockUser.credit,
});
