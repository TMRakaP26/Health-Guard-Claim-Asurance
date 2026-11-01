<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\ClaimController;
use App\Http\Controllers\DocumentController;
use App\Http\Controllers\NotificationController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AccountController;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\AnalyticsController;
use App\Http\Controllers\CatalogController;
use App\Http\Controllers\CollaborationController;
use App\Http\Controllers\DraftController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\RetentionController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Public routes
Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:register');
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login');
Route::post('/forgot-password', [AccountController::class, 'forgot'])->middleware('throttle:register');
Route::post('/reset-password', [AccountController::class, 'reset'])->middleware('throttle:register');
Route::post('/invitations/accept', [AdminController::class, 'accept'])->middleware('throttle:register');

// Protected routes
Route::middleware(['auth:sanctum', 'active', 'throttle:api'])->group(function () {
    // Auth
    Route::get('/catalog', [CatalogController::class, 'index']);
    Route::post('/logout-all', [AccountController::class, 'logoutAll']);
    Route::post('/email/verification-notification', [AccountController::class, 'sendVerification'])->middleware('throttle:register');
    Route::get('/email/verify/{id}/{hash}', [AccountController::class, 'verify'])->middleware('signed')->name('verification.verify');
    Route::post('/two-factor/setup', [AccountController::class, 'setupTwoFactor'])->middleware('throttle:register');
    Route::post('/two-factor/confirm', [AccountController::class, 'confirmTwoFactor'])->middleware('throttle:register');
    Route::delete('/two-factor', [AccountController::class, 'disableTwoFactor'])->middleware('throttle:register');
    Route::middleware('role:client')->group(function () {
        Route::get('/drafts', [DraftController::class, 'index']);
        Route::post('/drafts', [DraftController::class, 'save']);
        Route::put('/drafts/{id}', [DraftController::class, 'save']);
        Route::delete('/drafts/{id}', [DraftController::class, 'destroy']);
    });
    Route::get('/analytics', [AnalyticsController::class, 'index']);
    Route::get('/deletion-requests', [RetentionController::class, 'index']);
    Route::post('/deletion-requests', [RetentionController::class, 'request']);
    Route::middleware('role:admin')->prefix('admin')->group(function () {
        Route::get('/users', [AdminController::class, 'users']);
        Route::patch('/users/{id}/active', [AdminController::class, 'active']);
        Route::post('/invitations', [AdminController::class, 'invite']);
        Route::get('/catalog', [CatalogController::class, 'manage']);
        Route::post('/catalog/{kind}', [CatalogController::class, 'save']);
        Route::put('/catalog/{kind}/{id}', [CatalogController::class, 'save']);
        Route::patch('/deletion-requests/{id}', [RetentionController::class, 'review']);
    });
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'me']);
    Route::put('/user', [AuthController::class, 'updateProfile']);
    Route::post('/user/photo', [AuthController::class, 'uploadProfilePhoto']);
    Route::delete('/user/photo', [AuthController::class, 'removeProfilePhoto']);

    // Claims
    Route::get('/claims/export', [ClaimController::class, 'export'])->middleware('throttle:export');
    Route::get('/claims/unassigned', [ClaimController::class, 'unassigned'])->middleware('role:analyst');
    Route::get('/claims/my-assignments', [ClaimController::class, 'myAssignments'])->middleware('role:analyst');
    Route::post('/claims/{id}/assign', [ClaimController::class, 'assign'])->middleware('role:analyst');
    Route::get('/claims', [ClaimController::class, 'index']);
    Route::post('/claims', [ClaimController::class, 'store']);
    Route::get('/claims/{id}', [ClaimController::class, 'show']);
    Route::get('/claims/{id}/history', [ClaimController::class, 'history']);
    Route::get('/claims/{id}/messages', [CollaborationController::class, 'messages']);
    Route::post('/claims/{id}/messages', [CollaborationController::class, 'sendMessage']);
    Route::get('/claims/{id}/document-requests', [CollaborationController::class, 'documentRequests']);
    Route::post('/claims/{id}/document-requests', [CollaborationController::class, 'requestDocument']);
    Route::get('/claims/{id}/payment', [PaymentController::class, 'show']);
    Route::post('/claims/{id}/payment', [PaymentController::class, 'record']);
    Route::put('/claims/{id}', [ClaimController::class, 'update']);
    Route::patch('/claims/{id}/status', [ClaimController::class, 'updateStatus'])->middleware('role:analyst');

    // Documents
    Route::get('/claims/{claimId}/documents', [DocumentController::class, 'index']);
    Route::post('/claims/{claimId}/documents', [DocumentController::class, 'store']);
    Route::get('/claims/{claimId}/documents/{documentId}/download', [DocumentController::class, 'download']);

    // Notifications
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/stream', [NotificationController::class, 'stream']);
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
    Route::post('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);
});
