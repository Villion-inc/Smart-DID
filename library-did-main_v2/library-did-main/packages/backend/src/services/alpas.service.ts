/**
 * ALPAS 도서 서비스 진입점
 *
 * 서버 시작 시 ALPAS API 연결 테스트 (5초 타임아웃).
 * - 연결 성공: 실제 ALPAS 서비스 사용 (검색, 신작 도서 등 전체 기능)
 * - 연결 실패: Mock 서비스 사용 (베타 모드 - 검색/신작 숨김)
 * - ALPAS_USE_MOCK=true: 강제 Mock 사용
 */
import axios from 'axios';
import { config } from '../config';
import { alpasRealService } from './alpas-real.service';
import { alpasService as alpasMockService } from './alpas.service.mock';

let _alpasConnected = false;
let _alpasService: typeof alpasRealService | typeof alpasMockService = alpasMockService;

/** ALPAS 연결 상태 조회 */
export function isAlpasConnected(): boolean {
  return _alpasConnected;
}

/** 현재 활성 ALPAS 서비스 */
export function getAlpasService() {
  return _alpasService;
}

/**
 * 서버 시작 시 호출: ALPAS API 연결 테스트
 * 5초 내 응답 없으면 연결 실패로 간주 → Mock 사용
 */
export async function initAlpasService(): Promise<void> {
  // 강제 Mock 모드
  if (config.alpas.useMock) {
    console.log('[ALPAS] Mock 모드 강제 활성화 (ALPAS_USE_MOCK=true)');
    _alpasConnected = false;
    _alpasService = alpasMockService;
    return;
  }

  const apiUrl = config.alpas.apiUrl;
  if (!apiUrl) {
    console.log('[ALPAS] API URL 미설정 → Mock 서비스 사용');
    _alpasConnected = false;
    _alpasService = alpasMockService;
    return;
  }

  try {
    console.log(`[ALPAS] 연결 테스트 중... (${apiUrl})`);
    // 간단한 GET 요청으로 연결 테스트 (5초 타임아웃)
    await axios.get(`${apiUrl.replace(/\/$/, '')}/AE117.do`, {
      params: {
        networkadapterid: config.alpas.networkAdapterId,
        manage_code: config.alpas.manageCode,
        current_page: '1',
        count_per_page: '1',
      },
      timeout: 5000,
    });
    console.log('[ALPAS] 연결 성공! 실제 ALPAS 서비스 활성화');
    _alpasConnected = true;
    _alpasService = alpasRealService;
  } catch (error: any) {
    console.warn(`[ALPAS] 연결 실패: ${error.message}`);
    console.warn('[ALPAS] Mock 서비스로 폴백 (베타 모드)');
    _alpasConnected = false;
    _alpasService = alpasMockService;
  }
}

// 하위 호환성을 위한 프록시 export
// alpasService를 직접 사용하는 코드가 동적으로 올바른 서비스를 참조하도록
export const alpasService = new Proxy({} as typeof alpasRealService, {
  get(_target, prop) {
    return (_alpasService as any)[prop];
  },
});
