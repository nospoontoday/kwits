<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreFriendRequest;
use App\Models\User;
use Illuminate\Http\Request;

class FriendController extends Controller
{
    public function store(StoreFriendRequest $request)
    {
        $data = $request->validated();
        $currentUser = $request->user();

        // Check if the email belongs to the current user
        if ($data['email'] === $currentUser->email) {
            return redirect()->back()->withErrors(['email' => 'You cannot send a friend request to yourself.']);
        }

        $recipient = User::where('email', $data['email'])->first();

        if ($recipient) {
            $currentUser->befriend($recipient);
        }

        return redirect()->back();
    }
}
