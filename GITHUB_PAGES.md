# 학생용 GitHub Pages 배포 안내

이 안내는 `csh20262026/rational-function-lab` 저장소의 `main` 브랜치 최상위에서 배포하는 방법입니다. **ZIP을 저장소에 그대로 올리는 것은 배포가 아닙니다. 먼저 압축을 풀어 파일을 올리세요.**

## 1. 최신 파일을 GitHub에 올리기

1. 준비된 `rational-function-lab-github-pages.zip`을 컴퓨터에 내려받고 압축을 풉니다.
2. GitHub에 로그인한 뒤 다음 저장소를 엽니다.
   https://github.com/csh20262026/rational-function-lab
3. 위쪽의 **Code** 탭을 누릅니다. 파일 목록 왼쪽 위 브랜치 선택이 **main**인지 확인합니다.
4. 파일 목록 오른쪽 위의 **Add file → Upload files**를 누릅니다. 화면 폭에 따라 `Add file`이 `+` 아이콘이나 추가 메뉴 안에 보일 수 있습니다.
5. 압축을 푼 **파일과 폴더 자체**를 업로드 영역에 드래그합니다. ZIP 파일이나 그 파일들을 감싼 상위 폴더를 올리지 마세요. `index.html`이 저장소 최상위에 바로 있어야 합니다.
6. 업로드 목록에 아래 파일과 폴더가 있는지 확인합니다.

```text
index.html
style.css
app.js
math.js
progress.js
submission.js
SUBMISSION_SETUP.md
README.md
GITHUB_PAGES.md
tools/
  build.py
  index.template.html
tests/
  browser.test.cjs
  lab-checks.cjs
  math.test.cjs
  progress.test.cjs
  completion.test.cjs
  mission-layout.test.cjs
  preview.test.cjs
  visual.test.cjs
```

7. 아래 커밋 메시지 입력칸에 `Publish rational function lab project files` 등을 입력합니다.
8. **Commit directly to the main branch**를 선택하고 초록색 **Commit changes** 버튼을 누릅니다. 별도 확인창이 열리면 같은 선택을 확인합니다.
9. 보호된 브랜치여서 직접 커밋할 수 없다면 **Create a new branch…**로 올린 뒤 **Create pull request → Merge pull request → Confirm merge** 순서로 main에 합칩니다. 이 경우 저장소의 쓰기·병합 권한이 필요합니다.
10. **Code** 화면에서 main을 선택하고 최상위에 `index.html`이 보이는지 확인합니다.

`index.html` 하나만으로 웹앱이 실행됩니다. CSS·JavaScript 원본과 tools·tests는 이후 교사가 유지보수하고 재검증하기 위해 함께 올립니다. 별도 이미지·폰트 파일·수식 라이브러리·node_modules는 필요하지 않습니다.

## 2. GitHub Pages 켜기

1. 저장소 위쪽 메뉴의 **Settings**를 누릅니다. 보이지 않으면 `…` 메뉴도 확인하세요. Settings가 없으면 저장소 관리 권한이 필요합니다.
2. 왼쪽 메뉴 **Code and automation → Pages**를 누릅니다.
3. **Build and deployment → Source**에서 **Deploy from a branch**를 선택합니다.
4. **Branch**에서 **main**을 선택합니다.
5. 옆 폴더 선택을 **/(root)**로 두고 **Save**를 누릅니다.
6. 저장소의 **Actions** 탭에서 **pages build and deployment**가 완료되어 초록색 체크가 나오는지 확인합니다.
7. 다시 **Settings → Pages**로 돌아와 표시되는 **Visit site**를 누릅니다.

정상 배포된 경우 예상 주소는 다음과 같습니다. 실제 주소는 Pages 화면의 안내를 우선하세요.

https://csh20262026.github.io/rational-function-lab/

이 주소는 **배포 예상 주소**이며 준비 작업만으로 공개된 것은 아닙니다. 별도 도메인·비밀 키·서버 설정은 필요 없습니다. 저장소 공개 여부와 GitHub 요금제에 따라 Pages 사용 가능 여부가 달라질 수 있습니다.

## 3. 학생에게 공유하기 전 확인

- 첫 화면에 세로 분수 `y = 2/x`, 그래프, a·p·q 슬라이더가 보이는지 확인합니다.
- 활동 1~3의 객관식 답 선택·정답 확인과 점근선 표시를 확인합니다.
- 활동 4에서 미션 카드가 그래프 위에 있는지 확인합니다.
- 미션 1은 a=2, p=−2, q=3, 미션 2는 a=−2, p=1, q=−2, 미션 3은 a=−6, p=−1, q=2로 성공하는지 확인합니다.
- 미션 해제, 1초 성공 알림, 다음 미션 버튼과 처음부터 다시 도전을 확인합니다.
- 태블릿에서 버튼과 수식이 잘리지 않는지 확인한 뒤 배포 주소를 학생에게 공유합니다.

404가 보이면 main 최상위에 `index.html`이 있는지, Pages가 main의 /(root)를 사용하는지, Actions 배포가 끝났는지 먼저 확인하세요. 이전 화면이 보이면 Actions 완료 후 브라우저를 새로고침하세요.

## 4. 이후 수정하기

`tools/index.template.html`, `style.css`, `app.js`, `math.js`를 수정한 경우 프로젝트 폴더에서 아래 명령으로 실행 파일도 갱신합니다.

```sh
python3 tools/build.py
python3 tools/build.py --check
```

Windows에서는 `python3` 대신 `py`를 사용할 수 있습니다. 바뀐 원본과 생성된 `index.html`을 같은 방식으로 main에 올리면 다시 배포됩니다. GitHub Pages에서 빌드 도구를 따로 실행할 필요는 없습니다.

완성 HTML 안에는 절대 경로로 된 CSS·JavaScript 주소가 없으므로 `/rational-function-lab/` 하위 경로에서도 작동합니다. 코드의 `http://www.w3.org/2000/svg`는 SVG 연결선의 네임스페이스 이름이며 네트워크로 라이브러리를 받는 주소가 아닙니다. Preview 파일이 아닌 최상위 `index.html`을 배포하세요.

현재 버전의 제목은 **유리함수 그래프 탐구 초당LAB**입니다. 갱신 시 `progress.js`, `submission.js`와 생성된 `index.html`도 함께 반영하세요. Apps Script 제출 화면 URL은 비어 있습니다. submission.js의 config.url에 실제 /exec URL을 넣고 실행 HTML을 다시 생성하면 iframe 또는 새 탭으로 연결합니다. 학습 기록은 브라우저에 저장하고 학번·이름은 저장하지 않습니다. 자세한 내용은 [SUBMISSION_SETUP.md](SUBMISSION_SETUP.md)를 참고하세요.
