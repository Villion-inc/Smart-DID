import { Book } from '../types';

/**
 * Mock ALPAS Connector
 *
 * This service provides mock data for the ALPAS library system.
 * In production, this will be replaced with actual ALPAS API client.
 *
 * Contains 35 children's books with realistic Korean library data.
 */

const MOCK_BOOKS: Book[] = [
  // New Arrivals (Recent additions)
  {
    id: 'BK001',
    title: '별을 헤아리며',
    author: '김미영',
    publisher: '창비',
    publishedYear: 2024,
    isbn: '9788936447236',
    summary: '어린 소녀가 별을 관찰하며 우주와 꿈에 대해 배워가는 감동적인 이야기입니다. 과학과 상상력이 만나는 아름다운 동화.',
    callNumber: '813.8-김39ㅂ',
    registrationNumber: 'R202401001',
    shelfCode: '1A',
    isAvailable: true,
    coverImageUrl: 'https://picsum.photos/seed/bk001/300/400',
    category: '아동문학',
  },
  {
    id: 'BK002',
    title: '달팽이 학교',
    author: '박서연',
    publisher: '문학동네',
    publishedYear: 2024,
    isbn: '9788954687621',
    summary: '느림의 가치를 배우는 달팽이들의 학교 생활. 빠르기만이 능사가 아니라는 메시지를 담은 따뜻한 그림책.',
    callNumber: '813.8-박53ㄷ',
    registrationNumber: 'R202401002',
    shelfCode: '1A',
    isAvailable: true,
    coverImageUrl: 'https://picsum.photos/seed/bk002/300/400',
    category: '그림책',
  },
  {
    id: 'BK003',
    title: '용감한 토끼의 모험',
    author: '이지수',
    publisher: '사계절',
    publishedYear: 2024,
    isbn: '9788958289456',
    summary: '겁쟁이 토끼가 친구들을 구하기 위해 용기를 내는 이야기. 진정한 용기의 의미를 알려주는 감동적인 동화.',
    callNumber: '813.8-이79ㅇ',
    registrationNumber: 'R202401003',
    shelfCode: '1B',
    isAvailable: true,
    coverImageUrl: 'https://picsum.photos/seed/bk003/300/400',
    category: '아동문학',
  },
  {
    id: 'BK004',
    title: '마법의 도서관',
    author: '정민아',
    publisher: '비룡소',
    publishedYear: 2024,
    isbn: '9788949152673',
    summary: '책 속으로 들어갈 수 있는 마법의 도서관에서 벌어지는 신비로운 모험 이야기.',
    callNumber: '813.8-정38ㅁ',
    registrationNumber: 'R202401004',
    shelfCode: '1B',
    isAvailable: false,
    coverImageUrl: 'https://picsum.photos/seed/bk004/300/400',
    category: '판타지',
  },
  {
    id: 'BK005',
    title: '숲속 음악회',
    author: '최유진',
    publisher: '웅진주니어',
    publishedYear: 2024,
    isbn: '9788901267845',
    summary: '숲속 동물들이 모여 음악회를 준비하는 과정을 통해 협력과 우정의 가치를 배웁니다.',
    callNumber: '813.8-최67ㅅ',
    registrationNumber: 'R202401005',
    shelfCode: '2A',
    isAvailable: true,
    coverImageUrl: 'https://picsum.photos/seed/bk005/300/400',
    category: '그림책',
  },

  // Librarian Picks (Recommended by librarians)
  {
    id: 'BK006',
    title: '어린 왕자',
    author: '생텍쥐페리',
    publisher: '문학동네',
    publishedYear: 2020,
    isbn: '9788954642149',
    summary: '사막에 불시착한 비행사가 만난 어린 왕자와의 대화를 통해 삶의 본질을 탐구하는 세계적 명작.',
    callNumber: '863-생884ㅇ',
    registrationNumber: 'R202003045',
    shelfCode: '2A',
    isAvailable: true,
    coverImageUrl: 'https://picsum.photos/seed/bk006/300/400',
    category: '세계문학',
  },
  {
    id: 'BK007',
    title: '이상한 나라의 앨리스',
    author: '루이스 캐럴',
    publisher: '시공주니어',
    publishedYear: 2019,
    isbn: '9788952787859',
    summary: '토끼굴에 빠진 앨리스가 겪는 기상천외한 모험. 상상력과 창의성을 키워주는 고전.',
    callNumber: '843-캐295ㅇ',
    registrationNumber: 'R201905123',
    shelfCode: '2B',
    isAvailable: true,
    coverImageUrl: 'https://picsum.photos/seed/bk007/300/400',
    category: '세계문학',
  },
  {
    id: 'BK008',
    title: '해리포터와 마법사의 돌',
    author: 'J.K. 롤링',
    publisher: '문학수첩',
    publishedYear: 2021,
    isbn: '9788983925473',
    summary: '평범한 소년 해리포터가 마법학교에 입학하면서 시작되는 환상적인 모험 이야기.',
    callNumber: '843.6-롤239ㅎ-1',
    registrationNumber: 'R202107089',
    shelfCode: '2B',
    isAvailable: false,
    coverImageUrl: 'https://picsum.photos/seed/bk008/300/400',
    category: '판타지',
  },
  {
    id: 'BK009',
    title: '나의 라임오렌지나무',
    author: '바스콘셀로스',
    publisher: '동녘',
    publishedYear: 2018,
    isbn: '9788972977094',
    summary: '가난한 소년의 성장과 상처를 라임오렌지나무와의 교감을 통해 그린 감동적인 이야기.',
    callNumber: '869-바52ㄴ',
    registrationNumber: 'R201804067',
    shelfCode: '3A',
    isAvailable: true,
    coverImageUrl: 'https://picsum.photos/seed/bk009/300/400',
    category: '세계문학',
  },
  {
    id: 'BK010',
    title: '모모',
    author: '미하엘 엔데',
    publisher: '비룡소',
    publishedYear: 2017,
    isbn: '9788949101569',
    summary: '시간을 훔쳐가는 회색 신사들에 맞서 싸우는 소녀 모모의 이야기. 현대사회의 시간에 대해 성찰하게 하는 명작.',
    callNumber: '853-엔23ㅁ',
    registrationNumber: 'R201708134',
    shelfCode: '3A',
    isAvailable: true,
    coverImageUrl: 'https://picsum.photos/seed/bk010/300/400',
    category: '세계문학',
  },

  // Popular Books
  {
    id: 'BK011',
    title: '흔들리지 않는 용기',
    author: '강민수',
    publisher: '창비',
    publishedYear: 2023,
    isbn: '9788936447189',
    summary: '실패를 두려워하지 않고 도전하는 아이들의 이야기. 용기와 회복탄력성을 키워주는 동화.',
    callNumber: '813.8-강38ㅎ',
    registrationNumber: 'R202311089',
    shelfCode: '3B',
    isAvailable: true,
    coverImageUrl: 'https://picsum.photos/seed/bk011/300/400',
    category: '아동문학',
  },
  {
    id: 'BK012',
    title: '친구가 되어줄래?',
    author: '송하나',
    publisher: '문학동네',
    publishedYear: 2023,
    isbn: '9788954687512',
    summary: '새로운 환경에서 친구 사귀기가 어려운 아이를 위한 따뜻한 이야기.',
    callNumber: '813.8-송92ㅊ',
    registrationNumber: 'R202310145',
    shelfCode: '3B',
    isAvailable: true,
    coverImageUrl: 'https://picsum.photos/seed/bk012/300/400',
    category: '그림책',
  },
  {
    id: 'BK013',
    title: '우주 탐험대',
    author: '김태양',
    publisher: '사계절',
    publishedYear: 2023,
    isbn: '9788958289401',
    summary: '우주를 탐험하는 어린이 탐험대의 과학 모험 이야기. 호기심과 탐구심을 키워줍니다.',
    callNumber: '440-김884ㅇ',
    registrationNumber: 'R202309078',
    shelfCode: '4A',
    isAvailable: true,
    coverImageUrl: 'https://picsum.photos/seed/bk013/300/400',
    category: '과학',
  },
  {
    id: 'BK014',
    title: '공룡 백과사전',
    author: '박진우',
    publisher: '아이세움',
    publishedYear: 2022,
    isbn: '9788937892356',
    summary: '아이들이 좋아하는 공룡에 대한 모든 것을 담은 백과사전. 생생한 그림과 함께 배우는 공룡의 세계.',
    callNumber: '457-박79ㄱ',
    registrationNumber: 'R202208234',
    shelfCode: '4A',
    isAvailable: true,
    coverImageUrl: 'https://picsum.photos/seed/bk014/300/400',
    category: '과학',
  },
  {
    id: 'BK015',
    title: '신비한 바다 생물',
    author: '이수민',
    publisher: '예림당',
    publishedYear: 2023,
    isbn: '9788930233456',
    summary: '바다 깊은 곳에 사는 신비한 생물들의 이야기. 해양 생태계의 경이로움을 전달합니다.',
    callNumber: '491-이56ㅅ',
    registrationNumber: 'R202307156',
    shelfCode: '4B',
    isAvailable: false,
    coverImageUrl: 'https://picsum.photos/seed/bk015/300/400',
    category: '과학',
  },

  // Korean Literature Classics
  {
    id: 'BK016',
    title: '마당을 나온 암탉',
    author: '황선미',
    publisher: '사계절',
    publishedYear: 2015,
    isbn: '9788958283355',
    summary: '자유를 꿈꾸는 암탉 잎싹의 감동적인 이야기. 진정한 자유와 모성애를 그린 한국 대표 동화.',
    callNumber: '813.7-황54ㅁ',
    registrationNumber: 'R201503092',
    shelfCode: '4B',
    isAvailable: true,
    coverImageUrl: 'https://picsum.photos/seed/bk016/300/400',
    category: '아동문학',
  },
  {
    id: 'BK017',
    title: '몽실언니',
    author: '권정생',
    publisher: '창비',
    publishedYear: 2016,
    isbn: '9788936442637',
    summary: '전쟁의 아픔을 겪은 소녀 몽실의 이야기. 역사와 인간애를 담은 한국 아동문학의 걸작.',
    callNumber: '813.7-권74ㅁ',
    registrationNumber: 'R201605123',
    shelfCode: '5A',
    isAvailable: true,
    coverImageUrl: 'https://picsum.photos/seed/bk017/300/400',
    category: '아동문학',
  },
  {
    id: 'BK018',
    title: '불량한 자전거 여행',
    author: '김남중',
    publisher: '창비',
    publishedYear: 2019,
    isbn: '9788936447038',
    summary: '자전거를 타고 떠나는 소년의 성장 여행기. 진정한 성장의 의미를 담은 청소년 소설.',
    callNumber: '813.8-김192ㅂ',
    registrationNumber: 'R201907089',
    shelfCode: '5A',
    isAvailable: true,
    coverImageUrl: 'https://picsum.photos/seed/bk018/300/400',
    category: '청소년문학',
  },
  {
    id: 'BK019',
    title: '까만 콩의 여행',
    author: '이현',
    publisher: '문학동네',
    publishedYear: 2020,
    isbn: '9788954657426',
    summary: '콩 한 알이 싹 트고 자라는 과정을 통해 생명의 소중함을 배우는 그림책.',
    callNumber: '813.8-이94ㄲ',
    registrationNumber: 'R202006234',
    shelfCode: '5B',
    isAvailable: true,
    coverImageUrl: 'https://picsum.photos/seed/bk019/300/400',
    category: '그림책',
  },
  {
    id: 'BK020',
    title: '나무를 심은 사람',
    author: '장 지오노',
    publisher: '두레아이들',
    publishedYear: 2018,
    isbn: '9788991892767',
    summary: '황무지에 나무를 심어 숲을 만든 한 사람의 이야기. 환경과 헌신의 가치를 일깨워줍니다.',
    callNumber: '863-지65ㄴ',
    registrationNumber: 'R201809167',
    shelfCode: '5B',
    isAvailable: true,
    coverImageUrl: 'https://picsum.photos/seed/bk020/300/400',
    category: '세계문학',
  },

  // Educational Books
  {
    id: 'BK021',
    title: '어린이를 위한 역사 이야기',
    author: '김지연',
    publisher: '주니어김영사',
    publishedYear: 2022,
    isbn: '9788934995678',
    summary: '한국사의 주요 사건들을 재미있게 풀어낸 역사 교양서.',
    callNumber: '911-김79ㅇ',
    registrationNumber: 'R202204178',
    shelfCode: '6A',
    isAvailable: true,
    coverImageUrl: 'https://picsum.photos/seed/bk021/300/400',
    category: '역사',
  },
  {
    id: 'BK022',
    title: '세계 여러 나라 이야기',
    author: '박세계',
    publisher: '상수리',
    publishedYear: 2021,
    isbn: '9788992988445',
    summary: '세계 각국의 문화와 역사를 쉽게 배울 수 있는 교양서.',
    callNumber: '909-박54ㅅ',
    registrationNumber: 'R202105234',
    shelfCode: '6A',
    isAvailable: true,
    coverImageUrl: 'https://picsum.photos/seed/bk022/300/400',
    category: '사회',
  },
  {
    id: 'BK023',
    title: '생활 속 과학 원리',
    author: '최과학',
    publisher: '지학사',
    publishedYear: 2023,
    isbn: '9788992311234',
    summary: '일상생활에서 경험하는 과학 원리를 쉽고 재미있게 설명한 책.',
    callNumber: '407-최67ㅅ',
    registrationNumber: 'R202308145',
    shelfCode: '6B',
    isAvailable: true,
    coverImageUrl: 'https://picsum.photos/seed/bk023/300/400',
    category: '과학',
  },
  {
    id: 'BK024',
    title: '수학이 쉬워지는 비법',
    author: '이수학',
    publisher: '천재교육',
    publishedYear: 2022,
    isbn: '9788912335678',
    summary: '수학의 기초 개념을 재미있는 이야기로 풀어낸 학습서.',
    callNumber: '410-이56ㅅ',
    registrationNumber: 'R202209201',
    shelfCode: '6B',
    isAvailable: false,
    coverImageUrl: 'https://picsum.photos/seed/bk024/300/400',
    category: '수학',
  },
  {
    id: 'BK025',
    title: '생각을 키우는 철학 이야기',
    author: '정철학',
    publisher: '풀빛',
    publishedYear: 2021,
    isbn: '9788974740234',
    summary: '어린이의 눈높이에 맞춘 철학 입문서. 생각하는 힘을 길러줍니다.',
    callNumber: '104-정84ㅅ',
    registrationNumber: 'R202107298',
    shelfCode: '7A',
    isAvailable: true,
    coverImageUrl: 'https://picsum.photos/seed/bk025/300/400',
    category: '철학',
  },

  // Recent Additions (More)
  {
    id: 'BK026',
    title: '꿈꾸는 피아니스트',
    author: '조음악',
    publisher: '웅진주니어',
    publishedYear: 2024,
    isbn: '9788901267912',
    summary: '피아노를 사랑하는 소녀의 꿈과 도전을 그린 감동적인 이야기.',
    callNumber: '813.8-조67ㄲ',
    registrationNumber: 'R202401006',
    shelfCode: '7A',
    isAvailable: true,
    coverImageUrl: 'https://picsum.photos/seed/bk026/300/400',
    category: '예술',
  },
  {
    id: 'BK027',
    title: '로봇 친구 로비',
    author: '한미래',
    publisher: '비룡소',
    publishedYear: 2023,
    isbn: '9788949152734',
    summary: '로봇과 인간의 우정을 그린 따뜻한 SF 동화.',
    callNumber: '813.8-한38ㄹ',
    registrationNumber: 'R202312234',
    shelfCode: '7B',
    isAvailable: true,
    coverImageUrl: 'https://picsum.photos/seed/bk027/300/400',
    category: '과학소설',
  },
  {
    id: 'BK028',
    title: '지구를 지키는 어린이',
    author: '김환경',
    publisher: '풀빛',
    publishedYear: 2023,
    isbn: '9788974740567',
    summary: '환경보호의 중요성을 알려주는 교육적인 동화.',
    callNumber: '539-김94ㅈ',
    registrationNumber: 'R202311156',
    shelfCode: '7B',
    isAvailable: true,
    coverImageUrl: 'https://picsum.photos/seed/bk028/300/400',
    category: '환경',
  },
  {
    id: 'BK029',
    title: '맛있는 요리 교실',
    author: '박요리',
    publisher: '주니어RHK',
    publishedYear: 2023,
    isbn: '9788925567234',
    summary: '아이들이 직접 만들 수 있는 간단하고 재미있는 요리 레시피.',
    callNumber: '594-박67ㅁ',
    registrationNumber: 'R202310289',
    shelfCode: '8A',
    isAvailable: true,
    coverImageUrl: 'https://picsum.photos/seed/bk029/300/400',
    category: '요리',
  },
  {
    id: 'BK030',
    title: '스포츠 영웅 이야기',
    author: '이체육',
    publisher: '비룡소',
    publishedYear: 2023,
    isbn: '9788949152801',
    summary: '세계적인 스포츠 스타들의 감동적인 성공 스토리.',
    callNumber: '692-이84ㅅ',
    registrationNumber: 'R202309345',
    shelfCode: '8A',
    isAvailable: true,
    coverImageUrl: 'https://picsum.photos/seed/bk030/300/400',
    category: '스포츠',
  },

  // Additional Books
  {
    id: 'BK031',
    title: '하늘을 나는 자전거',
    author: '윤상상',
    publisher: '창비',
    publishedYear: 2022,
    isbn: '9788936447167',
    summary: '상상력이 현실이 되는 마법 같은 이야기.',
    callNumber: '813.8-윤52ㅎ',
    registrationNumber: 'R202208123',
    shelfCode: '8B',
    isAvailable: true,
    coverImageUrl: 'https://picsum.photos/seed/bk031/300/400',
    category: '판타지',
  },
  {
    id: 'BK032',
    title: '바다 탐험가의 일기',
    author: '강바다',
    publisher: '사계절',
    publishedYear: 2022,
    isbn: '9788958289478',
    summary: '바다를 탐험하며 발견한 신비로운 이야기들.',
    callNumber: '813.8-강38ㅂ',
    registrationNumber: 'R202207234',
    shelfCode: '8B',
    isAvailable: true,
    coverImageUrl: 'https://picsum.photos/seed/bk032/300/400',
    category: '모험',
  },
  {
    id: 'BK033',
    title: '시간을 달리는 아이들',
    author: '서시간',
    publisher: '문학동네',
    publishedYear: 2022,
    isbn: '9788954687589',
    summary: '시간 여행을 통해 역사를 배우는 신나는 모험.',
    callNumber: '813.8-서56ㅅ',
    registrationNumber: 'R202206178',
    shelfCode: '9A',
    isAvailable: false,
    coverImageUrl: 'https://picsum.photos/seed/bk033/300/400',
    category: '판타지',
  },
  {
    id: 'BK034',
    title: '용감한 소방관 아저씨',
    author: '최용기',
    publisher: '웅진주니어',
    publishedYear: 2021,
    isbn: '9788901267678',
    summary: '소방관의 하루를 통해 직업의 의미를 배우는 그림책.',
    callNumber: '813.8-최67ㅇ',
    registrationNumber: 'R202105345',
    shelfCode: '9A',
    isAvailable: true,
    coverImageUrl: 'https://picsum.photos/seed/bk034/300/400',
    category: '직업',
  },
  {
    id: 'BK035',
    title: '마법의 색연필',
    author: '홍그림',
    publisher: '비룡소',
    publishedYear: 2021,
    isbn: '9788949152678',
    summary: '그림이 현실이 되는 마법의 색연필 이야기.',
    callNumber: '813.8-홍74ㅁ',
    registrationNumber: 'R202104289',
    shelfCode: '9B',
    isAvailable: true,
    coverImageUrl: 'https://picsum.photos/seed/bk035/300/400',
    category: '판타지',
  },
];

