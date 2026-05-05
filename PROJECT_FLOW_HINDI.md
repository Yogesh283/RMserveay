# RAMSERVE Project Guide (Hindi)

Yeh file pure project ka practical flow samjhati hai: kaunsa code kis kaam ka hai, request kahan se kahan jaati hai, aur income/wallet ka data kaise banta hai.

## 1) High-level Architecture

Is project me mainly 2 layers hain:

1. Frontend (React)  
   - File: `resources/js/Application.jsx`  
   - Kaam: browser routes define karta hai (Member area, Publisher area, public pages).

2. Backend (Laravel API)  
   - File: `routes/api.php`  
   - Kaam: API endpoints define karta hai (auth, member dashboard, wallet, surveys, programme, publisher).

Simple flow:
- User UI par click karta hai.
- React `axios` se API call karta hai (`/api/...`).
- Laravel controller request process karta hai.
- Controller models/services se data lekar JSON return karta hai.
- Frontend JSON ko cards/tables/pages me show karta hai.

## 2) Frontend Routing: kaunsa page kahan defined hai

Main route map:
- `/member` shell: `resources/js/member/MemberShell.jsx`
- `/member` dashboard page: `resources/js/member/pages/MemberDashboardPage.jsx`
- `/member/team`: `MemberTeamPage.jsx`
- `/member/programme`: `MemberProgrammePage.jsx`
- `/member/direct-income`: `MemberDirectIncomePage.jsx`
- `/member/level-income`: `MemberLevelIncomePage.jsx`
- `/member/wallet`: `MemberWalletHubPage.jsx`
- `/member/transactions`: `MemberTransactionsPage.jsx`
- `/member/surveys`: `MemberSurveysPage.jsx`

`MemberShell.jsx` ka role:
- Member layout (sidebar, mobile bottom nav, top bar).
- Session user load.
- Language switch ke saath re-render.
- `<Outlet />` me child pages render.

## 3) Backend API Entry Point

File: `routes/api.php`

Important auth-protected member routes:
- `GET /api/member/dashboard/summary` -> `MemberDashboardController@summary`
- `GET /api/member/team/overview` -> `MemberTeamController@overview`
- `GET /api/member/surveys/available` -> `MemberSurveyController@available`
- `POST /api/member/surveys/{id}/responses` -> `MemberSurveyController@submitResponse`
- `GET /api/member/programme/direct-income` -> `MemberProgrammeController@directIncome`
- `GET /api/member/programme/level-income` -> `MemberProgrammeController@levelIncome`
- Wallet group:
  - `GET /api/member/wallet/overview`
  - `GET /api/member/wallet/transactions`
  - `POST /api/member/wallet/deposit`
  - `POST /api/member/wallet/main-to-p2p`
  - `POST /api/member/wallet/p2p-to-main`
  - `POST /api/member/wallet/p2p-transfer`
  - `POST /api/member/wallet/withdraw`

## 4) Dashboard income ka actual logic

Backend file: `app/Http/Controllers/Member/MemberDashboardController.php`

`summary()` method:
- `wallet_transactions` ko user-wise fetch karta hai.
- `type` ke hisab se `SUM(amount)` karta hai.
- Positive totals se income cards banata hai:
  - `direct_income` = `direct_commission`
  - `level_income` = `survey_level_income`
  - `matching_income` = panel/sub-panel/super-sub matching types ka sum
  - `total_from_programme` = programme credit types ka combined sum
- Wallet balances alag se `balancesForApi()` se aate hain.

Important samajh:
- Dashboard income totals = ledger credits ka cumulative sum.
- Current wallet balance = net amount (credits - debits), isliye dono same hona zaroori nahi.

## 5) Wallet system ka core

Backend file: `app/Http/Controllers/Member/MemberWalletController.php`

Major methods:
- `overview()`:
  - main wallet, p2p wallet, recent tx, limits return karta hai.
- `deposit()`:
  - min check + tx hash validation.
  - wallet balance update karta hai.
  - `WalletTransaction::TYPE_DEPOSIT_CREDIT` ledger entry create karta hai.
- `mainToP2p()`:
  - main se amount debit.
  - P2P me amount + bonus credit.
  - transaction type `main_to_p2p`.
