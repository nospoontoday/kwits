<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreDeviceKeyRequest;
use Illuminate\Http\Request;

class DeviceTokenController extends Controller
{
    public function store(StoreDeviceKeyRequest $request)
    {
        $data = $request->validated();

        auth()->user()->update(['device_token' => $data['device_token']]);

        return response()->json(['token saved successfully']);
    }
}
