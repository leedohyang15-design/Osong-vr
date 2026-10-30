# 별이 빛나는 밤에 — 오송호수공원 천체관측회 VR

2026년 11월 1일 저녁 오송호수공원(북위 36.64°, 동경 127.33°) 하늘을 휴대폰 VR로 보여 주는 웹 페이지예요.
진행자 노트북의 QR로 참여자들이 접속하고, 진행자가 장면을 넘기면 모든 휴대폰이 같은 장면으로 넘어가요.

| 주소 | 누가 | 하는 일 |
| --- | --- | --- |
| `index.html` | 참여자 휴대폰 | VR(카드보드) / 화면 모드로 하늘 보기. 별자리를 1.5초 바라보면 별자리 그림이 나타나고 설명이 자동으로 흘러가요. |
| `host.html` | 진행자 노트북 | 접속 QR, 접속 인원, 장면 넘기기, 장면별 대본과 참여 질문, 참여자 화면 미리보기 |
| `server/` | 인터넷 | 진행자 → 휴대폰 동기화 중계 서버 (Render 무료) |

## 처음 한 번: 배포

### 1. 사이트 (GitHub Pages)
저장소 **Settings → Pages**에서 브랜치 `main`, 폴더 `/ (root)`. 휴대폰 기울기 센서는 HTTPS에서만 동작해요.

### 2. 동기화 서버 (Render)
휴대폰끼리 직접 연결하는 방식은 LTE에서 막혀서, 작은 중계 서버를 둬요.

1. https://render.com 에 GitHub 계정으로 가입
2. **New + → Blueprint** → 이 저장소 선택 → `render.yaml`이 읽히면 **Apply** (서비스 이름 `osong-vr-sync`, Free)
3. 배포가 끝나면 주소가 `https://osong-vr-sync.onrender.com` 처럼 나와요.
   이름이 다르면 `js/config.js`의 `SYNC_URL`을 `wss://<그 주소>`로 바꿔 커밋해 주세요.

무료 서버는 15분 동안 아무도 안 쓰면 잠들어요. **관측회 시작 몇 분 전에 진행자 화면을 먼저 열어 두면** 서버가 깨어나요(처음엔 최대 1분).

## 관측회 당일

1. 노트북에서 `https://<아이디>.github.io/Osong-vr/host.html` → "준비됐어요"가 뜨는지 확인
2. `Q` 키로 QR을 크게 띄워 참여자 접속 → "명 접속 중" 숫자 확인
3. **시작** → 장면마다 짧은 연출(5~17초)이 끝나면 화면이 멈춰 기다려요. 대본과 "참여" 질문을 보며 이야기하고, `→`/스페이스로 다음 장면
- 노트북·휴대폰 모두 인터넷 필요(LTE 가능). 진행자 화면은 한 창만 열어 두세요(같은 방을 다른 노트북이 쓰면 거부돼요).
- 쇼 중 VR 화면은 하늘이 천천히 돌아 대상이 정면에 오고, 화면 모드는 카메라가 자동으로 움직여요.
- 관측할 때는 메뉴의 **야간 적색 모드**를 켜 두면 눈의 암적응이 덜 깨져요.

## 쇼 고치기·추가하기
`js/shows.js`의 `SHOWS`. 장면마다 `view`(끝나는 시점), `move`, `fx`(연출: `timelapse`, `lightsOut`, `labels`, `lines`, `art`, `trails`, `pointer`, `eyepiece`), `title`/`sub`(휴대폰 자막), `cue`(참여 질문), `note`(진행자 대본). 형식은 파일 맨 위 주석에 있어요.

## 로컬에서 시험하기
```
cd server && npm install && node server.js        # ws://localhost:8080
python3 -m http.server 8000                       # 다른 터미널, 저장소 루트에서
```
`http://localhost:8000/host.html?sync=ws://localhost:8080` 을 열면 QR 주소에도 `sync`가 붙어요.
`index.html?vrtest` 는 센서 없는 컴퓨터에서도 VR 화면으로 들어가게 해 줘요.

## 파일
```
index.html, host.html   페이지
css/                    디자인
js/config.js            동기화 서버 주소
js/sky-data.js          별 5,044개, 별자리 선, 은하수, 행성 위치 (2026-11-01 18:00–21:30 KST)
js/engine.js            하늘 그리기 (VR 양안 + 렌즈 보정, 은하수, 지평선, 라벨, 별자리 그림, 쇼 연출)
js/figures-data.js      별자리 그림 85개의 기준 별 좌표 (tools/build-figures.js로 생성)
assets/figures/         별자리 그림 (Johan Meuris / Stellarium, Free Art License)
assets/saturn.webp      토성 사진 (허블, 고리가 옆으로 누운 2009년)
assets/milkyway_4k.jpg  은하수 사진 지도 (NASA SVS Deep Star Maps 2020), js/skygl.js가 WebGL로 그림
js/content.js           별자리·별·행성 설명
js/shows.js             쇼 대본과 장면 계산
js/sync.js, server/     동기화 (서버 시계 기준, 자동 재연결)
js/app.js, js/host.js   참여자 / 진행자 화면 동작
vendor/qrcode.js        qrcode-generator 1.4.4 (MIT)
```

## 출처
- 별자리 그림: Johan Meuris, Stellarium western sky culture — Free Art License
- 은하수 사진 지도: NASA/Goddard Space Flight Center Scientific Visualization Studio, Deep Star Maps 2020 (Gaia DR2: ESA/Gaia/DPAC) — `tools/build-milkyway.py`로 변환, WebGL이 없으면 윤곽 데이터로 대신 그려요
- 토성 사진: NASA, ESA and the Hubble Heritage Team (STScI/AURA), 2009 — CC BY 4.0, `tools/build-saturn.py`로 배경을 투명하게 변환
- 별·별자리 선·은하수 윤곽: d3-celestial (Olaf Frohn, BSD-3-Clause)
- 행성 위치: astronomy-engine으로 계산
