<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreFriendRequest;
use App\Http\Resources\FriendRequestResource;
use App\Models\User;
use Illuminate\Http\Request;

class FriendController extends Controller
{
    public function requests(Request $request)
    {
        $pendingFriendships = $request->user()->getPendingFriendships();

        return FriendRequestResource::collection($pendingFriendships);
    }

    public function confirm(Request $request, User $sender)
    {
        $request->user()->acceptFriendRequest($sender);

        return redirect()->back();
    }

    public function deny(Request $request, User $sender)
    {
        $request->user()->denyFriendRequest($sender);

        return redirect()->back();
    }

    public function store(StoreFriendRequest $request)
    {
        $data = $request->validated();
        $currentUser = $request->user();

        // Check if the email belongs to the current user
        if ($data['email'] === $currentUser->email) {
            return redirect()->back()->withErrors(['email' => 'You cannot send a friend request to yourself.']);
        }

        $recipient = User::where('email', $data['email'])->first();
        if($currentUser->hasSentFriendRequestTo($recipient)) {
            return redirect()->back()->withErrors(['email' => 'You already sent a friend request to ' . $data['email']]);
        }

        if($currentUser->getFriendship($recipient)) {
            return redirect()->back()->withErrors(['email' => 'You already sent a friend request to ' . $data['email']]);
        }

        if ($recipient) {
            $currentUser->befriend($recipient);
        }

        return redirect()->back();
    }
}
