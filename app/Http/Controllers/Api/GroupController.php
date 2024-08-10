<?php

namespace App\Http\Controllers\Api;

use App\Events\MessageSent;
use App\Http\Requests\CreateGroupRequest;use App\Models\Group;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\AddGroupMemberRequest;
use App\Models\Message;
use App\Models\Contact;
use Illuminate\Support\Facades\Request;

class GroupController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();

        $groups = $user->groups()->with(['members', 'expenses', 'payments'])->get();

        return response()->json([
            'success' => true,
            'data' => $groups,
        ]);
    }

    public function store(CreateGroupRequest $request): JsonResponse
    {
        try {
            $group = Group::create([
                'id' => (string) Str::uuid(),
                'name' => $request->name,
                'owner_id' => Auth::id(),
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
        if ($group->owner_id != Auth::id()) {
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

    public function getOweMeList($groupId): JsonResponse
    {
        $group = Group::with(['members', 'expenses.members', 'payments'])
            ->findOrFail($groupId);

        $userId = Auth::id();
        $balances = [];

        // Initialize balances for each member
        foreach ($group->members as $member) {
            if ($member->id !== $userId) {
                $balances[$member->id] = 0;
            }
        }

        // Calculate the debts for expenses
        foreach ($group->expenses as $expense) {
            foreach ($expense->members as $expenseMember) {
                if ($expense->user_id === $userId) {
                    // If the logged-in user created the expense, others owe them
                    if (isset($balances[$expenseMember->user_id])) {
                        $balances[$expenseMember->user_id] += $expenseMember->amount;
                    }
                } elseif ($expenseMember->user_id === $userId) {
                    // If the logged-in user is part of the expense, they owe the creator
                    if (isset($balances[$expense->user_id])) {
                        $balances[$expense->user_id] -= $expenseMember->amount;
                    }
                }
            }
        }
        
        // Calculate the payments
        foreach ($group->payments as $payment) {

            if ($payment->payer_id === $userId) {
                // If the logged-in user created the payment, they owe more

                if (isset($balances[$payment->payee_id])) {
                    $balances[$payment->payee_id] += $payment->amount;
                }
            } elseif ($payment->payee_id === $userId) {
                // If the logged-in user received the payment, tthey owe less

                if (isset($balances[$payment->payer_id])) {
                    $balances[$payment->payer_id] -= $payment->amount;
                }
            }
        }

        // Prepare the result
        $oweMe = [];
        foreach ($balances as $memberId => $balance) {
            if ($balance > 0) {
                $oweMe[] = [
                    'user_id' => $memberId,
                    'name' => $group->members->firstWhere('id', $memberId)->name,
                    'amount' => $balance,
                ];
            }
        }

        // Serialize the oweMe list into a readable format
        $oweMeList = collect($oweMe)->map(function ($item) {
            return "{$item['name']} owes you {$item['amount']}";
        })->implode(', ');

        if (empty($oweMeList)) {
            $oweMeList = "No one owes you anything.";
        }

        // Create chat message
        Message::create([
            'id' => (string) Str::uuid(),
            'group_id' => $groupId,
            'user_id' => $userId,
            'message' => "You owe me list: $oweMeList",
            'type' => 'info',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Owe Me list retrieved successfully.',
            'data' => $oweMe,
        ]);
    }

    public function getOweYouList($groupId): JsonResponse
    {
        $group = Group::with(['members', 'expenses.members', 'payments'])
            ->findOrFail($groupId);
    
        $userId = Auth::id();
        $balances = [];
    
        // Initialize balances for each member
        foreach ($group->members as $member) {
            if ($member->id !== $userId) {
                $balances[$member->id] = 0;
            }
        }
    
        // Calculate the debts for expenses
        foreach ($group->expenses as $expense) {
            foreach ($expense->members as $expenseMember) {
                if ($expense->user_id === $userId) {
                    // If the logged-in user created the expense, others owe them
                    if (isset($balances[$expenseMember->user_id])) {
                        $balances[$expenseMember->user_id] -= $expenseMember->amount;
                    }
                } elseif ($expenseMember->user_id === $userId) {
                    // If the logged-in user is part of the expense, they owe the creator
                    if (isset($balances[$expense->user_id])) {
                        $balances[$expense->user_id] += $expenseMember->amount;
                    }
                }
            }
        }
    
        // Calculate the payments
        foreach ($group->payments as $payment) {
            if ($payment->payer_id === $userId) {
                // If the logged-in user made the payment, they owe less
                if (isset($balances[$payment->payee_id])) {
                    $balances[$payment->payee_id] -= $payment->amount;
                }
            } elseif ($payment->payee_id === $userId) {
                // If the logged-in user received the payment, they owe less
                if (isset($balances[$payment->payer_id])) {
                    $balances[$payment->payer_id] += $payment->amount;
                }
            }
        }
    
        // Prepare the result
        $oweYou = [];
        foreach ($balances as $memberId => $balance) {
            if ($balance > 0) {
                $oweYou[] = [
                    'user_id' => $memberId,
                    'name' => $group->members->firstWhere('id', $memberId)->name,
                    'amount' => $balance,
                ];
            }
        }
    
        // Serialize the oweYou list into a readable format
        $oweYouList = collect($oweYou)->map(function ($item) {
            return "You owe {$item['name']} {$item['amount']}";
        })->implode(', ');

        if (empty($oweYouList)) {
            $oweYouList = "You don't owe anyone anything.";
        }

        // Create chat message
        Message::create([
            'id' => (string) Str::uuid(),
            'group_id' => $groupId,
            'user_id' => $userId,
            'message' => "I owe you list: $oweYouList",
            'type' => 'info',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Owe You list retrieved successfully.',
            'data' => $oweYou,
        ]);
    }
    
}
