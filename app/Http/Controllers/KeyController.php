<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreKeyRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class KeyController extends Controller
{
    public function store(StoreKeyRequest $request)
    {
        $data = $request->validated();
        $user = Auth::user();
        $user->public_key = $data['public_key'];
        // $user->private_key = $data['private_key'];
        $user->save();

        // Return a response or redirect
        return response()->json(['message' => 'Public & Private keys saved successfully'], 200);
    }
}
