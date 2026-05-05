<?php

use App\Http\Controllers\Api\AiController;
use App\Http\Controllers\Api\AnalyticsController;
use App\Http\Controllers\Api\AudienceController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\EarningsController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\SurveyController;
use App\Http\Controllers\Api\TransactionController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
});

Route::get('/surveys/public/{id}', [SurveyController::class, 'publicShow']);
Route::post('/surveys/{id}/responses', [SurveyController::class, 'submitResponse']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::patch('/auth/profile', [AuthController::class, 'updateProfile']);
    Route::post('/auth/change-password', [AuthController::class, 'changePassword']);

    Route::get('/dashboard/stats', [DashboardController::class, 'stats']);
    Route::get('/dashboard/performance', [DashboardController::class, 'performance']);
    Route::get('/dashboard/responses-by-survey', [DashboardController::class, 'responsesBySurvey']);
    Route::get('/dashboard/completion-split', [DashboardController::class, 'completionSplit']);
    Route::get('/dashboard/recent-activity', [DashboardController::class, 'recentActivity']);

    Route::get('/surveys', [SurveyController::class, 'index']);
    Route::post('/surveys', [SurveyController::class, 'store']);
    Route::get('/surveys/{survey}/responses', [SurveyController::class, 'listResponses']);
    Route::get('/surveys/{survey}', [SurveyController::class, 'show']);
    Route::put('/surveys/{survey}', [SurveyController::class, 'update']);
    Route::patch('/surveys/{survey}/status', [SurveyController::class, 'updateStatus']);
    Route::delete('/surveys/{survey}', [SurveyController::class, 'destroy']);

    Route::get('/earnings/summary', [EarningsController::class, 'summary']);
    Route::get('/earnings/chart', [EarningsController::class, 'chart']);
    Route::get('/earnings/list', [EarningsController::class, 'list']);

    Route::get('/transactions', [TransactionController::class, 'index']);
    Route::post('/transactions/withdraw', [TransactionController::class, 'withdraw']);

    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::patch('/notifications/{id}/read', [NotificationController::class, 'markRead']);
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllRead']);

    Route::get('/analytics/overview', [AnalyticsController::class, 'overview']);

    Route::get('/audience/users', [AudienceController::class, 'users']);

    Route::post('/ai/suggestions', [AiController::class, 'suggestions']);
});
