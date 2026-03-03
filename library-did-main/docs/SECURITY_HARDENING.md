# 보안 강화 계획서 (Security Hardening Plan)

> **프로젝트**: 꿈샘 도서관 Smart DID Video Service
> **작성일**: 2026-03-01
> **상태**: 계획 (미구현)
> **대상 범위**: Backend (Fastify) / Frontend (React+Vite) / Worker (BullMQ) / Infrastructure (Docker, Nginx)

---

## 1. 현재 보안 진단 요약

전체 코드베이스에 대한 보안 감사 결과, **CRITICAL 12건, HIGH 8건, MEDIUM 20건**의 취약점이 확인되었습니다.

| 카테고리 | 심각도 | 현재 상태 | 주요 문제 |
|----------|--------|-----------|-----------|
| CORS/Preflight | CRITICAL | 개발환경 `origin: true` (모든 도메인 허용) | 인증 쿠키가 크로스 오리진으로 전송 가능 |
| CSRF | CRITICAL | 보호 없음 | 쿠키 기반 인증 전환 시 CSRF 공격 가능 |
| XSS + CSP | HIGH | `contentSecurityPolicy: false` | CSP 비활성화, 외부 CDN SRI 없음 |
| SSRF | MEDIUM | ALPAS API URL 미검증 | 내부 IP 접근 가능 |
| AuthN/AuthZ | CRITICAL | JWT를 localStorage에 저장, 7일 만료 | XSS 시 토큰 탈취, 긴 유효기간 |
| RBAC | MEDIUM | `role !== 'admin'` 단일 검사 | 타입 미안전, 세분화 부족 |
| Validation + SQLi | MEDIUM | Zod 스키마 미적용, 길이 제한 없음 | 대용량 입력 가능, Path Traversal 취약 |
| Rate Limit | MEDIUM | 전역 100req/min 단일 설정 | 로그인 무제한 시도 가능 |
| Cookie/Session | CRITICAL | HttpOnly/Secure/SameSite 미사용 | localStorage 기반 → XSS 취약 |
| Secret 관리 | CRITICAL | 기본 비밀번호 하드코딩 (`admin1234`) | Production에서도 기본값 사용 가능 |
| HTTPS/HSTS | HIGH | HSTS 미설정, CORP 'cross-origin' | 중간자 공격 가능 |
| Audit Log | MEDIUM | 보안 이벤트 로깅 없음 | 로그인 시도, 관리 작업 추적 불가 |
| Error 노출 | HIGH | `error.message` 클라이언트 전송 | 내부 구현 정보 유출 |
| Dependency | HIGH | axios 1.6.2, jest 25.x (취약 버전) | 알려진 보안 취약점 |

---

## 2. 보안 강화 항목별 상세 계획

### 2.1 CORS / Preflight

**현재 코드** (`packages/backend/src/index.ts:45-50`):
```typescript
await fastify.register(cors, {
  origin: config.nodeEnv === 'production' ? allowedOrigins : true,  // dev: 모든 도메인 허용
  credentials: true,
});
```

**개선 방안**:
```typescript
await fastify.register(cors, {
  origin: config.nodeEnv === 'production'
    ? allowedOrigins
    : [/^http:\/\/localhost(:\d+)?$/],  // dev에서도 localhost만 허용
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  maxAge: 600,  // preflight 캐싱 10분
});
```

**적용 파일**: `packages/backend/src/index.ts`

---

### 2.2 CSRF 보호

**현재 상태**: CSRF 보호 전무

**개선 방안**:
1. `@fastify/cookie` + `@fastify/csrf-protection` 플러그인 설치
2. 로그인 시 CSRF 토큰 발급, 프론트엔드에서 `x-csrf-token` 헤더로 전송
3. Admin 라우트의 상태 변경 요청(POST/PUT/PATCH/DELETE)에 CSRF 검증 적용
4. DID 공개 라우트와 Internal API는 CSRF 검증 제외

