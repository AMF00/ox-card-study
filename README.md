# 학습 카드

과목별 학습 카드를 만들고 반복 학습하는 정적 웹앱입니다. 서버와 로그인 없이 브라우저 `localStorage`에 학습 데이터가 저장됩니다.

기본 카드는 앞면을 보고 뒷면 내용을 떠올린 뒤 `기억함` 또는 `다시 보기`로 직접 채점하는 상기 카드입니다. 기존 OX 카드도 함께 사용할 수 있습니다.

## 로컬 실행

`index.html`을 브라우저에서 직접 열면 실행됩니다.

정적 서버로 확인하려면 아래 명령을 사용할 수 있습니다.

```powershell
node .\serve-static.mjs --port 8080
```

## 휴대폰에서 여는 방법

### 고정 링크: GitHub Pages

1. GitHub CLI를 설치하고 `gh auth login`으로 로그인합니다. 또는 `GITHUB_TOKEN` 환경변수를 설정합니다.
2. 이 폴더에서 `.\publish-github-pages.ps1`을 실행합니다.
3. 스크립트가 저장소 생성, 푸시, GitHub Pages 활성화를 시도합니다.
4. 배포가 끝난 뒤 `https://<계정>.github.io/<저장소>/` 주소를 휴대폰 브라우저에서 엽니다.
5. iPhone은 Safari 공유 메뉴에서 `홈 화면에 추가`, Android는 Chrome 메뉴에서 `홈 화면에 추가`를 선택합니다.

기본 저장소 이름은 `ox-card-study`입니다. 다른 이름을 쓰려면 아래처럼 실행합니다.

```powershell
.\publish-github-pages.ps1 -RepoName my-study-cards
```

### 임시 링크: PC 터널

GitHub 배포 전 임시 확인용 HTTPS 링크가 필요하면 아래 명령을 사용할 수 있습니다.

```powershell
.\start-phone-link.ps1
```

생성된 주소는 `PHONE_LINK.txt`에도 저장됩니다. 이 방식은 PC, 로컬 서버, 터널 연결이 켜져 있는 동안만 동작하며 주소가 바뀔 수 있습니다.

```powershell
.\stop-phone-link.ps1
```

터널이 재연결되면서 주소가 바뀐 경우에는 아래 명령으로 `PHONE_LINK.txt`를 최신 주소로 갱신합니다.

```powershell
.\refresh-phone-link.ps1
```

### 1시간 링크: Netlify Drop

GitHub 로그인 없이 임시 공개 링크가 필요하면 Netlify Drop 배포 스크립트를 사용할 수 있습니다.

```powershell
.\publish-netlify-drop.ps1
```

## 데이터 이동

- PC와 휴대폰은 자동 동기화되지 않습니다.
- PC에서 만든 과목 카드덱은 `JSON 내보내기`로 저장한 뒤 휴대폰에서 `JSON 가져오기`로 옮깁니다.
- 과목별 백업은 JSON 파일로 보관하는 것을 권장합니다.

## 카드 형식

JSON 카드덱은 아래 필드를 사용합니다.

```json
{
  "title": "한국사",
  "cards": [
    {
      "type": "recall",
      "prompt": "조선을 건국한 인물과 건국 연도는?",
      "back": "이성계, 1392년",
      "explanation": "태조 이성계로도 기억합니다.",
      "tags": ["조선", "암기필수"]
    }
  ]
}
```

`type`은 `recall` 또는 `ox`를 사용합니다. 예전 OX 데이터처럼 `type`이 없고 `answer`가 O/X이면 자동으로 OX 카드로 읽습니다.

## CSV 형식

상기 카드와 OX 카드를 함께 쓰려면 아래 헤더를 사용합니다.

```csv
type,prompt,answer,back,explanation,tags
recall,조선을 건국한 인물과 건국 연도는?,,이성계가 1392년에 조선을 건국했습니다.,태조 이성계로도 기억합니다.,조선;암기필수
ox,물은 표준 기압에서 100도에 끓는다.,O,,표준 기압 1기압 기준입니다.,과학;기초
```

- 상기 카드는 `type=recall`, `prompt`, `back`을 사용합니다.
- OX 카드는 `type=ox`, `prompt`, `answer`를 사용합니다.
- `answer`는 `O`, `X`, `true`, `false`, `맞음`, `틀림`을 사용할 수 있습니다.
- `tags`에는 단원, 시험범위, 주제, 난이도를 `;` 또는 `,`로 구분해 넣을 수 있습니다.
- 예전 CSV인 `prompt,answer,explanation,tags`도 계속 가져올 수 있습니다.
