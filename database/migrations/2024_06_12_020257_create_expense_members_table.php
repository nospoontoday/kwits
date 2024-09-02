<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('expense_members', function (Blueprint $table) {
            $table->id();
            $table->uuid('expense_id');
            $table->uuid('user_id');
            $table->decimal('amount', 10, 2);
            $table->decimal('amount_in_default_currency')->nullable();
            $table->timestamps();

            $table->foreign('expense_id')->references('id')->on('expenses')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
        });
    }

    public function down()
    {
        Schema::dropIfExists('expense_members');
    }
};
