<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\CreateGroupRequest;
use App\Models\Group;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\AddGroupMemberRequest;
use App\Models\Contact;

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

            // Add the creator as a member of the group
            $group->members()->attach(Auth::id());

            return response()->json([
                'success' => true,
                'message' => 'Group created successfully and creator added as a member.',
                'data' => $group->load('members'),
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create group.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function addMembers(AddGroupMemberRequest $request): JsonResponse
    {
        $group = Group::findOrFail($request->group_id);

        // Check if the authenticated user is the creator of the group
        if ($group->created_by != Auth::id()) {
            return response()->json([
                'success' => false,
                'message' => 'You are not authorized to add members to this group.',
            ], 403);
        }

        $contacts = Contact::where('user_id', Auth::id())
            ->whereIn('contact_id', $request->contact_ids)
            ->where('status', 'accepted')
            ->get();

        if ($contacts->isEmpty()) {
            return response()->json([
                'success' => false,
                'message' => 'No accepted contacts found to add to the group.',
            ], 400);
        }

        $group->members()->attach($contacts->pluck('contact_id'));

        return response()->json([
            'success' => true,
            'message' => 'Contacts added to the group successfully.',
            'data' => $group->load('members'),
        ]);
    }
}
