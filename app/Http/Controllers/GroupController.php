<?php

namespace App\Http\Controllers;

use App\Http\Requests\CreateGroupRequest;
use App\Models\Group;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class GroupController extends Controller
{
    public function store(CreateGroupRequest $request): JsonResponse
    {
        try {
            $group = Group::create([
                'id' => (string) Str::uuid(),
                'name' => $request->name,
                'created_by' => Auth::id(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Group created successfully.',
                'data' => $group,
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create group.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
