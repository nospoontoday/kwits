<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\AuthRequest;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use GuzzleHttp\Client;
use Firebase\JWT\JWT;
use Firebase\JWT\JWK;
use Firebase\JWT\Key;

class AuthController extends Controller
{
    public function socialLogin(Request $request)
    {
        try {

            $email = $request->input('email');
            $name = $request->input('name');

            // Check if user already exists
            $user = User::where('email', $email)->first();

            if (!$user) {
                // Create a new user
                $user = User::create([
                    'name' => $name,
                    'email' => $email,
                    'password' => bcrypt('password'), // Generate a random password
                ]);
            }

            // Log the user in
            Auth::login($user, true);

            // Generate an API token
            $token = $user->createToken(config('api.token'))->accessToken;

            return response()->json([
                'success' => true,
                'message' => 'Login successful',
                'token' => $token,
            ]);

        } catch (\Exception $e) {
            return response()->json(['error' => 'Invalid token'], 401);
        }
    }

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
