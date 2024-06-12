<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;


class Expense extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = ['id', 'group_id', 'user_id', 'description', 'amount', 'expense_date', 'split_type'];

    public $incrementing = false; // Disable auto-incrementing
    protected $keyType = 'string'; // Set the primary key type to string

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->{$model->getKeyName()})) {
                $model->{$model->getKeyName()} = (string) Str::uuid();
            }
        });
    }

    public function group()
    {
        return $this->belongsTo(Group::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function members()
    {
        return $this->hasMany(ExpenseMember::class);
    }
}
