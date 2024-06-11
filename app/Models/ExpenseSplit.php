<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ExpenseSplit extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = ['id', 'expense_id', 'user_id', 'amount'];
    public $incrementing = false;
    protected $keyType = 'string';

    public function expense()
    {
        return $this->belongsTo(Expense::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