**신규 파일**: `packages/backend/src/middleware/csrf.middleware.ts`
```typescript
export async function verifyCsrf(request: FastifyRequest, reply: FastifyReply) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return;
  if (request.url.includes('/internal/')) return;  // 내부 API 제외

  try {
    await request.csrfVerify();
  } catch (err) {
    return reply.code(403).send({ success: false, error: 'Invalid or missing CSRF token' });
  }
}
```

**적용 파일**: `packages/backend/src/routes/admin.routes.ts` (preHandler에 추가)

---

### 2.3 XSS + CSP (Content Security Policy)

**현재 코드** (`packages/backend/src/index.ts:52-56`):
```typescript
await fastify.register(helmet, {
  contentSecurityPolicy: false,  // CSP 완전 비활성화
  crossOriginResourcePolicy: { policy: 'cross-origin' },
});
```

**개선 방안**:
```typescript
await fastify.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      fontSrc: ["'self'", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "https://picsum.photos", "https://storage.googleapis.com"],
      mediaSrc: ["'self'", "blob:"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
  crossOriginResourcePolicy: { policy: 'same-origin' },
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  hsts: config.nodeEnv === 'production'
    ? { maxAge: 31536000, includeSubDomains: true }
    : false,
  permissionsPolicy: {
    features: { camera: [], microphone: [], geolocation: [] },
  },
});
```

**프론트엔드** (`packages/frontend/index.html`):
- Pretendard CDN 링크에 SRI (Subresource Integrity) 추가:
```html
<link rel="stylesheet"
  href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
  integrity="sha384-<COMPUTED_HASH>"
  crossorigin="anonymous" />
```

---

### 2.4 SSRF 방어

**현재 상태**: ALPAS API URL을 환경변수에서 직접 사용, 검증 없음

**개선 방안**: 신규 유틸 `packages/backend/src/utils/ssrf-guard.ts`

```typescript
import { URL } from 'url';

const PRIVATE_RANGES = [
  /^127\./, /^10\./, /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./, /^0\./, /^169\.254\./, /^::1$/, /^fc00:/i, /^fe80:/i,
];

export function validateOutboundUrl(rawUrl: string): URL {
  const parsed = new URL(rawUrl);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error(`Blocked protocol: ${parsed.protocol}`);
  }
  const hostname = parsed.hostname;
  for (const range of PRIVATE_RANGES) {
    if (range.test(hostname)) throw new Error('Requests to private IP addresses are blocked');
  }
  if (['localhost', '0.0.0.0', '[::1]'].includes(hostname.toLowerCase())) {
    throw new Error('Requests to localhost are blocked');
  }
  return parsed;
}
```

**적용 파일**: `packages/backend/src/services/alpas-real.service.ts` - Production에서 `createAlpasClient()` 호출 시 URL 검증

---

### 2.5 AuthN/AuthZ 강화 (Cookie 기반 JWT)

**현재 문제점**:
- JWT를 응답 body로 반환 → 프론트엔드가 localStorage에 저장 → XSS 시 탈취 가능
- 만료 기간 7일 → 탈취 시 장기간 악용 가능
- `(request as any).user` 타입 미안전 캐스팅

**개선 방안**:

#### Backend - `packages/backend/src/controllers/auth.controller.ts`:
```typescript
async login(request, reply) {
  const user = await authService.validateUser(username, password);
  // ... validation ...

  const token = request.server.jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    { expiresIn: '1h' }  // 7일 → 1시간
  );

  const csrfToken = reply.generateCsrf();

  // httpOnly 쿠키로 설정 (JavaScript 접근 불가)
  reply.setCookie('access_token', token, {
    httpOnly: true,
    secure: config.cookie.secure,       // production: true
    sameSite: 'strict',                 // CSRF 방어
    path: '/',
    maxAge: 3600,
  });

  // 응답에는 token 미포함, csrfToken만 포함
  return reply.send({
    success: true,
    data: { username: user.username, role: user.role, csrfToken },
  });
}
```

