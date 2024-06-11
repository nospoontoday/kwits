<?php

namespace App\Http\Controllers;

use App\Models\SocialLogin;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Session;
use Laravel\Socialite\Facades\Socialite;

class SocialLoginController extends Controller
{
    public function toProvider($driver) {
        return Socialite::driver($driver)->redirect();
    }

    public function handleCallback($driver) {
        $user = Socialite::driver($driver)->user();

        $user_account = SocialLogin::where('provider', $driver)->where('provider_id', $user->getId())->first();

        if(! $user_account) {
            $db_user = User::where('email', $user->getEmail())->first();

            if(! $db_user) {
                $db_user = User::create([
                    'name' => $user->getName(),
                    'email' => $user->getEmail(),
                    'password' => bcrypt(rand(1000,9999)),
                    'email_verified_at' => now(),
                ]);
            }
    
            $user_account = SocialLogin::create([
                'provider' => $driver,
                'provider_id' => $user->getId(),
                'user_id' => $db_user->id,
            ]);
        }
        Auth::login($user_account->user);

        Session::regenerate();

        return redirect()->intended('dashboard');


    }
}
