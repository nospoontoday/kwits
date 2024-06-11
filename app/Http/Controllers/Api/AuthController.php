<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\AuthRequest;
use Illuminate\Support\Facades\Auth;

class AuthController extends Controller
{
    public function login(AuthRequest $request)
    {
        // Attempt to authenticate the user
        if (!Auth::attempt($request->only('email', 'password'))) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid credentials',
            ], 401);
        }

        // Get the authenticated user
        $user = Auth::user();

        // Generate an API token
        $token = $user->createToken(config('api.token'))->accessToken;

        return response()->json([
            'success' => true,
            'message' => 'Login successful',
            'token' => $token,
        ]);
    }
}
