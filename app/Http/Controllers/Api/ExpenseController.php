<?php

namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\CreateExpenseRequest;
use App\Models\Expense;
use App\Models\ExpenseMember;
use App\Models\Group;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class ExpenseController extends Controller
{
    public function store(CreateExpenseRequest $request): JsonResponse
    {
        try {
            $group = Group::findOrFail($request->group_id);
            $expense = Expense::create([
                'group_id' => $request->group_id,
                'user_id' => Auth::id(),
                'description' => $request->description,
                'amount' => $request->amount,
                'expense_date' => $request->expense_date,
                'split_type' => $request->split_type,
            ]);

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

            return response()->json([
                'success' => true,
                'message' => 'Expense created and split according to the specified type.',
                'data' => $expense->load('members'),
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create expense.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
