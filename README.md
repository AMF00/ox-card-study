# OX 카드 학습

과목별 OX 카드덱을 만들고 반복 학습하는 정적 웹앱입니다. 서버와 로그인 없이 브라우저의 `localStorage`에 학습 데이터를 저장합니다.

## 휴대폰에서 쓰는 방법

1. GitHub 저장소에 이 폴더의 파일을 올립니다.
2. 저장소의 `Settings > Pages`에서 `GitHub Actions` 배포를 선택합니다.
3. `main` 브랜치에 푸시하면 `.github/workflows/pages.yml`이 정적 사이트를 배포합니다.
4. 배포가 끝난 뒤 `https://<계정>.github.io/<저장소>/` 주소를 휴대폰 브라우저에서 엽니다.
5. iPhone은 Safari 공유 메뉴에서 `홈 화면에 추가`, Android는 Chrome 메뉴에서 `홈 화면에 추가`를 선택합니다.

## 데이터 이동

- PC와 휴대폰의 저장소는 서로 자동 동기화되지 않습니다.
- PC에서 만든 과목 카드덱은 앱의 `JSON 내보내기`로 저장한 뒤, 휴대폰에서 `JSON 가져오기`로 옮기세요.
- 과목별 백업은 JSON 파일로 보관하는 것을 권장합니다.

## CSV 형식

CSV를 가져올 때는 아래 헤더를 사용합니다.

```csv
prompt,answer,explanation,tags
```

- `answer`는 `O`, `X`, `true`, `false`, `맞음`, `틀림`을 사용할 수 있습니다.
- `tags`에는 단원, 시험범위, 주제, 난이도를 `;` 또는 `,`로 구분해 넣을 수 있습니다.