#### Frontend - `packages/frontend/src/stores/authStore.ts`:
```typescript
// localStorage 완전 제거
initialize: async () => {
  try {
    const user = await authApi.getMe();      // 쿠키 자동 전송
    const csrfToken = await authApi.getCsrfToken();
    set({ username: user.username, role: user.role, csrfToken, isAuthenticated: true });
  } catch {
    set({ username: null, role: null, csrfToken: null, isAuthenticated: false });
  }
},
```

#### Frontend - `packages/frontend/src/api/client.ts`:
```typescript
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,  // httpOnly 쿠키 자동 전송
});

// CSRF 토큰 헤더 자동 첨부
apiClient.interceptors.request.use((config) => {
  if (['post','put','patch','delete'].includes((config.method || '').toLowerCase())) {
    const csrfToken = window.__CSRF_TOKEN__;
    if (csrfToken) config.headers['x-csrf-token'] = csrfToken;
  }
  return config;
});
```

#### Middleware - `packages/backend/src/middleware/auth.middleware.ts`:
```typescript
// 타입 안전한 JWT payload
declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { id: string; username: string; role: 'admin' };
    user: { id: string; username: string; role: 'admin' };
  }
}

export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
    if (!request.user || request.user.role !== 'admin') {
      return reply.code(403).send({ success: false, error: 'Admin access required' });
    }
  } catch {
    return reply.code(401).send({ success: false, error: 'Unauthorized' });
  }
}
```

---

### 2.6 RBAC / 최소 권한

**현재 상태**: `admin` 역할 하나만 존재, Docker 컨테이너 root 실행

**개선 방안**:
- Auth middleware에서 `@fastify/jwt` 타입 확장으로 타입 안전성 확보
- Docker에서 non-root 유저 실행 (Phase 9 참조)
- Redis에 비밀번호 설정 (Phase 9 참조)
- 현재는 단일 라이브러리 시스템이므로 테넌트 격리는 RBAC로 충분

---

### 2.7 Input Validation + SQLi 방어

**현재 문제점**:
- Zod 스키마가 정의되어 있으나 라우트에 미적용
- 문자열 길이 제한 없음 (수 MB 입력 가능)
- Path Traversal: 블랙리스트 방식 (`includes('..')`)
- Prisma ORM 사용으로 SQLi 자체는 안전

**개선 방안**:

#### 신규 파일 - `packages/backend/src/utils/zod-validate.ts`:
```typescript
export function zodValidate(schema: ZodSchema, source: 'body' | 'query' | 'params') {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = source === 'body' ? request.body : source === 'query' ? request.query : request.params;
      const parsed = schema.parse(data);
      if (source === 'body') (request as any).body = parsed;
      if (source === 'query') (request as any).query = parsed;
      if (source === 'params') (request as any).params = parsed;
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send({
          success: false,
          error: 'Validation failed',
          details: error.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
        });
      }
      throw error;
    }
  };
}
```

#### 신규 파일 - `packages/backend/src/schemas/did.schema.ts`:
```typescript
export const didSearchSchema = z.object({
  q: z.string().min(1).max(200),
  limit: z.string().regex(/^\d+$/).optional().transform((v) => {
    if (!v) return 20;
    return Math.min(Math.max(parseInt(v, 10), 1), 100);  // 1~100 clamp
  }),
});

export const didBookIdSchema = z.object({
  bookId: z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/),
});

export const didVideoRequestBodySchema = z.object({
  title: z.string().max(500).optional(),
  author: z.string().max(200).optional(),
  summary: z.string().max(5000).optional(),
}).optional();
```

#### 기존 스키마 강화:
| 파일 | 변경 |
|------|------|
| `auth.schema.ts` | `username: max(64)`, `password: max(128)` |
| `book.schema.ts` | `keyword: max(200)` |
| `video.schema.ts` | `bookId: regex(/^[a-zA-Z0-9_-]+$/)` |

#### Path Traversal 수정 - `packages/backend/src/routes/video.routes.ts`:
```typescript
// 기존 (블랙리스트 - 우회 가능):
if (!filename || filename.includes('..') || filename.includes('/')) { ... }

// 개선 (화이트리스트):
const SAFE_FILENAME = /^[a-zA-Z0-9_-]+\.(mp4|vtt|webm)$/;
if (!filename || !SAFE_FILENAME.test(filename)) {
  return reply.code(400).send({ error: 'Invalid filename' });
}
const filePath = path.resolve(config.storage.path, filename);
if (!filePath.startsWith(path.resolve(config.storage.path))) {
  return reply.code(400).send({ error: 'Invalid filename' });
}
```

