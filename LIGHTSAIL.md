# 꿈틀매쓰 Lightsail 배포 가이드

꿈틀매쓰는 운영에서 컨테이너 2개를 사용한다.

- `ggm-api`: NestJS API + Prisma + 정적 이미지(`/static`)
- `ggm-dkt`: FastAPI DKT 추론 서버

외부 HTTPS 트래픽은 Caddy가 `ggm-api:3000`으로만 전달한다. `ggm-dkt`는 외부에 공개하지 않고 Docker 네트워크 내부에서 `http://ggm-dkt:8000`으로만 호출한다.

## 서버 clone

```bash
cd ~/apps/projects
git clone https://github.com/hyson0807/ggumteul_math_server.git ggm-api
git clone https://github.com/hyson0807/ggumteul_math_dkt.git ggm-dkt
```

## NestJS 환경변수

`~/apps/projects/ggm-api/.env`

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DB?sslmode=require"

JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=

CORS_ORIGIN=

GOOGLE_CLIENT_ID=
GOOGLE_IOS_CLIENT_ID=
GOOGLE_ANDROID_CLIENT_ID=
APPLE_BUNDLE_ID=

APP_MINIMUM_VERSION=1.0.0
APP_STORE_URL_IOS=
APP_STORE_URL_ANDROID=

DKT_BASE_URL=http://ggm-dkt:8000
DKT_TIMEOUT_MS=10000

PORT=3000
NODE_ENV=production
RUN_MIGRATIONS=true
```

## DKT 환경변수

`~/apps/projects/ggm-dkt/.env`

```bash
PORT=8000
MODEL_PATH=./data/model.pb
MAPPING_PATH=./data/knowledgeTag_skillID.txt
```

## docker-compose.yml 서비스 추가

`~/apps/docker-compose.yml`의 `services:` 아래에 추가한다.

```yaml
  ggm-dkt:
    build:
      context: ./projects/ggm-dkt
      dockerfile: Dockerfile
    image: ggm-dkt:latest
    container_name: ggm-dkt
    restart: unless-stopped
    env_file:
      - path: ./projects/ggm-dkt/.env
        required: false
    environment:
      PORT: 8000
    expose:
      - "8000"
    networks:
      - hyson-network
    healthcheck:
      test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=3).read()"]
      interval: 30s
      timeout: 5s
      retries: 5
      start_period: 60s

  ggm-api:
    build:
      context: ./projects/ggm-api
      dockerfile: Dockerfile
    image: ggm-api:latest
    container_name: ggm-api
    restart: unless-stopped
    depends_on:
      ggm-dkt:
        condition: service_healthy
    env_file:
      - path: ./projects/ggm-api/.env
        required: false
    environment:
      NODE_ENV: production
      PORT: 3000
      DKT_BASE_URL: http://ggm-dkt:8000
    expose:
      - "3000"
    networks:
      - hyson-network
    healthcheck:
      test: ["CMD", "node", "-e", "require('net').connect(3000,'127.0.0.1').on('connect',()=>process.exit(0)).on('error',()=>process.exit(1))"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 40s
```

## Caddyfile

`~/apps/caddy/Caddyfile`

```caddy
api.ggm.hyson.kr {
    reverse_proxy ggm-api:3000
}
```

DKT 서버는 Caddy에 연결하지 않는다.

## 배포

```bash
cd ~/apps
docker compose up -d --build ggm-dkt ggm-api
docker compose restart caddy
```

## 확인

```bash
docker compose ps
docker compose logs -f ggm-dkt
docker compose logs -f ggm-api

curl -I https://api.ggm.hyson.kr
```

DKT 컨테이너 내부에서 헬스체크를 확인하려면:

```bash
docker compose exec ggm-dkt python -c "import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:8000/health').read().decode())"
```

API 컨테이너에서 DKT 네트워크 연결을 확인하려면:

```bash
docker compose exec ggm-api node -e "fetch('http://ggm-dkt:8000/health').then(r=>r.text()).then(console.log)"
```

## 앱 설정

Expo/EAS production 환경의 API 주소를 새 도메인으로 바꾼다.

```bash
EXPO_PUBLIC_API_URL=https://api.ggm.hyson.kr
```

이미 배포된 앱이 Railway URL을 바라보고 있다면 EAS Update 또는 새 빌드가 필요하다.
