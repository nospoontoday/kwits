<?php

use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('online', function (User $user) {
    return $user ? new UserResource($user) : null;
});

Broadcast::channel('message.user.{userId1}.{userId2}', function(User $user, string $userId1, string $userId2) {
    return $user->id == $userId1 || $user->id == $userId2 ? $user : null;
});

Broadcast::channel('message.group.{groupId}', function(User $user, string $groupId) {
    return $user->groups->contains('id', $groupId) ? $user : null;
});