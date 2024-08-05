<?php

namespace Database\Factories;

use App\Models\Group;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Message>
 */
class MessageFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $receiver = User::where('email', 'john@example.com')->first();
        $senderId = $this->faker->randomElement([0, $receiver->id]);
        if($senderId === 0) {
            $senderId = $this->faker->randomElement(User::where('id', '!=', $receiver->id)->pluck('id')->toArray());
            $receiverId = $receiver->id;
        } else {
            $receiverId = $this->faker->randomElement(User::pluck('id')->toArray());
        }

        $groupId = null;
        if($this->faker->boolean(50)) {
            $groupId = $this->faker->randomElement(Group::pluck('id')->toArray());
            $group = Group::find($groupId);
            $senderId = $this->faker->randomElement($group->members->pluck('id')->toArray());
            $receiverId = null;
        }

        return [
            'sender_id' => $senderId,
            'receiver_id' => $receiverId,
            'group_id' => $groupId,
            'message' => $this->faker->realText(200),
            'created_at' => $this->faker->dateTimeBetween('-1 year', 'now'),
        ];
    }
}
