# 라그릴리아 메뉴북 중앙 DB 연결 (회사 계정)

## 준비된 소스
- `backend/Code.gs`: 구글 시트 메뉴/옵션 저장, 이미지 Drive 저장, 관리자 인증, 공개 읽기 API
- `backend/Admin.html`: 서버형 관리자 화면 (메뉴 신규·수정, 옵션 그룹, 옵션별 이미지)
- 기존 GitHub Pages 고객 주소는 변경하지 않음

## 회사 Gmail 계정에서 최초 1회
1. 회사 계정에서 [메뉴북](https://docs.google.com/spreadsheets/d/1_e-pykxxQZQx9RecVSJuecst7Uqmq98fGHc5yqB4m6A/edit) 열기.
2. 확장 프로그램 → Apps Script.
3. 기본 `Code.gs`를 본 저장소의 `backend/Code.gs` 내용으로 교체.
4. Apps Script에서 + → HTML 파일 추가 → 이름 `Admin` 입력 → `backend/Admin.html` 코드 붙여넣기.
5. 회사 Google Drive에 전용 `메뉴북_공개이미지` 폴더 생성, 폴더 URL에서 ID 확인.
6. Apps Script 왼쪽 프로젝트 설정 → 스크립트 속성에 `ADMIN_PIN` 과 `IMAGE_FOLDER_ID` 등록. 비밀번호는 GitHub 코드에 절대 입력하지 않음. 테스트 PIN 1234는 매우 약하므로 점포 운영 전 교체.
7. Apps Script 배포 → 새 배포 → 웹 앱 → 실행: 나 → 액세스: 모든 사용자. 승인 후 `/exec` 주소 확인.
8. `.../exec?page=admin` 을 열어 로그인 → 메뉴 수정 → 최종 등록 → 시트 반영 확인.
9. 저장된 이미지가 별도 비로그인 휴대폰에서 열리는지 테스트.

## 고객 메뉴북 동기화
배포 URL을 확보한 후 GitHub 고객 웹앱의 공개 읽기 API를 설정해야 합니다. 이 작업 전에는 고객 메뉴북에 변경 내용이 자동 표시되지 않습니다.
공개 API는 **메뉴·가격·설명·이미지 URL**만 응답해야 하며 관리자 PIN, 연락처, 주문 데이터는 노출하지 않습니다.

## 주의
- `Code.gs` 는 기존 원본 시트(티본 등)를 변경하지 않으며 메뉴_DB/옵션그룹_DB/옵션항목_DB를 사용합니다.
- 공유 이미지 기능은 구글 드라이브의 공개 이미지 표시 정책에 따라 교차 브라우저 테스트 필요.
- 이 코드는 초기 서버 초안입니다. 실사용 전 로그인, 중복저장, 고객 공개 이미지와 다중 옵션을 반드시 검증해야 합니다.