- `p2pToMain()`:
  - P2P se debit, main me credit.
- `p2pTransfer()`:
  - ek user ke P2P se dusre user ke P2P me transfer.
- `withdraw()`:
  - validation + fee rules ke according withdrawal debit.

Wallet ka golden rule:
- Har financial action ke saath `wallet_transactions` me row create hoti hai.
- Isi ledger par reporting pages chalti hain.

## 6) Programme module (direct/level/matching/self-survey)

Backend file: `app/Http/Controllers/Member/MemberProgrammeController.php`

Key endpoints:
- `directIncome()`:
  - direct income eligibility + rate + requirements return karta hai.
- `levelIncome()`:
  - `SurveyLevelIncomeService` ka status return.
- `panelMatching()`, `subPanelMatching()`, `superSubPanelMatching()`:
  - respective service status return.
- `show()`:
  - self survey programme ka overview (fees, breakdown, limits).
- `payActivation()`, `payMinimumPanel()`:
  - required fee debit + user flags update.
- `addSubPanel()`, `addSuperSubPanel()`:
  - panel fee debit + panel count increment + matching process trigger.
- `completeSurvey()`:
  - self survey credit flow trigger.

## 7) Survey flow (member side)

Backend file: `app/Http/Controllers/Member/MemberSurveyController.php`

Flow:
- `available()`:
  - active surveys laata hai jo member complete nahi kar chuka.
  - member tier eligibility check karta hai.
- `submitResponse()`:
  - survey active/eligible validation.
  - answers validation.
  - response save.
  - reward process service ko handoff.
- `completed()`:
  - member ke completed surveys + payout status details return.

## 8) Ledger model: transaction types ka source of truth

File: `app/Models/WalletTransaction.php`

Important constants:
- `survey_credit`
- `direct_commission`
- `panel_matching`
- `sub_panel_matching`
- `super_sub_panel_matching`
- `survey_level_income`
- `deposit_credit`
- `p2p_transfer_in`, `p2p_transfer_out`
- `main_to_p2p`, `p2p_to_main`
- `withdrawal`
- plan/panel fee related types

Ye constants define karte hain ki kaunsa transaction kis category me count hoga.

## 9) Member dashboard UI backend se data kaise leta hai

Frontend file: `resources/js/member/pages/MemberDashboardPage.jsx`

`load()` function me 3 APIs parallel call hoti hain:
- `GET /api/user`
- `GET /api/member/dashboard/summary`
- `GET /api/member/wallet/overview`

Phir UI cards banate waqt:
- Earnings cards -> `summary.earnings_summary_usd`
- Wallet cards -> `overview.wallet_balance`, `overview.p2p_wallet_balance`
- Recent transaction detail formatting -> shared util (`formatTransactionDetailRow`)

## 10) End-to-end example: "Survey complete hua"

1. Member survey submit karta hai (`MemberSurveyController@submitResponse`).
2. Reward/matching related service trigger hoti hai.
3. `wallet_transactions` me credit entries banti hain (type ke saath).
4. Dashboard open karne par `MemberDashboardController@summary` un entries ka sum karta hai.
5. `MemberDashboardPage.jsx` updated totals show karta hai.

## 11) End-to-end example: "Main to P2P transfer"

1. Member internal transfer page se request bhejta hai.
2. `MemberWalletController@mainToP2p` password + balance validate karta hai.
3. Main wallet se debit, P2P me credit (+bonus config ke hisaab se).
4. Ledger me `main_to_p2p` transaction store.
5. Wallet overview aur transaction page me updated numbers show.

## 12) Debug karte waqt sabse pehle kya dekhna chahiye

Agar income/amount mismatch lage, check order:
1. `routes/api.php` route sahi hit ho raha hai?
2. Concerned controller method me expected logic chal raha hai?
3. `wallet_transactions` me expected `type` + `amount` entry bani?
4. Frontend correct field read kar raha hai (`summary` vs `overview`)?
5. Kya value cumulative chahiye thi ya current balance?

---

Aap is file ko quick reference ki tarah use kar sakte ho jab bhi poochna ho: "ye number kahan se aa raha hai?"
