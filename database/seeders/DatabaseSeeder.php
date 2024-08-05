<?php

namespace Database\Seeders;

use App\Models\Conversation;
use App\Models\Group;
use App\Models\Message;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Create the owner user
        $owner = User::factory()->create([
            'name' => 'John Doe',
            'email' => 'john@example.com',
            'password' => bcrypt('password'),
            'is_admin' => true,
        ]);

        // Create another specific user
        User::factory()->create([
            'name' => 'Jane Doe',
            'email' => 'jane@example.com',
            'password' => bcrypt('password'),
        ]);

        // Create 10 random users
        User::factory(10)->create();

        // Create 5 groups
        for ($i = 0; $i < 5; $i++) {
            $group = Group::factory()->create([
                'owner_id' => $owner->id,
            ]);

            // Add random users to the group, including the owner
            $randomUsers = User::inRandomOrder()->limit(rand(2, 5))->pluck('id')->toArray();
            $groupMembers = array_unique(array_merge([$owner->id], $randomUsers));
            $group->members()->attach($groupMembers);
        }

        // Create 1000 messages
        Message::factory(1000)->create();

        // Retrieve messages without a group and order them by creation date
        $messages = Message::whereNull('group_id')->orderBy('created_at')->get();

        // Debug: Check message count and sample data
        echo 'Total messages: ' . $messages->count() . PHP_EOL;
        echo 'Sample messages: ' . $messages->take(5)->toJson() . PHP_EOL;

        // Group messages by sender and receiver pair
        $conversations = $messages->groupBy(function ($message) {
            return collect([$message->sender_id, $message->receiver_id])->sort()->implode('_');
        });

        // Debug: Check grouped conversations
        echo 'Grouped conversations count: ' . $conversations->count() . PHP_EOL;

        // Prepare conversations for insertion
        $conversationData = $conversations->map(function ($groupedMessages) {
            return [
                'id' => (string) \Illuminate\Support\Str::uuid(), // Ensure UUID is generated
                'user_id1' => $groupedMessages->first()->sender_id,
                'user_id2' => $groupedMessages->first()->receiver_id,
                'last_message_id' => $groupedMessages->last()->id,
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ];
        })->values();

        // Debug: Check conversation data
        echo 'Conversation data: ' . $conversationData->toJson() . PHP_EOL;

        // Insert or ignore conversations
        Conversation::insertOrIgnore($conversationData->toArray());
    }
}