// IDs for special collections
const NEW_ARRIVAL_IDS = ['BK001', 'BK002', 'BK003', 'BK004', 'BK005', 'BK026', 'BK027', 'BK028'];
const LIBRARIAN_PICK_IDS = ['BK006', 'BK007', 'BK009', 'BK010', 'BK016', 'BK017', 'BK020'];

// Age group categorization based on call numbers and categories
// 유아 (Preschool): Picture books and simple stories
const PRESCHOOL_IDS = ['BK002', 'BK005', 'BK012', 'BK019', 'BK034'];
// 초등 (Elementary): Children's literature, science, adventure
const ELEMENTARY_IDS = ['BK001', 'BK003', 'BK011', 'BK013', 'BK014', 'BK016', 'BK021', 'BK023', 'BK026', 'BK027', 'BK028', 'BK029', 'BK030', 'BK031', 'BK032', 'BK035'];
// 청소년 (Teen): World literature, deeper themes, teen novels
const TEEN_IDS = ['BK006', 'BK007', 'BK008', 'BK009', 'BK010', 'BK017', 'BK018', 'BK020', 'BK022', 'BK025', 'BK033'];

export class AlpasService {
  /**
   * Search books by keyword (title, author, or category)
   */
  async searchBooks(keyword: string): Promise<Book[]> {
    if (!keyword || keyword.trim() === '') {
      return MOCK_BOOKS;
    }

    const lowerKeyword = keyword.toLowerCase();
    return MOCK_BOOKS.filter(
      (book) =>
        book.title.toLowerCase().includes(lowerKeyword) ||
        book.author.toLowerCase().includes(lowerKeyword) ||
        book.category.toLowerCase().includes(lowerKeyword) ||
        book.summary.toLowerCase().includes(lowerKeyword)
    );
  }

