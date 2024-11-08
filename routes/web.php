<?php

use App\Http\Controllers\Auth\ProviderController;
use App\Http\Controllers\DeviceTokenController;
use App\Http\Controllers\ExpenseController;
use App\Http\Controllers\FriendController;
use App\Http\Controllers\GroupController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\KeyController;
use App\Http\Controllers\MessageController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

Route::get('/auth/{provider}/redirect', [ProviderController::class, 'redirect']);

Route::get('/auth/{provider}/login', [ProviderController::class, 'login']);

Route::middleware(['auth', 'verified', 'active'])->group(function() {
    Route::get('/', [HomeController::class, 'home'])->name('dashboard');

    Route::get('/user/{user}', [MessageController::class, 'byUser'])->name('chat.user');

    Route::post('/message', [MessageController::class, 'store'])->name('message.store');
    
    Route::delete('/message/{message}', [MessageController::class, 'destroy'])->name('message.destroy');

    Route::get('/message/older/{message}', [MessageController::class, 'loadOlder'])->name('message.loadOlder');

    Route::get('/group/{group}', [MessageController::class, 'byGroup'])->name('chat.group');

    Route::post('/group', [GroupController::class, 'store'])->name('group.store');

    Route::put('/group/{group}', [GroupController::class, 'update'])->name('group.update');

    Route::delete('/group/{group}', [GroupController::class, 'destroy'])->name('group.destroy');

    Route::post('/group/owe-me', [GroupController::class, 'getOweMeList'])->name('group.owe-me');

    Route::post('/group/owe-you', [GroupController::class, 'getOweYouList'])->name('group.owe-you');

    Route::post('/friend/request', [FriendController::class, 'store'])->name('friend.request');

    Route::get('/friend/requests', [FriendController::class, 'requests'])->name('friend.requests');

    Route::post('/friend/confirm/{sender}', [FriendController::class, 'confirm'])->name('friend.confirm');

    Route::post('/friend/deny/{sender}', [FriendController::class, 'deny'])->name('friend.deny');

    Route::post('/expense', [ExpenseController::class, 'store'])->name('expense.store');

    Route::post('/expense-summary', [ExpenseController::class, 'getSummary'])->name('expense.summary');

    Route::post('/key', [KeyController::class, 'store'])->name('key.store');
    
    Route::post('/retrieve-private', [KeyController::class, 'retrievePrivateKey'])->name('key.retrieve.private');

    Route::post('/has-key', [KeyController::class, 'hasKey'])->name('has.key');

    Route::put('/key/{user}', [KeyController::class, 'update'])->name('key.update');

    Route::post('/device-token', [DeviceTokenController::class, 'store'])->name('device-token.store');

    Route::middleware(['admin'])->group(function() {
        Route::post('/user', [UserController::class, 'store'])->name('user.store');
        Route::post('/user/change-role/{user}', [UserController::class, 'changeRole'])->name('user.changeRole');
        Route::post('/user/block-unblock/{user}', [UserController::class, 'blockUnblock'])->name('user.blockUnblock');
    });

});

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';
