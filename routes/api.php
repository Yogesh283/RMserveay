<?php

use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Auth\ForgotPasswordController;
use App\Http\Controllers\Auth\OtpController;
use App\Http\Controllers\Auth\RegisteredUserController;
use App\Http\Controllers\Auth\RegisterLoginUidController;
use App\Http\Controllers\Member\MemberBinaryClosingController;
use App\Http\Controllers\Member\MemberDashboardController;
use App\Http\Controllers\Member\MemberPlanController;
use App\Http\Controllers\Member\MemberProfileController;
use App\Http\Controllers\Member\MemberProgrammeController;
use App\Http\Controllers\Member\MemberSurveyController;
use App\Http\Controllers\Member\MemberTeamController;
use App\Http\Controllers\Member\MemberSupportTicketController;
use App\Http\Controllers\Member\MemberNowPaymentsController;
use App\Http\Controllers\Member\MemberWalletController;
use App\Http\Controllers\Payments\NowPaymentsIpnController;
use App\Http\Controllers\Publisher\PublisherAnalyticsController;
use App\Http\Controllers\Publisher\PublisherAudienceController;
use App\Http\Controllers\Publisher\PublisherDashboardController;
use App\Http\Controllers\Publisher\PublisherEarningsController;
use App\Http\Controllers\Publisher\PublisherNotificationsController;
use App\Http\Controllers\Publisher\PublisherSurveyController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/auth/config', fn () => response()->json([
    'otp_bypass' => (bool) config('otp.bypass'),
]));

Route::post('/otp/send', [OtpController::class, 'send']);
Route::get('/register/login-uid/check', [RegisterLoginUidController::class, 'check'])->middleware('throttle:45,1');
Route::post('/register', [RegisteredUserController::class, 'store']);
Route::post('/forgot-password/reset', [ForgotPasswordController::class, 'reset'])->middleware('throttle:10,1');
Route::post('/login', [AuthenticatedSessionController::class, 'store']);
Route::post('/login/otp', [AuthenticatedSessionController::class, 'storeOtp']);

Route::get('/surveys/public/{id}', [PublisherSurveyController::class, 'publicShow']);
Route::post('/surveys/public/{id}/responses', [PublisherSurveyController::class, 'submitResponse'])
    ->middleware('throttle:60,1');

