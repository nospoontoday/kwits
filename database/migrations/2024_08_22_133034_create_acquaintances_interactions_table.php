<?php


use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Multicaret\Acquaintances\Interaction;
use Illuminate\Support\Facades\Schema;
class CreateAcquaintancesInteractionsTable extends Migration
{
    /**
     * Run the migrations.
     */
    public function up()
    {
        Schema::create(config('acquaintances.tables.interactions', 'interactions'), function (Blueprint $table) {
            $table->id();

            $userModel = Interaction::getUserModelName();
            $userModel = new $userModel;
            $userIdFkColumnName = config('acquaintances.tables.interactions_user_id_fk_column_name', 'user_id');

            // Define the user ID column as a UUID
            $table->uuid($userIdFkColumnName)->index();
            $table->morphs('subject');
            $table->string('relation')->default('follow')->comment('follow/like/subscribe/favorite/upvote/downvote');
            $table->double('relation_value')->nullable();
            $table->string('relation_type')->nullable();
            $table->timestamps();

            // Set up the foreign key constraint
            $table->foreign($userIdFkColumnName)
                  ->references($userModel->getKeyName())
                  ->on($userModel->getTable())
                  ->onUpdate('cascade')
                  ->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down()
    {
        Schema::table(config('acquaintances.tables.interactions', 'interactions'), function ($table) {
            $table->dropForeign(config('acquaintances.tables.interactions', 'interactions').'_user_id_foreign');
        });

        Schema::drop(config('acquaintances.tables.interactions', 'interactions'));
    }
}
