// 카테고리 목록
export const categories = [
  'All',
  '사실/정보/근거 요구',
  '글 창작 및 생성',
  '이미지 창작 및 생성',
];

// 카테고리별 설정 (promptType, 사용 가능한 모델 목록)
export const categoryConfig: Record<string, { promptType: string; models: string[] }> = {
  '사실/정보/근거 요구': {
    promptType: 'type_a',
    models: [
      // GPT
      'gpt-oss-120b',
      'gpt-oss-20b',
      // Claude
      'claude sonnet 4.5',
      'claude 3.5 sonnet v1',
      'claude 3 haiku',
      // Gemma
      'Gemma 3 27B Instruct',
      'Gemma 3 12B IT',
      'Gemma 3 4B Instruct',
    ],
  },
  '글 창작 및 생성': {
    promptType: 'type_b_text',
    models: [
      // GPT
      'gpt-oss-120b',
      'gpt-oss-20b',
      // Claude
      'claude sonnet 4.5',
      'claude 3.5 sonnet v1',
      'claude 3 haiku',
      // Gemma
      'Gemma 3 27B Instruct',
      'Gemma 3 12B IT',
      'Gemma 3 4B Instruct',
    ],
  },
  '이미지 창작 및 생성': {
    promptType: 'type_b_image',
    models: [
      'Titan Image Generator G1 v2',
      'Nova Canvas 1.0',
    ],
  },
};

// 카테고리 -> 백엔드 promptType 매핑
export const categoryToPromptType = (category: string): string => {
  return categoryConfig[category]?.promptType || 'type_a';
};

// 카테고리 -> 사용 가능한 모델 목록
export const getCategoryModels = (category: string): string[] => {
  return categoryConfig[category]?.models || [];
};

// 백엔드 promptType -> 카테고리 매핑 (역방향)
export const promptTypeToCategory: Record<string, string> = {
  'type_a': '사실/정보/근거 요구',
  'type_b_text': '글 창작 및 생성',
  'type_b_image': '이미지 창작 및 생성',
};
