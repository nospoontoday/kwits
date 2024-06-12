<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ContactController;
use App\Http\Controllers\GroupController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:api');

// Public routes
Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:api')->group(function () {
    Route::post('/groups', [GroupController::class, 'store']);

    Route::post('/contacts/request', [ContactController::class, 'sendRequest']);
    Route::post('/contacts/accept', [ContactController::class, 'acceptRequest']);
});
