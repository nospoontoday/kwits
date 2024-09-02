<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\MessageController;
use App\Http\Controllers\Api\ContactController;
use App\Http\Controllers\Api\ExpenseController;
use App\Http\Controllers\Api\GroupController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\CurrencyController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/currencies', [CurrencyController::class, 'index']);

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:api');

// Public routes
Route::post('/login', [AuthController::class, 'login']);
Route::post('/social-login', [AuthController::class, 'socialLogin']);

Route::middleware('auth:api')->group(function () {
    
    Route::post('/payments', [PaymentController::class, 'store']);

    Route::post('/contacts/request', [ContactController::class, 'sendRequest']);
    Route::post('/contacts/accept', [ContactController::class, 'acceptRequest']);
    
    Route::get('/groups', [GroupController::class, 'index']);
    Route::post('/groups', [GroupController::class, 'store']);
    Route::post('/groups/members', [GroupController::class, 'addMembers']);
    Route::get('/groups/{groupId}/owe-me', [GroupController::class, 'getOweMeList']);
    Route::get('/groups/{groupId}/owe-you', [GroupController::class, 'getOweYouList']);

    Route::post('/expenses', [ExpenseController::class, 'store']);

    Route::post('/messages', [MessageController::class, 'storeMessage']);
    Route::get('/messages/{groupId}', [MessageController::class, 'index']);
});
