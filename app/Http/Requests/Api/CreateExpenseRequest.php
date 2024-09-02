<?php

namespace App\Http\Requests\Api;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

class CreateExpenseRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        return [
            'group_id' => 'required|exists:groups,id',
            'description' => 'required|string|max:255',
            'amount' => 'required|numeric|min:0.01',
            'currency' => 'required',
            'expense_date' => 'required|date',
            'split_type' => 'required|in:equally,exact,single_payer,full_amount_each',
            'exact_amounts' => 'required_if:split_type,exact|array',
            'exact_amounts.*.user_id' => 'required_with:exact_amounts|exists:users,id',
            'exact_amounts.*.amount' => 'required_with:exact_amounts|numeric|min:0.01',
        ];
    }

    protected function failedValidation(Validator $validator)
    {
        throw new HttpResponseException(response()->json([
            'success' => false,
            'message' => 'Validation errors',
            'errors' => $validator->errors()
        ], 422));
    }
}