#### Worker 스토리지 - `packages/worker/src/services/storage-local.provider.ts`:
```typescript
// 기존 (불완전):
const safeKey = key.replace(/\.\./g, '').replace(/^\/+/, '');

// 개선:
private sanitizeKey(key: string): string {
  const basename = path.basename(key);
  if (!/^[a-zA-Z0-9_.-]+$/.test(basename)) throw new Error(`Invalid storage key: ${key}`);
  return basename;
}
```

---

### 2.8 Rate Limiting / Brute-force 방어

**현재 상태**: 전역 100req/min 단일 설정

**개선 방안** (엔드포인트별 차등 적용):

| 엔드포인트 | 제한 | 근거 |
|-----------|------|------|
| `POST /api/auth/login` | **5 req/min** per IP | 브루트포스 방어 |
| `GET /api/did/search` | **30 req/min** per IP | 검색 남용 방지 |
| `POST /api/did/books/:bookId/video/request` | **10 req/min** per IP | 큐 남용 방지 |
| 기타 전역 | 100 req/min (유지) | 일반 DDoS 방어 |

**구현**:
```typescript
// auth.routes.ts
fastify.post('/auth/login', {
  config: {
    rateLimit: {
      max: 5,
      timeWindow: '1 minute',
      keyGenerator: (request) => request.ip,
      errorResponseBuilder: () => ({
        success: false,
        error: '로그인 시도가 너무 많습니다. 1분 후 다시 시도해주세요.',
        statusCode: 429,
      }),
    },
  },
  handler: authController.login.bind(authController),
});
```

---

### 2.9 Cookie (HttpOnly, Secure, SameSite) + Session 보안

2.5절에서 상세 설명. 요약:

| 속성 | 값 | 효과 |
|------|-----|------|
| `httpOnly` | `true` | JavaScript에서 쿠키 접근 차단 (XSS 방어) |
| `secure` | prod: `true` | HTTPS에서만 쿠키 전송 |
| `sameSite` | `'strict'` | 크로스 사이트 요청에서 쿠키 미전송 (CSRF 방어) |
| `maxAge` | `3600` (1시간) | 기존 7일에서 대폭 단축 |
| `path` | `'/'` | 전체 도메인에서 유효 |

---

### 2.10 Secret 관리 + Rotation

**현재 문제점**:
```typescript
// config/index.ts
jwt: { secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production' }
admin: { password: process.env.ADMIN_PASSWORD || 'admin1234' }
internalApiSecret: process.env.INTERNAL_API_SECRET || process.env.JWT_SECRET || 'internal-secret'
```
- 모든 시크릿에 위험한 기본값 존재
- `INTERNAL_API_SECRET`이 `JWT_SECRET`으로 fallback (하나 탈취 시 둘 다 노출)

**개선 방안**:

#### 시작 시 검증 - `packages/backend/src/config/index.ts`:
```typescript
function validateRequiredSecrets(): void {
  if (process.env.NODE_ENV !== 'production') return;

  const errors: string[] = [];
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'your-secret-key-change-in-production')
    errors.push('JWT_SECRET must be set to a strong, unique value');
  if (!process.env.INTERNAL_API_SECRET || process.env.INTERNAL_API_SECRET === 'internal-secret')
    errors.push('INTERNAL_API_SECRET must be set');
  if (!process.env.ADMIN_PASSWORD || ['admin1234','changeme123'].includes(process.env.ADMIN_PASSWORD))
    errors.push('ADMIN_PASSWORD must be changed from default');
  if (process.env.JWT_SECRET === process.env.INTERNAL_API_SECRET)
    errors.push('JWT_SECRET and INTERNAL_API_SECRET must be different');

  if (errors.length > 0) {
    throw new Error(`Security configuration errors:\n  - ${errors.join('\n  - ')}`);
  }
}

validateRequiredSecrets();
```

