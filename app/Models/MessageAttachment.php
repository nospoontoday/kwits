<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MessageAttachment extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = ['message_id', 'name', 'path', 'mime', 'size'];

    public $incrementing = false;
    protected $keyType = 'string';
}
