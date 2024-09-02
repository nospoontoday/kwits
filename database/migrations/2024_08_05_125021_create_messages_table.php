<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up()
    {
        Schema::create('messages', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('sender_id');
            $table->uuid('group_id')->nullable();
            $table->uuid('conversation_id')->nullable();
            $table->uuid('receiver_id')->nullable();
            $table->longText('message')->nullable();
            $table->uuid('expense_id')->nullable();
            $table->string('type')->default('text'); // Can be 'text', 'expense', 'info', etc.
            $table->timestamps();

            $table->foreign('group_id')->references('id')->on('groups');
            $table->foreign('conversation_id')->references('id')->on('conversations');
            $table->foreign('sender_id')->references('id')->on('users');
            $table->foreign('receiver_id')->references('id')->on('users');
            $table->foreign('expense_id')->references('id')->on('expenses');
        });

        Schema::table('groups', function (Blueprint $table) {
            $table->uuid('last_message_id')->nullable();

            $table->foreign('last_message_id')->references('id')->on('messages');
        });
    
        Schema::table('conversations', function (Blueprint $table) {
            $table->uuid('last_message_id')->nullable();

            $table->foreign('last_message_id')->references('id')->on('messages');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('messages');
    }
};
