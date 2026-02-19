/**
 * ALPAS 도서 서비스 진입점
 *
 * ALPAS_USE_MOCK=true(또는 1)이면 Mock 도서(BK001~BK035) 사용.
 * 아니면 ALPAS_API_URL/ALPAS_API_KEY가 있을 때만 실제 ALPAS API 사용.
 */
import { config } from '../config';
import { alpasRealService } from './alpas-real.service';
import { alpasService as alpasMockService } from './alpas.service.mock';

const useReal =
  !config.alpas.useMock &&
  (Boolean(config.alpas.apiUrl) || Boolean(config.alpas.apiKey));

export const alpasService = useReal ? alpasRealService : alpasMockService;
