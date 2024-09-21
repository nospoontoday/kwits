<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\AuthRequest;
use App\Http\Requests\RegisterRequest;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use GuzzleHttp\Client;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function logout(Request $request)
    {
        $request->user()->token()->delete();
        return response()->noContent();
    }

    public function socialLogin(Request $request)
    {
        $token = $request->input('token');

        // Verify the token with Google
        $client = new Client();
        $response = $client->get('https://oauth2.googleapis.com/tokeninfo', [
            'query' => ['id_token' => $token]
        ]);

        $googleUser = json_decode($response->getBody(), true);

        // Check if user exists
        $user = User::where('email', $googleUser['email'])->first();

        if (!$user) {
            // Create new user
            $user = User::create([
                'name' => $googleUser['name'],
                'email' => $googleUser['email'],
                'password' => bcrypt('password')
            ]);
        }

        Auth::login($user);

        $token = $user->createToken(config('api.token'))->accessToken;

        return response()->json([
            'success' => true,
            'message' => 'Login successful',
            'user' => $user,
            'token' => $token
        ]);
    }

    public function login(AuthRequest $request)
    {
        $data = $request->validated();
        $user = User::where('email', $data['email'])->first();

        if(!$user || !Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect']
            ]);
        }

        return response()->json([
            'token' => $user->createToken($data['device_name'])->accessToken,
        ]);
    }

    public function register(RegisterRequest $request) {
        $data = $request->validated();

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
        ]);

        return response()->json([
            'token' => $user->createToken($data['device_name'])->accessToken,
        ]);
    }
}
