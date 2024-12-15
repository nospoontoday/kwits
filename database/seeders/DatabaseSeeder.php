<?php

namespace Database\Seeders;

use App\Models\Conversation;
use App\Models\Currency;
use App\Models\Group;
use App\Models\Message;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\App;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $currencies = [
            ['code' => 'usd', 'symbol' => '$'],
            ['code' => 'eur', 'symbol' => '€'],
            ['code' => 'gbp', 'symbol' => '£'],
            ['code' => 'jpy', 'symbol' => '¥'],
            ['code' => 'aud', 'symbol' => 'A$'],
            ['code' => 'cad', 'symbol' => 'C$'],
            ['code' => 'chf', 'symbol' => 'CHF'],
            ['code' => 'cny', 'symbol' => '¥'],
            ['code' => 'sek', 'symbol' => 'kr'],
            ['code' => 'nzd', 'symbol' => 'NZ$'],
            ['code' => 'mxn', 'symbol' => '$'],
            ['code' => 'sgd', 'symbol' => 'S$'],
            ['code' => 'hkd', 'symbol' => 'HK$'],
            ['code' => 'krw', 'symbol' => '₩'],
            ['code' => 'inr', 'symbol' => '₹'],
            ['code' => 'brl', 'symbol' => 'R$'],
            ['code' => 'zar', 'symbol' => 'R'],
            ['code' => 'rub', 'symbol' => '₽'],
            ['code' => 'try', 'symbol' => '₺'],
            ['code' => 'dkk', 'symbol' => 'kr'],
            ['code' => 'nok', 'symbol' => 'kr'],
            ['code' => 'myr', 'symbol' => 'RM'],
            ['code' => 'idr', 'symbol' => 'Rp'],
            ['code' => 'thb', 'symbol' => '฿'],
            ['code' => 'php', 'symbol' => '₱'],
            ['code' => 'twd', 'symbol' => 'NT$'],
            ['code' => 'kzt', 'symbol' => '₸'],
        ];

        if (App::environment('local')) {
            // // Run the full seeder only in local environment

            // // Create the owner user
            // $owner = User::factory()->create([
            //     'name' => 'John Doe',
            //     'email' => 'oliverjohnpr2013@gmail.com',
            //     'password' => bcrypt('password'),
            //     'is_admin' => true,
            // ]);

            // // Create another specific user
            // User::factory()->create([
            //     'name' => 'Jane Doe',
            //     'email' => 'jane@example.com',
            //     'password' => bcrypt('password'),
            // ]);

            // // Create 10 random users
            // User::factory(10)->create();

            // // Create 5 groups
            // for ($i = 0; $i < 5; $i++) {
            //     $group = Group::factory()->create([
            //         'owner_id' => $owner->id,
            //     ]);

            //     // Add random users to the group, including the owner
            //     $randomUsers = User::inRandomOrder()->limit(rand(2, 5))->pluck('id')->toArray();
            //     $groupMembers = array_unique(array_merge([$owner->id], $randomUsers));
            //     $group->members()->attach($groupMembers);
            // }

            // foreach ($currencies as $currency) {
            //     Currency::updateOrCreate(['code' => $currency['code']], ['symbol' => $currency['symbol']]);
            // }

            // //Create 1000 messages
            // Message::factory(1000)->create();

            // // Retrieve messages without a group and order them by creation date
            // $messages = Message::whereNull('group_id')->orderBy('created_at')->get();

            // // Group messages by sender and receiver pair
            // $conversations = $messages->groupBy(function ($message) {
            //     return collect([$message->sender_id, $message->receiver_id])->sort()->implode('_');
            // });

            // // Prepare conversations for insertion
            // $conversationData = $conversations->map(function ($groupedMessages) {
            //     return [
            //         'id' => (string) \Illuminate\Support\Str::uuid(), // Ensure UUID is generated
            //         'user_id1' => $groupedMessages->first()->sender_id,
            //         'user_id2' => $groupedMessages->first()->receiver_id,
            //         'last_message_id' => $groupedMessages->last()->id,
            //         'created_at' => Carbon::now(),
            //         'updated_at' => Carbon::now(),
            //     ];
            // })->values();

            // // Insert or ignore conversations
            // Conversation::insertOrIgnore($conversationData->toArray());

        } else {


        }

        foreach ($currencies as $currency) {
            Currency::updateOrCreate(['code' => $currency['code']], ['symbol' => $currency['symbol']]);
        }
    }
}
