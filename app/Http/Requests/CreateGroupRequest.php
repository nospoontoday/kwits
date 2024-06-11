<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CreateGroupRequest extends FormRequest
{
    public function authorize()
    {
        return true; // Set to true to allow all users to create groups
    }

    public function rules()
    {
        return [
            'name' => 'required|string|max:255',
        ];
    }
}
