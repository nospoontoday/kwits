<?php

namespace App\Http\Controllers;

use App\Events\SocketMessage;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\CreateExpenseRequest;
use App\Http\Resources\MessageResource;
use App\Http\Resources\UserResource;
use App\Models\Currency;
use App\Models\Message;
use App\Models\Expense;
use App\Models\ExpenseMember;
use App\Models\Group;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ExpenseController extends Controller
{
    public function store(CreateExpenseRequest $request)
    {
        try {
            $data = $request->validated();
    
            $group = Group::findOrFail($request->group_id);
            $expense = Expense::create([
                'group_id' => $data['group_id'],
                'user_id' => Auth::id(),
                'description' => $data['description'],
                'amount' => $data['amount'],
                'expense_date' => $data['expense_date'],
                'split_type' => $data['split_type'],
                'currency' => $data['currency'],
            ]);
    
            $amountPerMember = null;
            switch ($request->split_type) {
                case 'equally':
                    $amountPerMember = $request->amount / $group->members()->count();
                    foreach ($group->members as $member) {
                        ExpenseMember::create([
                            'expense_id' => $expense->id,
                            'user_id' => $member->id,
                            'amount' => $amountPerMember,
                        ]);
                    }
                    break;
    
                case 'exact':
                    foreach ($request->exact_amounts as $exactAmount) {
                        ExpenseMember::create([
                            'expense_id' => $expense->id,
                            'user_id' => $exactAmount['user_id'],
                            'amount' => $exactAmount['amount'],
                        ]);
                    }
                    break;
    
                case 'single_payer':
                    ExpenseMember::create([
                        'expense_id' => $expense->id,
                        'user_id' => Auth::id(),
                        'amount' => $request->amount,
                    ]);
                    break;
    
                case 'full_amount_each':
                    foreach ($group->members as $member) {
                        ExpenseMember::create([
                            'expense_id' => $expense->id,
                            'user_id' => $member->id,
                            'amount' => $request->amount,
                        ]);
                    }
                    break;
            }
    
            $currency = Currency::where('code', $request->currency)->first();
            $currencyCode = strtoupper($request->currency);
            $currencySymbol = strtoupper($currency->symbol);

            // Generate the list of involved members
            $memberNames = $group->members->map(function ($member) {
                return "- **{$member->name}**";
            })->implode("\n");

            $amountPerMemberMessage = $amountPerMember ? "\n\n**Amount per Member:** {$currencyCode} {$currencySymbol}" . number_format($amountPerMember, 2) : '';

            return response()->json([
                'success' => true,
                'message' => "### ✅ **Expense Created!**\n\n" .
                            "**Description:** {$request->description}\n\n" .
                            "**Amount:** **{$currencyCode} {$currencySymbol}{$request->amount}**\n\n" .
                            "**Split Type:** **{$request->split_type}**" .
                            "{$amountPerMemberMessage}\n\n" .
                            "### **Involved Members:**\n" .
                            "{$memberNames}",
                'expense_id' => $expense->id,
                'description' => $request->description,
            ]);
    
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => '🚫 Failed to create expense.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    // Get summary of "I owe you" and "You owe me" for each user in each currency
    public function getSummary(Request $request)
    {
        // Validate the incoming request
        $data = $request->validate([
            'group_id' => 'required|exists:groups,id',
        ]);

        $groupId = $data['group_id'];

        // Load the group with related members, expenses, and payments
        $group = Group::with(['members', 'expenses.members', 'payments'])->findOrFail($groupId);

        // Initialize arrays to track balances by currency
        $balances = [];

        // Loop through each expense in the group
        foreach ($group->expenses as $expense) {
            $payerId = $expense->user_id;
            $currency = $expense->currency;

            // Get all members who owe for this expense
            foreach ($expense->members as $expenseMember) {
                $memberId = $expenseMember->user_id;
                $amountOwed = $expenseMember->amount;

                // Skip the payer themselves
                if ($memberId == $payerId) {
                    continue;
                }

                // Update the net balance between payer and member
                if (!isset($balances[$currency][$memberId][$payerId])) {
                    $balances[$currency][$memberId][$payerId] = 0;
                }
                if (!isset($balances[$currency][$payerId][$memberId])) {
                    $balances[$currency][$payerId][$memberId] = 0;
                }

                // The member owes the payer
                $balances[$currency][$memberId][$payerId] += $amountOwed;

                // The payer is owed by the member (negative balance)
                $balances[$currency][$payerId][$memberId] -= $amountOwed;
            }
        }

        // Adjust balances based on payments
        $currencies = Currency::all()->keyBy('code');
        foreach ($group->payments as $payment) {
            $currencyCode = $payment->currency_code;
            $currencySymbol = $currencies->get($currencyCode)->symbol;
            $payerId = $payment->payer_id;
            $payeeId = $payment->payee_id;
            $amount = $payment->amount;

            // If the payer made a payment, reduce the amount owed by them
            if (isset($balances[$currencyCode][$payeeId][$payerId])) {
                $balances[$currencyCode][$payeeId][$payerId] -= $amount;
            }

            // If the payee received a payment, reduce the amount owed to them
            if (isset($balances[$currencyCode][$payerId][$payeeId])) {
                $balances[$currencyCode][$payerId][$payeeId] += $amount;
            }
        }

        // Prepare the output summary, grouped by currency
        $summary = [];

        foreach ($balances as $currency => $balance) {
            $currencyUpper = strtoupper($currency);
            foreach ($balance as $userId => $userBalance) {
                foreach ($userBalance as $otherUserId => $netAmount) {
                    if ($netAmount > 0) {
                        $summary[$currencyUpper][] = [
                            "user" => new UserResource($group->members->find($userId)),
                            "expense_bearer" => new UserResource($group->members->find($otherUserId)),
                            "amount" => number_format($netAmount, 2),
                            "currency" => $currencyUpper,
                        ];
                    }
                }
            }
        }

        return response()->json($summary);
    }

}
