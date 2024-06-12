<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('group_members', function (Blueprint $table) {
            $table->id();
            $table->uuid('group_id');
            $table->uuid('user_id');
            $table->foreign('group_id')->references('id')->on('groups')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->timestamps();

            // Ensure that a user cannot be added to the same group more than once
            $table->unique(['group_id', 'user_id']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('group_members');
    }
};
