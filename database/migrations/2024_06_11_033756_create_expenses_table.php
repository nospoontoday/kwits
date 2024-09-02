<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('expenses', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('group_id');
            $table->uuid('user_id'); // The user who created the expense
            $table->string('description');
            $table->decimal('amount', 10, 2);
            $table->string('currency')->default('php');
            $table->decimal('conversion_rate', 10, 2)->nullable();
            $table->decimal('amount_in_default_currency')->nullable();
            $table->date('expense_date');
            $table->enum('split_type', ['equally', 'exact', 'single_payer', 'full_amount_each'])->default('equally');
            $table->timestamps();

            $table->foreign('group_id')->references('id')->on('groups')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
        });
    }

    public function down()
    {
        Schema::dropIfExists('expenses');
    }
};
