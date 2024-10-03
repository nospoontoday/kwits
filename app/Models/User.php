<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Laravel\Passport\HasApiTokens;
use Illuminate\Support\Str;
use Multicaret\Acquaintances\Traits\Friendable;

class User extends Authenticatable
{
    use HasFactory, Notifiable, HasUuids, HasApiTokens, Friendable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'avatar',
        'email_verified_at',
        'is_admin',
        'has_created_pin',
        'public_key',
        'private_key',
        'iv',
        'pin_iv',
        'salt',
        'provider',
        'provider_id',
        'provider_token',
        'device_token',
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'private_key',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->{$model->getKeyName()})) {
                $model->{$model->getKeyName()} = (string) Str::uuid();
            }
        });
    }

    public function expenses()
    {
        return $this->hasMany(Expense::class, 'owner_id');
    }

    public function expenseSplits()
    {
        return $this->hasMany(ExpenseSplit::class);
    }

    public function paymentsSent()
    {
        return $this->hasMany(Payment::class, 'from_user_id');
    }

    public function paymentsReceived()
    {
        return $this->hasMany(Payment::class, 'to_user_id');
    }

    public function contacts()
    {
        return $this->hasMany(Contact::class);
    }

    public function sentMessages()
    {
        return $this->hasMany(Message::class, 'sender_id');
    }

    public function receivedMessages()
    {
        return $this->hasMany(Message::class, 'receiver_id');
    }

    public function contactOf()
    {
        return $this->hasMany(Contact::class, 'contact_id');
    }

    public function groups()
    {
        return $this->belongsToMany(Group::class, 'group_members');
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public static function getUsersExceptUserWithFriends(User $user, array $friendIds)
    {
        $userId = $user->id;
    
        $query = self::select([
                    'users.*',
                    'messages.message as last_message',
                    'messages.created_at as last_message_date'
                ])
                ->where('users.id', '!=', $userId)
                ->where(function($query) use ($userId, $friendIds) {
                    // Include friends regardless of interaction
                    $query->whereIn('users.id', $friendIds)
                    // Include users with whom the user has exchanged messages
                    ->orWhereHas('sentMessages', function($q) use ($userId) {
                        $q->where('receiver_id', $userId);
                    })->orWhereHas('receivedMessages', function($q) use ($userId) {
                        $q->where('sender_id', $userId);
                    });
                })
                ->leftJoin('conversations', function($join) use ($userId) {
                    $join->on('conversations.user_id1', '=', 'users.id')
                        ->where('conversations.user_id2', '=', $userId)
                        ->orWhere(function ($query) use ($userId) {
                            $query->on('conversations.user_id2', '=', 'users.id')
                                ->where('conversations.user_id1', '=', $userId);
                        });
                })
                ->leftJoin('messages', 'messages.id', '=', 'conversations.last_message_id')
                ->orderByRaw('IFNULL(users.blocked_at, 1)')
                ->orderBy('messages.created_at', 'desc')
                ->orderBy('users.name');
    
        return $query->get();
    }

    public function toConversationArray()
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
            'is_group' => false,
            'is_user' => true,
            'is_admin' => (bool) $this->is_admin,
            // 'has_created_pin' => (bool) $this->has_created_pin,
            'public_key' => $this->public_key,
            // 'device_token' => $this->device_token,
            // 'iv' => $this->iv,
            // 'pin_iv' => $this->pin_iv,
            // 'salt' => $this->salt,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'blocked_at' => $this->blocked_at,
            'last_message' => $this->last_message,
            'last_message_date' => $this->last_message_date ? ($this->last_message_date . ' UTC') : null,
        ];
    }
}
