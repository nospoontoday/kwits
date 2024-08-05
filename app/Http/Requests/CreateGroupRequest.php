<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Validation\Rule;

class CreateGroupRequest extends FormRequest
{
    public function authorize()
    {
        return true; // Set to true to allow all users to create groups
    }

    public function rules()
    {
        return [
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('groups')->where(function ($query) {
                    return $query->where('owner_id', $this->user()->id);
                }),
            ],
        ];
    }

    public function messages()
    {
        return [
            'name.unique' => 'You already have a group with this name.',
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