  /**
   * Get book details by ID
   */
  async getBookDetail(bookId: string): Promise<Book | null> {
    return MOCK_BOOKS.find((book) => book.id === bookId) || null;
  }

  /**
   * Get new arrival books
   */
  async getNewArrivals(): Promise<Book[]> {
    return MOCK_BOOKS.filter((book) => NEW_ARRIVAL_IDS.includes(book.id));
  }

  /**
   * Get librarian recommended books
   */
  async getLibrarianPicks(): Promise<Book[]> {
    return MOCK_BOOKS.filter((book) => LIBRARIAN_PICK_IDS.includes(book.id));
  }

  /**
   * Get books by age group for DID interface
   * @param ageGroup - 'preschool' | 'elementary' | 'teen'
   */
  async getBooksByAgeGroup(ageGroup: string): Promise<Book[]> {
    let ids: string[];

    switch (ageGroup.toLowerCase()) {
      case 'preschool':
      case '유아':
        ids = PRESCHOOL_IDS;
        break;
      case 'elementary':
      case '초등':
        ids = ELEMENTARY_IDS;
        break;
      case 'teen':
      case '청소년':
        ids = TEEN_IDS;
        break;
      default:
        return [];
    }

    return MOCK_BOOKS.filter((book) => ids.includes(book.id));
  }

  /**
   * Get all books (for admin)
   */
  async getAllBooks(): Promise<Book[]> {
    return MOCK_BOOKS;
  }
}

// Export singleton instance
export const alpasService = new AlpasService();
