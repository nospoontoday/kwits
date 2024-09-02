<?php

namespace App\Http\Controllers;

use App\Events\SocketMessage;
use App\Http\Requests\CreateGroupRequest;
use App\Models\Group;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\AddGroupMemberRequest;
use App\Http\Requests\StoreGroupRequest;
use App\Http\Requests\StoreOweMeRequest;
use App\Http\Requests\StoreOweYouRequest;
use App\Http\Requests\UpdateGroupRequest;
use App\Jobs\DeleteGroupJob;
use App\Models\Message;
use App\Models\Contact;
use App\Models\Currency;
use Illuminate\Support\Facades\Request;

class GroupController extends Controller
{
    public function store(StoreGroupRequest $request)
    {
        $data = $request->validated();
        $user_ids = $data['user_ids'] ?? [];

        try {
            $group = Group::create($data);

            // Add the creator as a member of the group
            $group->members()->attach(array_unique([Auth::id(), ...$user_ids]));

            return redirect()->back();
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create group.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function update(UpdateGroupRequest $request, Group $group)
    {
        $data = $request->validated();
        $user_ids = $data['user_ids'] ?? [];
        $group->update($data);

        //Remove all users and attach new ones
        $group->members()->detach();
        $group->members()->attach(array_unique([Auth::id(), ...$user_ids]));

        return redirect()->back();
    }

    public function destroy(Group $group)
    {
        if($group->owner_id !== Auth::id()) {
            abort(403);
        }

        DeleteGroupJob::dispatch($group)->delay(now()->addSeconds(10));

        return response()->json(['message' => 'Group delete was scheduled and will be deleted soon.']);
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

    public function getOweMeList(StoreOweMeRequest $request)
    {
        $data = $request->validated();
        $groupId = $data['group_id'];
    
        $group = Group::with(['members', 'expenses.members', 'payments'])
            ->findOrFail($groupId);
    
        $userId = Auth::id();
        $balances = [];
    
        // Fetch currencies
        $currencies = Currency::all()->keyBy('code'); // Assuming Currency is the model for the currencies table
    
        // Initialize balances for each member, separated by currency
        foreach ($group->members as $member) {
            if ($member->id !== $userId) {
                // Initialize balances for each currency
                foreach ($currencies as $currencyCode => $currency) {
                    $balances[$currencyCode][$member->id] = [
                        'amount' => 0,
                        'currency_symbol' => $currency->symbol,
                    ];
                }
            }
        }
    
        // Calculate the debts for expenses
        foreach ($group->expenses as $expense) {
            $currencyCode = $expense->currency;
            $currencySymbol = $currencies->get($currencyCode)->symbol;
    
            foreach ($expense->members as $expenseMember) {
                if ($expense->user_id === $userId) {
                    // If the logged-in user created the expense, others owe them
                    if (isset($balances[$currencyCode][$expenseMember->user_id])) {
                        $balances[$currencyCode][$expenseMember->user_id]['amount'] += $expenseMember->amount;
                        $balances[$currencyCode][$expenseMember->user_id]['currency_symbol'] = $currencySymbol;
                    }
                } elseif ($expenseMember->user_id === $userId) {
                    // If the logged-in user is part of the expense, they owe the creator
                    if (isset($balances[$currencyCode][$expense->user_id])) {
                        $balances[$currencyCode][$expense->user_id]['amount'] -= $expenseMember->amount;
                        $balances[$currencyCode][$expense->user_id]['currency_symbol'] = $currencySymbol;
                    }
                }
            }
        }
    
        // Calculate the payments
        foreach ($group->payments as $payment) {
            $currencyCode = $payment->currency_code;
            $currencySymbol = $currencies->get($currencyCode)->symbol;
    
            if ($payment->payer_id === $userId) {
                // If the logged-in user created the payment, they owe more
                if (isset($balances[$currencyCode][$payment->payee_id])) {
                    $balances[$currencyCode][$payment->payee_id]['amount'] += $payment->amount;
                    $balances[$currencyCode][$payment->payee_id]['currency_symbol'] = $currencySymbol;
                }
            } elseif ($payment->payee_id === $userId) {
                // If the logged-in user received the payment, they owe less
                if (isset($balances[$currencyCode][$payment->payer_id])) {
                    $balances[$currencyCode][$payment->payer_id]['amount'] -= $payment->amount;
                    $balances[$currencyCode][$payment->payer_id]['currency_symbol'] = $currencySymbol;
                }
            }
        }
    
        // Group by currency
        $groupedByCurrency = [];
        foreach ($balances as $currencyCode => $members) {
            foreach ($members as $memberId => $data) {
                if ($data['amount'] > 0) {
                    if (!isset($groupedByCurrency[$currencyCode])) {
                        $groupedByCurrency[$currencyCode] = [
                            'symbol' => $data['currency_symbol'],
                            'amounts' => [],
                        ];
                    }
                    
                    $groupedByCurrency[$currencyCode]['amounts'][$memberId] = [
                        'name' => $group->members->firstWhere('id', $memberId)->name,
                        'amount' => $data['amount'],
                    ];
                }
            }
        }
    
        // Serialize the oweMe list into Markdown-friendly format
        $oweMeList = '';
        foreach ($groupedByCurrency as $currencyCode => $data) {
            $currencySymbol = $data['symbol'];
            $amounts = $data['amounts'];
        
            $oweMeList .= "### Currency: {$currencySymbol} ({$currencyCode})\n";
            foreach ($amounts as $memberId => $amountData) {
                $amountFormatted = number_format($amountData['amount'], 2); // Format amount with 2 decimal places
                $oweMeList .= "- **{$amountData['name']}** owes you **{$currencySymbol}{$amountFormatted}**\n";
            }
            $oweMeList .= "\n";
        }
        
        if (empty($oweMeList)) {
            $oweMeList = "No one owes you anything.";
        }
        
        return response()->json([
            'success' => true,
            'message' => "You owe me list:\n\n" . $oweMeList,
            'data' => $groupedByCurrency,
        ]);
        
    }    

    public function getOweYouList(StoreOweYouRequest $request)
    {
        $data = $request->validated();
        $groupId = $data['group_id'];

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

        return response()->json([
            'success' => true,
            'message' => "I owe you list: $oweYouList",
            'data' => $oweYou,
        ]);
    }
    
}
