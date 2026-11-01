# Company menu backend

- Company account: parisfood012@gmail.com
- Bound spreadsheet: 1_e-pykxxQZQx9RecVSJuecst7Uqmq98fGHc5yqB4m6A
- Script project: 1GMPLKnxYUhJGZbkLHUMwVFpUhNdteb6oLb4d2qkXz3eCbbl_GYvN-ymS
- Deployment version: 3 (2026-11-01)
- Endpoint: https://script.google.com/macros/s/AKfycbycYRZyQo36lFSunl9xnM4Oc1dKFIim3xnDz8sNQ0xd92KvzC5ZCLvs3cpypOb6BbSE/exec
- Images folder: 1mMG1qmVQtdn900c_UBkwymARaH61qUXC
- Original DB tabs copied to 원본백업_메뉴_DB, 원본백업_옵션그룹_DB, 원본백업_옵션항목_DB before missing ribeye ID and option repair.

ADMIN_PIN must be set by the owner in Script Properties (no minimum length; empty passwords are rejected). Never put its value in this repository. IMAGE_FOLDER_ID and INITIAL_BACKUP_DONE are initialized. Setup rejects repeated execution. Authentication fails closed if ADMIN_PIN is absent.

Customer URL is unchanged. backend-config.json points to the company deployment. Public catalog fetch and V13 T-bone option selection were verified in the browser. Administrator entry redirects to the company Apps Script login.

Pending live verification after owner sets ADMIN_PIN: administrator sign-in; actual menu and option image uploads to Drive; actual menu save and Sheets readback; a second browser/device displaying the saved content. Unit checks passed for auth rejection, multiple isolated option groups, stale revision detection, input validation, rollback, logout, escaped customer rendering, min/max selection and extra pricing.

Edit/deploy future Apps Script versions through Manage deployments to preserve its endpoint. Never create a replacement customer site URL.

## Version 3

Added 원산지 and 알레르기정보 columns Q:R without replacing original data or backup tabs. Origin appears below the menu title in #999; allergen data appears below the description with an automatic heading. Existing allergen suffixes in descriptions are parsed for compatibility. Administrator can copy an existing menu option group (including image URLs, extra prices, duplicate-selection flag and min/max limits); saving creates independent group identities.

Validated syntax, backend new-field serialization/save logic, client escaped rendering, option copy isolation, legacy allergen extraction, deployed public API response, deployed admin input presence and mobile origin placement/color. Actual image storage/display was confirmed by the owner during use. Kept the original customer URL and Apps Script deployment ID. Fixed mobile detail flex shrink and list grid wrapper width; new opens reset modal scroll. Exact-name central menus replace legacy prototype duplicates.
