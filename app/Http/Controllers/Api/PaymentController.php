<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\CreatePaymentRequest;
use App\Models\Group;
use App\Models\Payment;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class PaymentController extends Controller
{
    public function store(CreatePaymentRequest $request): JsonResponse
    {
        $userId = Auth::id();

        // Ensure the payee is not the payer
        if ($userId === $request->payee_id) {
            return response()->json([
                'success' => false,
                'message' => 'You cannot make a payment to yourself.',
            ], 400);
        }

        // Check if both users are part of the group
        $group = Group::with('members')->findOrFail($request->group_id);
        $isUserInGroup = $group->members->contains($userId);
        $isPayeeInGroup = $group->members->contains($request->payee_id);

        if (!$isUserInGroup || !$isPayeeInGroup) {
            return response()->json([
                'success' => false,
                'message' => 'Both the payer and the payee must be members of the group.',
            ], 400);
        }

        // Create the payment
        $payment = Payment::create([
            'id' => (string) Str::uuid(),
            'group_id' => $request->group_id,
            'payer_id' => $userId,
            'payee_id' => $request->payee_id,
            'amount' => $request->amount,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Payment made successfully.',
            'data' => $payment,
        ], 201);
    }
}
