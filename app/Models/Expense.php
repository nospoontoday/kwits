<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Expense extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = ['id', 'group_id', 'created_by', 'description', 'amount', 'expense_date'];
    public $incrementing = false;
    protected $keyType = 'string';

    public function splits()
    {
        return $this->hasMany(ExpenseSplit::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
