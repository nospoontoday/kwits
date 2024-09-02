<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Validation\Rule;

class StoreGroupRequest extends FormRequest
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
            'description' => ['nullable', 'string'],
            'default_currency' => 'required',
            'user_ids' => ['nullable', 'array'],
            'user_ids.*' => ['string', 'exists:users,id'],
        ];
    }

    public function messages()
    {
        return [
            'name.unique' => 'You already have a group with this name.',
        ];
    }

    public function validated($key = null, $default = null)
    {
        $validated = parent::validated($key, $default);
        $validated['owner_id'] = $this->user()->id;
        return $validated;
    }
}
