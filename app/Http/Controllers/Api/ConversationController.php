<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use App\Models\Conversation;
use Illuminate\Support\Facades\Auth;

class ConversationController extends Controller
{
    public function index() {
        return response()->json([
            'conversations' => Auth::id() 
                ? Conversation::getConversationsForSidebar(Auth::user()) 
                : []
        ]);
    }
}
