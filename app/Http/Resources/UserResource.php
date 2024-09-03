<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class UserResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        // Determine if the avatar is a URL or a path
        $avatarUrl = $this->avatar;

        if ($avatarUrl) {
            // Check if the avatar URL is already a full URL
            if (filter_var($avatarUrl, FILTER_VALIDATE_URL) !== false) {
                // It's a valid URL, use it directly
                $avatarUrl = $avatarUrl;
            } else {
                // It's a file path, use Storage to get the URL
                $avatarUrl = Storage::url($avatarUrl);
            }
        }

        return [
            'id' => $this->id,
            'avatar_url' => $avatarUrl,
            'name' => $this->name,
            'email' => $this->email,
            'public_key' => $this->public_key,
            'iv' => $this->iv,
            'pin_iv' => $this->pin_iv,
            'salt' => $this->salt,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'is_admin' => (bool) $this->is_admin,
            'has_created_pin' => (bool) $this->has_created_pin,
            'last_message' => $this->last_message,
            'last_message_date' => $this->last_message_date,
        ];
    }
}
