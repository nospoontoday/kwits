<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreFriendRequest;
use App\Http\Resources\FriendRequestResource;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class FriendController extends Controller
{

    public function index(Request $request)
    {
        $friends = $request->user()->getFriends();
        return response()->json($friends);
    }

    public function requests(Request $request)
    {
        $pendingFriendships = $request->user()->getPendingFriendships();

        return FriendRequestResource::collection($pendingFriendships);
    }

    public function confirm(Request $request, User $sender)
    {
        $request->user()->acceptFriendRequest($sender);

        return response()->json([
            'success' => true,
            'message' => "Friend request accepted",
        ]);
    }

    public function deny(Request $request, User $sender)
    {
        $request->user()->denyFriendRequest($sender);

        return response()->json([
            'success' => true,
            'message' => "Friend request denied",
        ]);
    }

    public function store(StoreFriendRequest $request)
    {
        $data = $request->validated();
        $currentUser = $request->user();

        // Check if the email belongs to the current user
        if ($data['email'] === $currentUser->email) {
            return response()->json([
                'success' => false,
                'message' => '🚫 You cannot send a friend request to yourself.',
            ], 401);
        }

        $recipient = User::where('email', $data['email'])->first();
        if($currentUser->hasSentFriendRequestTo($recipient)) {
            return response()->json([
                'success' => false,
                'message' => '🚫 You already sent a friend request to ' . $data['email'],
            ], 401);            
        }

        if($currentUser->getFriendship($recipient)) {
            return response()->json([
                'success' => false,
                'message' => '🚫 You already sent a friend request to ' . $data['email'],
            ], 401);
        }

        if ($recipient) {
            $currentUser->befriend($recipient);
        }

        return response()->json([
            'success' => true,
            'message' => "Friend request sent successfully",
        ]);

        return redirect()->back();
    }
}
