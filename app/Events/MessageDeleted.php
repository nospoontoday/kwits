<?php

namespace App\Events;

use App\Http\Resources\MessageResource;
use App\Models\Message;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MessageDeleted implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $prevMessage;
    public $deletedMessage;

    /**
     * Create a new event instance.
     */
    public function __construct(array $messages)
    {
        $this->prevMessage = $messages['prevMessage'];
        $this->deletedMessage = $messages['deletedMessage'];
    }

    public function broadCastWith()
    {
        return [
            'message' => $this->deletedMessage ? new MessageResource($this->deletedMessage) : null,
            'prevMessage' => $this->prevMessage ? new MessageResource($this->prevMessage) : null,
        ];
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        $message = $this->deletedMessage;
        $channels = [];

        if($message->group_id) {
            $channels[] = new PrivateChannel('message.group.' . $message->group_id);
        } else {
            $channels[] = new PrivateChannel('message.user.' . collect([
                    $message->sender_id,
                    $message->receiver_id
                ])
                ->sort()
                ->implode('.'));
        }

        return $channels;
    }
}