#### Rotation 전략:
- JWT는 1시간 만료이므로, secret 변경 후 최대 1시간 내 모든 기존 토큰 만료
- 추후 key versioning (kid header) 도입 고려

---

### 2.11 HTTPS / HSTS + 보안 헤더

**Fastify (Helmet)**: 2.3절에서 상세 설명

**Nginx** (`nginx.conf`에 추가):
```nginx
server {
    # 보안 헤더
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
    # Production에서는 HSTS도 추가:
    # add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
}
```

---

### 2.12 Audit Log

**현재 상태**: 보안 이벤트 로깅 전무

**개선 방안**: 신규 파일 `packages/backend/src/utils/audit-logger.ts`

```typescript
export type AuditEvent =
  | 'LOGIN_SUCCESS' | 'LOGIN_FAILURE' | 'LOGOUT'
  | 'ADMIN_ACTION' | 'AUTH_FAILURE' | 'CSRF_FAILURE'
  | 'RATE_LIMIT_HIT' | 'INTERNAL_API_AUTH_FAILURE';

export function auditLog(
  logger: FastifyBaseLogger,
  event: AuditEvent,
  data: { ip: string; username?: string; details?: Record<string, unknown> }
): void {
  logger.info(
    { audit: true, event, ...data, timestamp: new Date().toISOString() },
    `AUDIT: ${event}`
  );
}
```

**적용 위치**:
| 이벤트 | 위치 | 로그 내용 |
|--------|------|-----------|
| `LOGIN_SUCCESS` | `auth.controller.ts` login | username, IP |
| `LOGIN_FAILURE` | `auth.controller.ts` login | username, IP |
| `ADMIN_ACTION` | `admin.controller.ts` 각 핸들러 | action, bookId, IP |
| `INTERNAL_API_AUTH_FAILURE` | `internal.routes.ts` | IP |

---

### 2.13 Error 노출 차단

**현재 코드** (12개 catch 블록에서 반복):
```typescript
} catch (error: any) {
  return reply.code(500).send({
    success: false,
    error: error.message || 'Failed to fetch new arrivals',  // 내부 에러 노출!
  });
}
```

**개선 방안**: 신규 유틸 `packages/backend/src/utils/safe-error.ts`
```typescript
export function safeErrorMessage(error: unknown, fallback: string): string {
  if (process.env.NODE_ENV === 'development' && error instanceof Error) {
    return error.message;  // 개발 시에만 실제 에러 표시
  }
  return fallback;  // Production에서는 고정 메시지만
}
```

**적용 대상**: 12개 catch 블록
- `packages/backend/src/controllers/did.controller.ts` — 7곳
- `packages/backend/src/controllers/admin.controller.ts` — 4곳
- `packages/backend/src/routes/internal.routes.ts` — 1곳

---

### 2.14 의존성 취약점 점검

| 패키지 | 현재 | 업데이트 | 위치 | 심각도 |
|--------|------|----------|------|--------|
| `jest` | ^25.0.0 | ^29.7.0 | backend, worker | HIGH |
| `axios` | ^1.6.2 | ^1.7.9 | worker | HIGH |

추가로 `npm audit` 실행 후 자동 수정 가능한 취약점 일괄 처리.

---

### 2.15 Internal API 타이밍 안전 비교

**현재 코드** (`packages/backend/src/routes/internal.routes.ts:24`):
```typescript
if (!expected || received !== expected) {  // 타이밍 공격 취약
```

**개선 방안**:
```typescript
import { timingSafeEqual } from 'crypto';

const received = String(request.headers['x-internal-secret'] ?? '').trim();
const expected = String(config.internalApiSecret ?? '').trim();

if (!expected || !received || received.length !== expected.length) {
  auditLog(fastify.log, 'INTERNAL_API_AUTH_FAILURE', { ip: request.ip });
  return reply.code(401).send({ success: false, error: 'Unauthorized' });
}
const isValid = timingSafeEqual(Buffer.from(received), Buffer.from(expected));
if (!isValid) {
  auditLog(fastify.log, 'INTERNAL_API_AUTH_FAILURE', { ip: request.ip });
  return reply.code(401).send({ success: false, error: 'Unauthorized' });
}
```

