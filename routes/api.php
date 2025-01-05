<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ContactController;
use App\Http\Controllers\Api\ConversationController;
use App\Http\Controllers\ExpenseController;
use App\Http\Controllers\GroupController;
use App\Http\Controllers\Api\MessageController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Auth\PasswordResetLinkController;
use App\Http\Controllers\CurrencyController;
use App\Http\Controllers\KeyController;
use App\Http\Controllers\FriendController;

use App\Http\Resources\UserResource;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Route;

// Public routes
Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);
Route::post('/forgot-password', [PasswordResetLinkController::class, 'store']);
Route::post('/social-login', [AuthController::class, 'socialLogin']);

Route::get('/currencies', [CurrencyController::class, 'index']);
Route::group(['middleware' => ['auth:api']], function() {
    Route::get('/user', function (Request $request) {
        return response()->json([
            'user' => new UserResource($request->user())
        ]);
    });

    Route::get('/conversations', [ConversationController::class, 'index']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::post('/retrieve-private', [KeyController::class, 'retrievePrivateKey'])->name('key.retrieve.private');
    Route::post('/save_public_key', [KeyController::class, 'savePublicKey']);
    Route::post('/save_secret_key', [KeyController::class, 'saveSecretKey']);
    Route::post('/groups', [GroupController::class, 'store']);
    Route::get('/group/{group}', [MessageController::class, 'byGroup'])->name('chat.group');
    Route::post('/group/owe-me', [GroupController::class, 'getOweMeList'])->name('group.owe-me');
    Route::post('/group/owe-you', [GroupController::class, 'getOweYouList'])->name('group.owe-you');
    Route::get('/user/{user}', [MessageController::class, 'byUser'])->name('chat.user');
    Route::post('/message', [MessageController::class, 'store'])->name('message.store');
    Route::delete('/message/{message}', [MessageController::class, 'destroy'])->name('message.destroy');
    Route::post('/expense', [ExpenseController::class, 'store'])->name('expense.store');
    Route::get('/friends', [FriendController::class, 'index'])->name('friends');
    Route::post('/friend/request', [FriendController::class, 'store'])->name('friend.request');
    Route::get('/friend/requests', [FriendController::class, 'requests'])->name('friend.requests');
    Route::post('/friend/confirm/{sender}', [FriendController::class, 'confirm'])->name('friend.confirm');
    Route::post('/friend/deny/{sender}', [FriendController::class, 'deny'])->name('friend.deny');
});

// Route::middleware('auth:api')->group(function () {
    
//     Route::post('/payments', [PaymentController::class, 'store']);

//     Route::post('/contacts/request', [ContactController::class, 'sendRequest']);
//     Route::post('/contacts/accept', [ContactController::class, 'acceptRequest']);
    
//     Route::get('/groups', [GroupController::class, 'index']);
//     Route::post('/groups', [GroupController::class, 'store']);
//     Route::post('/groups/members', [GroupController::class, 'addMembers']);
//     Route::get('/groups/{groupId}/owe-me', [GroupController::class, 'getOweMeList']);
//     Route::get('/groups/{groupId}/owe-you', [GroupController::class, 'getOweYouList']);

//     Route::post('/expenses', [ExpenseController::class, 'store']);

//     Route::post('/messages', [MessageController::class, 'storeMessage']);
//     Route::get('/messages/{groupId}', [MessageController::class, 'index']);
// });
