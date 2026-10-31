<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\ClaimController;
use App\Http\Controllers\DocumentController;
use App\Http\Controllers\NotificationController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Public routes
Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:register');
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login');

// Protected routes
Route::middleware(['auth:sanctum', 'throttle:api'])->group(function () {
    // Auth
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'me']);
    Route::put('/user', [AuthController::class, 'updateProfile']);
    Route::post('/user/photo', [AuthController::class, 'uploadProfilePhoto']);
    Route::delete('/user/photo', [AuthController::class, 'removeProfilePhoto']);

    // Claims
    Route::get('/claims/unassigned', [ClaimController::class, 'unassigned'])->middleware('role:analyst');
    Route::get('/claims/my-assignments', [ClaimController::class, 'myAssignments'])->middleware('role:analyst');
    Route::post('/claims/{id}/assign', [ClaimController::class, 'assign'])->middleware('role:analyst');
    Route::get('/claims', [ClaimController::class, 'index']);
    Route::post('/claims', [ClaimController::class, 'store']);
    Route::get('/claims/{id}', [ClaimController::class, 'show']);
    Route::put('/claims/{id}', [ClaimController::class, 'update']);
    Route::patch('/claims/{id}/status', [ClaimController::class, 'updateStatus'])->middleware('role:analyst');

    // Documents
    Route::get('/claims/{claimId}/documents', [DocumentController::class, 'index']);
    Route::post('/claims/{claimId}/documents', [DocumentController::class, 'store']);
    Route::get('/claims/{claimId}/documents/{documentId}/download', [DocumentController::class, 'download']);

    // Notifications
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
    Route::post('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);
});