---

### 2.16 Frontend 라우트 보호

**현재 상태**: Admin 페이지(`/admin/dashboard`, `/admin/recommend`, `/admin/videos`)에 인증 없이 직접 접근 가능

**개선 방안** (`packages/frontend/src/App.tsx`):
```typescript
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, initialize } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    initialize().finally(() => setIsChecking(false));
  }, []);

  if (isChecking) return <div>Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
}

// 적용:
<Route path="/admin/dashboard" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
<Route path="/admin/recommend" element={<ProtectedRoute><AdminRecommendBook /></ProtectedRoute>} />
<Route path="/admin/videos" element={<ProtectedRoute><VideoManagement /></ProtectedRoute>} />
```

추가: `packages/frontend/src/pages/admin/Login.tsx`에서 기본 계정 힌트 (`admin / changeme123`) 제거

---

## 3. Docker / Infrastructure 보안

### 3.1 Non-root 컨테이너

**현재**: 모든 컨테이너 root로 실행

**개선** (`Dockerfile.backend`, `Dockerfile.worker`):
```dockerfile
FROM node:18-alpine
RUN addgroup -g 1001 -S nodejs && adduser -S appuser -u 1001 -G nodejs
WORKDIR /app
COPY --from=builder --chown=appuser:nodejs ...
USER appuser
CMD ["node", "dist/index.js"]
```

### 3.2 Redis 인증

**현재**: Redis 비밀번호 없음, 포트 외부 노출

**개선** (`docker-compose.yml`):
```yaml
redis:
  command: redis-server --requirepass ${REDIS_PASSWORD}
  ports: []  # 외부 포트 노출 제거 (production)
```

### 3.3 네트워크 분리

```yaml
networks:
  internal:
    internal: true   # 외부 접근 불가
  web: {}            # 프론트엔드만 외부 접근 가능
```

---

## 4. 신규 파일 목록

| 파일 | 용도 |
|------|------|
| `packages/backend/src/utils/safe-error.ts` | Error 메시지 sanitization |
| `packages/backend/src/utils/audit-logger.ts` | 보안 이벤트 audit logging |
| `packages/backend/src/utils/ssrf-guard.ts` | SSRF 방어 (private IP 차단) |
| `packages/backend/src/utils/zod-validate.ts` | Fastify용 Zod validation 미들웨어 |
| `packages/backend/src/middleware/csrf.middleware.ts` | CSRF 토큰 검증 미들웨어 |
| `packages/backend/src/schemas/did.schema.ts` | DID 라우트 입력 검증 스키마 |

---

## 5. 수정 파일 목록

