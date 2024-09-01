<?php

namespace App\Http\Controllers;

use App\Http\Requests\RetrieveKeyRequest;
use App\Http\Requests\StoreKeyRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class KeyController extends Controller
{
    public function store(StoreKeyRequest $request)
    {
        $data = $request->validated();
        $user = Auth::user();
        $user->public_key = $data['public_key'];
        $user->private_key = $data['private_key'];
        $user->save();

        // Return a response or redirect
        return response()->json(['message' => 'Public & Private keys saved successfully'], 200);
    }

    public function retrievePrivateKey(RetrieveKeyRequest $request)
    {
        $data = $request->validated();
        $user = Auth::user();

        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        if($data['user_id'] != $user->id) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $base64PrivateKey = $user->private_key;

        return response()->json(['private_key' => $base64PrivateKey]);
    }
}
