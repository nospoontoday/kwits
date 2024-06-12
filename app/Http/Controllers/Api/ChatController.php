<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreMessageRequest;
use App\Models\ChatMessage;
use App\Models\Group;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Auth;

class ChatController extends Controller
{
    public function storeMessage(StoreMessageRequest $request)
    {
        $group = Group::findOrFail($request->group_id);

        // Check if the authenticated user is a member of the group
        if (!$group->members->contains(Auth::id())) {
            return response()->json([
                'success' => false,
                'message' => 'You are not a member of this group.',
            ], 403);
        }

        $message = ChatMessage::create([
            'id' => (string) Str::uuid(),
            'group_id' => $request->group_id,
            'user_id' => Auth::id(),
            'message' => $request->message,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Message sent successfully.',
            'data' => $message,
        ], 201);
    }

    public function index($groupId)
    {
        $messages = ChatMessage::where('group_id', $groupId)->get();

        return response()->json([
            'success' => true,
            'data' => $messages,
        ]);
    }
}