| 파일 | 주요 변경 |
|------|-----------|
| `packages/backend/src/config/index.ts` | Secret 검증, cookie config, JWT 만료 1h |
| `packages/backend/src/index.ts` | Cookie/CSRF 플러그인, CORS 강화, CSP 활성화 |
| `packages/backend/src/middleware/auth.middleware.ts` | JWT 타입 확장, `as any` 제거 |
| `packages/backend/src/controllers/auth.controller.ts` | Cookie 기반 JWT, CSRF, logout, audit |
| `packages/backend/src/controllers/did.controller.ts` | Error sanitization (7곳) |
| `packages/backend/src/controllers/admin.controller.ts` | Error sanitization (4곳), audit |
| `packages/backend/src/routes/auth.routes.ts` | Login rate limit, logout/csrf 엔드포인트 |
| `packages/backend/src/routes/admin.routes.ts` | CSRF 미들웨어 추가 |
| `packages/backend/src/routes/did.routes.ts` | Zod validation, rate limit |
| `packages/backend/src/routes/video.routes.ts` | Path traversal 화이트리스트 |
| `packages/backend/src/routes/internal.routes.ts` | timingSafeEqual, audit |
| `packages/backend/src/services/alpas-real.service.ts` | SSRF guard |
| `packages/backend/src/schemas/auth.schema.ts` | maxLength 추가 |
| `packages/backend/src/schemas/book.schema.ts` | maxLength 추가 |
| `packages/backend/src/schemas/video.schema.ts` | bookId regex 추가 |
| `packages/worker/src/config/index.ts` | Secret 검증 |
| `packages/worker/src/services/storage-local.provider.ts` | Path 화이트리스트 |
| `packages/frontend/src/App.tsx` | ProtectedRoute |
| `packages/frontend/src/stores/authStore.ts` | Cookie 기반, localStorage 제거 |
| `packages/frontend/src/api/client.ts` | withCredentials, CSRF 헤더 |
| `packages/frontend/src/api/auth.api.ts` | logout/csrf/getMe 메서드 |
| `packages/frontend/src/pages/admin/Login.tsx` | 기본 계정 힌트 제거 |
| `packages/frontend/index.html` | CDN SRI |
| `Dockerfile.backend` | Non-root user |
| `Dockerfile.worker` | Non-root user |
| `docker-compose.yml` | Redis 비밀번호, 네트워크 분리, secret 기본값 제거 |
| `nginx.conf` | 보안 헤더 |
| `.env.example` | 필수 항목 표시, COOKIE_SECRET 추가 |

---

## 6. 구현 우선순위

| 순서 | Phase | 설명 | 위험도 |
|------|-------|------|--------|
| 1 | Secret 검증 | Config 기본값 제거, 시작 시 검증 | 설정만 변경 |
| 2 | Error sanitization | 12개 catch 블록 수정 | 단순 교체 |
| 3 | Input validation | Zod 스키마 + Path traversal | 하위 호환 |
| 4 | SSRF + Timing-safe | 내부 API + ALPAS | 백엔드만 |
| 5 | Rate limiting | 엔드포인트별 제한 | 백엔드만 |
| 6 | CSP + CORS + 헤더 | Helmet 재설정 | CSP 튜닝 필요 |
| 7 | **Cookie JWT + CSRF** | **가장 큰 변경** | 프론트+백엔드 동시 배포 필요 |
| 8 | Frontend ProtectedRoute | Phase 7과 함께 | Phase 7에 의존 |
| 9 | Docker hardening | Non-root, Redis 비밀번호 | 인프라 변경 |
| 10 | Dependency update | jest, axios 업데이트 | 테스트 필요 |

---

## 7. 검증 체크리스트

- [ ] Production 모드에서 `JWT_SECRET` 미설정 시 서버 시작 실패
- [ ] 로그인 시 `Set-Cookie: access_token` (HttpOnly; Secure; SameSite=Strict) 확인
- [ ] 응답 body에 `token` 필드 없음
- [ ] `GET /api/auth/me` 쿠키 있을 때 200, 없을 때 401
- [ ] Admin POST에 CSRF 토큰 없으면 403
- [ ] DID 라우트는 인증/CSRF 없이 정상 동작
- [ ] Production 500 에러 시 `error.message` 미노출
- [ ] 로그에 `AUDIT: LOGIN_FAILURE` 이벤트 기록됨
- [ ] `GET /api/did/search?q=&limit=-1` → 400
- [ ] `GET /api/did/search?q=test&limit=999999` → limit 100으로 제한됨
- [ ] `GET /api/videos/../../../etc/passwd` → 400
- [ ] 응답 헤더에 CSP, HSTS, X-Content-Type-Options 존재
- [ ] 키오스크 UI에서 폰트/이미지 정상 로드 (CSP 위반 없음)
- [ ] 로그인 6번째 시도 → 429
- [ ] `ALPAS_API_URL=http://127.0.0.1` (prod) → SSRF 차단
- [ ] Internal API `timingSafeEqual` 사용 확인
- [ ] `/admin/dashboard` 미인증 접근 → `/admin/login` 리다이렉트
- [ ] Docker 컨테이너 `whoami` → `appuser` (root 아님)
- [ ] `npm test` 기존 테스트 통과