Route::post('/payments/nowpayments/ipn', NowPaymentsIpnController::class)
    ->middleware('throttle:120,1');

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthenticatedSessionController::class, 'destroy']);
    Route::get('/user', function (Request $request) {
        $user = $request->user();
        if ($user !== null) {
            $user->loadMissing('sponsor');
        }

        return response()->json(['user' => $user?->toApiArray()]);
    });
    Route::patch('/user', [MemberProfileController::class, 'update']);
    Route::post('/member/profile/email-change-otp', [MemberProfileController::class, 'sendEmailChangeOtp'])->middleware('throttle:10,1');
    Route::post('/member/profile/phone-change-otp', [MemberProfileController::class, 'sendPhoneChangeOtp'])->middleware('throttle:10,1');
    Route::post('/member/profile/password-change-otp', [MemberProfileController::class, 'sendPasswordChangeOtp'])->middleware('throttle:10,1');

    Route::get('/member/dashboard/summary', [MemberDashboardController::class, 'summary']);

    Route::get('/member/team/overview', [MemberTeamController::class, 'overview']);
    Route::get('/member/team/binary-tree', [MemberTeamController::class, 'binaryTree']);

    Route::get('/member/surveys/available', [MemberSurveyController::class, 'available']);
    Route::get('/member/surveys/completed', [MemberSurveyController::class, 'completed']);
    Route::get('/member/surveys/{id}', [MemberSurveyController::class, 'show'])->whereNumber('id');
    Route::post('/member/surveys/{id}/responses', [MemberSurveyController::class, 'submitResponse'])
        ->whereNumber('id')
        ->middleware('throttle:60,1');

    Route::get('/member/plans', [MemberPlanController::class, 'index']);
    Route::post('/member/plans/purchase', [MemberPlanController::class, 'purchase'])->middleware('throttle:20,1');

    Route::get('/member/programme/direct-income', [MemberProgrammeController::class, 'directIncome']);
    Route::get('/member/programme/active-panel-matching', [MemberProgrammeController::class, 'activePanelMatching']);
    Route::get('/member/programme/panel-matching', [MemberProgrammeController::class, 'panelMatching']);
    Route::get('/member/programme/sub-panel-matching', [MemberProgrammeController::class, 'subPanelMatching']);
    Route::get('/member/programme/super-sub-panel-matching', [MemberProgrammeController::class, 'superSubPanelMatching']);
    Route::get('/member/programme/level-income', [MemberProgrammeController::class, 'levelIncome']);
    Route::get('/member/programme/level-income/transactions', [MemberProgrammeController::class, 'levelIncomeTransactions']);
    Route::get('/member/programme/binary-closings', [MemberBinaryClosingController::class, 'index']);
    Route::get('/member/support-tickets', [MemberSupportTicketController::class, 'index']);
    Route::post('/member/support-tickets', [MemberSupportTicketController::class, 'store'])->middleware('throttle:20,1');

    Route::prefix('member/wallet')->group(function () {
        Route::get('/transactions', [MemberWalletController::class, 'transactions']);
        Route::get('/overview', [MemberWalletController::class, 'overview']);
        Route::get('/deposit-info', [MemberWalletController::class, 'depositInfo']);
        Route::post('/deposit', [MemberWalletController::class, 'deposit'])->middleware('throttle:20,1');
        Route::post('/nowpayments/payment', [MemberNowPaymentsController::class, 'create'])->middleware('throttle:15,1');
        Route::get('/nowpayments/{paymentId}', [MemberNowPaymentsController::class, 'show'])->middleware('throttle:60,1');
        Route::post('/main-to-p2p', [MemberWalletController::class, 'mainToP2p'])->middleware('throttle:30,1');
        Route::post('/p2p-to-main', [MemberWalletController::class, 'p2pToMain'])->middleware('throttle:30,1');
        Route::get('/p2p-recipient-lookup', [MemberWalletController::class, 'p2pRecipientLookup'])->middleware('throttle:60,1');
        Route::post('/p2p-transfer', [MemberWalletController::class, 'p2pTransfer'])->middleware('throttle:30,1');
        Route::post('/withdraw/otp', [MemberWalletController::class, 'sendWithdrawOtp'])->middleware('throttle:10,1');
        Route::post('/withdraw', [MemberWalletController::class, 'withdraw'])->middleware('throttle:15,1');
    });

    Route::prefix('member/programme/self-survey')->group(function () {
        Route::get('/', [MemberProgrammeController::class, 'show']);
        Route::post('/pay-activation', [MemberProgrammeController::class, 'payActivation']);
        Route::post('/pay-minimum-panel', [MemberProgrammeController::class, 'payMinimumPanel']);
        Route::post('/sub-panel', [MemberProgrammeController::class, 'addSubPanel']);
        Route::post('/super-sub-panel', [MemberProgrammeController::class, 'addSuperSubPanel']);
        Route::post('/complete-survey', [MemberProgrammeController::class, 'completeSurvey'])
            ->middleware('throttle:30,1');
    });

    Route::prefix('publisher')->group(function () {
        Route::get('/dashboard', [PublisherDashboardController::class, 'index']);
        Route::get('/dashboard/performance', [PublisherDashboardController::class, 'performance']);
        Route::get('/dashboard/by-survey', [PublisherDashboardController::class, 'responsesBySurvey']);
        Route::get('/dashboard/completion', [PublisherDashboardController::class, 'completionSplit']);
        Route::get('/dashboard/activity', [PublisherDashboardController::class, 'recentActivity']);

        Route::get('/audience', [PublisherAudienceController::class, 'index']);

        Route::get('/earnings/summary', [PublisherEarningsController::class, 'summary']);
        Route::get('/earnings/chart', [PublisherEarningsController::class, 'chart']);
        Route::get('/earnings', [PublisherEarningsController::class, 'list']);

        Route::get('/analytics', [PublisherAnalyticsController::class, 'overview']);

        Route::get('/notifications', [PublisherNotificationsController::class, 'index']);

        Route::prefix('wallet')->group(function () {
            Route::get('/overview', [MemberWalletController::class, 'overview']);
            Route::get('/deposit-info', [MemberWalletController::class, 'depositInfo']);
            Route::post('/deposit', [MemberWalletController::class, 'deposit'])->middleware('throttle:20,1');
            Route::post('/nowpayments/payment', [MemberNowPaymentsController::class, 'create'])->middleware('throttle:15,1');
            Route::get('/nowpayments/{paymentId}', [MemberNowPaymentsController::class, 'show'])->middleware('throttle:60,1');
        });

        Route::get('/surveys', [PublisherSurveyController::class, 'index']);
        Route::post('/surveys', [PublisherSurveyController::class, 'store'])->middleware('throttle:30,1');
        Route::get('/surveys/{survey}', [PublisherSurveyController::class, 'show']);
        Route::put('/surveys/{survey}', [PublisherSurveyController::class, 'update'])->middleware('throttle:30,1');
        Route::patch('/surveys/{survey}/status', [PublisherSurveyController::class, 'updateStatus']);
        Route::delete('/surveys/{survey}', [PublisherSurveyController::class, 'destroy']);
        Route::get('/surveys/{survey}/responses', [PublisherSurveyController::class, 'listResponses']);
    });
});
