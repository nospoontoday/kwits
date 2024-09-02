<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Group extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = ['name', 'owner_id', 'description', 'last_message_id', 'default_currency'];
    public $incrementing = false;
    protected $keyType = 'string';

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->{$model->getKeyName()})) {
                $model->{$model->getKeyName()} = (string) Str::uuid();
            }
        });
    }

    public function members()
    {
        return $this->belongsToMany(User::class, 'group_members');
    }

    public function expenses()
    {
        return $this->hasMany(Expense::class);
    }

    public function messages()
    {
        return $this->hasMany(Message::class);
    }

    public function owner()
    {
        return $this->belongsTo(User::class);
    }

    public function lastMessage()
    {
        return $this->belongsTo(Message::class, 'last_message_id');
    }

    public function payments()
    {
        return $this->hasMany(Payment::class);
    }

    public static function getGroupsForUser(User $user)
    {
        $query = self::select([
                    'groups.*',
                    'messages.message as last_message',
                    'messages.created_at as last_message_date',
                    // 'messages.iv as last_message_iv',
                    // 'messages.key as last_message_key'
                ])
                ->join('group_members', 'group_members.group_id', '=', 'groups.id')
                ->leftJoin('messages', 'messages.id', '=', 'groups.last_message_id')
                ->where('group_members.user_id', $user->id)
                ->orderBy('messages.created_at', 'desc')
                ->orderBy('groups.name');
    
        return $query->get();
    }
    

    public function toConversationArray()
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'description' => $this->description,
            'default_currency' => $this->default_currency,
            'is_user' => false,
            'is_group' => true,
            'owner_id' => $this->owner_id,
            'users' => $this->members,
            'user_ids' => $this->members->pluck('id'),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'last_message' => $this->last_message,
            'last_message_date' => $this->last_message_date ? ($this->last_message_date . ' UTC') : null,
        ];
    }

    public static function updateGroupWithMessage($groupId, $message)
    {
        return self::updateOrCreate(
            ['id' => $groupId],
            ['last_message_id' => $message->id],
        );
    }
}
