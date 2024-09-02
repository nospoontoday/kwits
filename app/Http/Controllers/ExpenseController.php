<?php

namespace App\Http\Controllers;

use App\Events\SocketMessage;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\CreateExpenseRequest;
use App\Http\Resources\MessageResource;
use App\Models\Currency;
use App\Models\Message;
use App\Models\Expense;
use App\Models\ExpenseMember;
use App\Models\Group;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Illuminate\Http\Request;

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
}
