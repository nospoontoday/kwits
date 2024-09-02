<?php

namespace App\Http\Controllers\Auth;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Laravel\Socialite\Facades\Socialite;

class ProviderController extends Controller
{
    public function redirect($provider)
    {
        return Socialite::driver($provider)->redirect();
    }

    public function login($provider)
    {
        $providerUser = Socialite::driver($provider)->user();
    
        // Find a user by email or provider ID
        $user = User::where('email', $providerUser->email)
            ->orWhere('provider_id', $providerUser->id)
            ->first();
    
        // If user does not exist, create a new user
        if (!$user) {
            $user = User::create([
                'name' => $providerUser->name,
                'email' => $providerUser->email,
                'provider_id' => $providerUser->id,
                'provider' => $provider,
                'provider_token' => $providerUser->token,
                'avatar' => $providerUser->avatar,
                'email_verified_at' => now(),
            ]);
        } else {
            // Update user details if needed
            $user->update([
                'provider_id' => $providerUser->id,
                'provider' => $provider,
                'provider_token' => $providerUser->token,
                'avatar' => $providerUser->avatar,
                'email_verified_at' => now(),
            ]);
        }
    
        Auth::login($user);
    
        return redirect('/');
    }
    
}
