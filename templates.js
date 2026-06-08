// 템플릿 추가 방법:
// 이 배열에 객체 하나 추가하면 선택 화면에 자동으로 카드 생성됩니다.

const TEMPLATES = [
  {
    id: 'chimchakman',
    name: '침착맨 스타일',
    category: '예능',
    thumbnail: 'references/chimchakman.jpg',
    defaults: {
      bgMode:  'color',
      bgColor: '#B8860B',
      font:    'Noto Sans KR',
      person:  { x: 960, y: 0, h: 720 },
      title:    { x: 40, y: 28,  fontSize: 220, italic: true, text: '침착맨\n삼국지' },
      subtitle: { x: 40, y: 590, fontSize: 84,  italic: true, text: '통합본' },
    },
  },
];
