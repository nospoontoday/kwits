<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ContactController;
use App\Http\Controllers\Api\ExpenseController;
use App\Http\Controllers\Api\GroupController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:api');

// Public routes
Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:api')->group(function () {
    
    Route::post('/contacts/request', [ContactController::class, 'sendRequest']);
    Route::post('/contacts/accept', [ContactController::class, 'acceptRequest']);
    
    Route::post('/groups', [GroupController::class, 'store']);
    Route::post('/groups/members', [GroupController::class, 'addMembers']);
    Route::get('/groups/{groupId}/owe-me', [GroupController::class, 'getOweMeList']);

    Route::post('/expenses', [ExpenseController::class, 'store']);
});
