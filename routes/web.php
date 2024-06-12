<?php

use App\Http\Controllers\GroupController;
use App\Http\Controllers\SocialLoginController;
use Illuminate\Support\Facades\Route;

Route::view('/', 'welcome');

Route::view('dashboard', 'dashboard')
    ->middleware(['auth', 'verified'])
    ->name('dashboard');

Route::view('profile', 'profile')
    ->middleware(['auth'])
    ->name('profile');

Route::get('socialite/{driver}', [SocialLoginController::class, 'toProvider'])->where('driver', 'google');
Route::get('auth/{driver}/login', [SocialLoginController::class, 'handleCallback'])->where('driver', 'google');

require __DIR__.'/auth.php';
