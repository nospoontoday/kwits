<?php

namespace App\Http\Controllers;

use App\Http\Requests\HasKeyRequest;
use App\Http\Requests\PublicKeyRequest;
use App\Http\Requests\RetrieveKeyRequest;
use App\Http\Requests\SecretKeyRequest;
use App\Http\Requests\StoreKeyRequest;
use App\Http\Requests\UpdateKeyRequest;
use App\Models\User;
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
        $user->salt = $data['salt'];
        $user->iv = $data['iv'];
        $user->pin_iv = $data['pin_iv'];
        $user->has_created_pin = $data['has_created_pin'];
        $user->save();

        // Return a response or redirect
        return response()->json(['message' => 'Public & Private keys saved successfully'], 200);
    }

    public function savePublicKey(PublicKeyRequest $request)
    {
        $data = $request->validated();

        $user = Auth::user();
        $user->public_key = $data['public_key'];
        $user->save();

        // Return a response or redirect
        return response()->json(['message' => 'Public key saved successfully'], 200);
    }

    public function saveSecretKey(SecretKeyRequest $request)
    {
        $data = $request->validated();

        $user = Auth::user();
        $user->private_key = $data['secret_key'];
        $user->save();

        // Return a response or redirect
        return response()->json(['message' => 'Secret key saved successfully'], 200);
    }

    public function update(UpdateKeyRequest $request, User $user)
    {
        $data = $request->validated();

        $user->update($data);

        return redirect()->back();
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

    public function hasKey(HasKeyRequest $request)
    {
        $user = Auth::user();
        
        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }
        
        if(!$user->private_key) {
            return response()->json(['public_key' => false]);
        }
        
        return response()->json(['public_key' => $user->public_key]);
    }
}