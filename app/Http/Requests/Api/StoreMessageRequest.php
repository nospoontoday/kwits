<?php

namespace App\Http\Requests\Api;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

class StoreMessageRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        return [
            'group_id' => 'required_without:receiver_id|nullable|exists:groups,id',
            'receiver_id' => 'required_without:group_id|nullable|exists:users,id',
            'message' => 'nullable|string',
            // 'iv' => 'required|string',
            // 'key' => 'required|string',
            'attachments' => 'nullable|array|max:10',
            'attachments.*' => 'file|max:1024000',
            'type' => 'nullable',
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
