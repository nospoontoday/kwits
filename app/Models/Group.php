<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Group extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = ['id', 'name', 'created_by'];
    public $incrementing = false;
    protected $keyType = 'string';

    /**
     * The user who created the group.
     */
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * The members of the group.
     */
    public function members()
    {
        return $this->hasMany(GroupMember::class);
    }
}
