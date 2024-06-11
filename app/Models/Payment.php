<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = ['id', 'group_id', 'from_user_id', 'to_user_id', 'amount', 'payment_date'];
    public $incrementing = false;
    protected $keyType = 'string';
}
