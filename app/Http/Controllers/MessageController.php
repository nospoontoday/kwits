<?php

namespace App\Http\Controllers;

use App\Events\MessageDeleted;
use App\Events\SocketMessage;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreMessageRequest;
use App\Http\Resources\MessageResource;
use App\Models\Conversation;
use App\Models\Expense;
use App\Models\ExpenseMember;
use App\Models\Message;
use App\Models\Group;
use App\Models\MessageAttachment;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Google\Client as GoogleClient;
use Illuminate\Support\Facades\Log;

class MessageController extends Controller
{
    public function byUser(User $user)
    {
        $messages = Message::where('sender_id', auth()->id())
            ->where('receiver_id', $user->id)
            ->orWhere('sender_id', $user->id)
            ->where('receiver_id', auth()->id())
            ->latest()
            ->paginate(10);

        return inertia('Home', [
            'selectedConversation' => $user->toConversationArray(),
            'messages' => MessageResource::collection($messages),
        ]);
    }

    public function byGroup(Group $group)
    {
        $messages = Message::where('group_id', $group->id)
            ->latest()
            ->paginate(10);

        return inertia('Home', [
            'selectedConversation' => $group->toConversationArray(),
            'messages' => MessageResource::collection($messages),
        ]);
    }

    public function loadOlder(Message $message)
    {
        if($message->group_id) {
            $messages = Message::where('created_at', '<', $message->created_at)
                ->where('group_id', $message->group_id)
                ->latest()
                ->paginate(10);
        } else {
            $messages = Message::where('created_at', '<', $message->created_at)
                ->where(function($query) use ($message) {
                    $query->where('sender_id', $message->sender_id)
                        ->where('receiver_id', $message->receiver_id)
                        ->orWhere('sender_id', $message->receiver_id)
                        ->where('receiver_id', $message->sender_id);
                })
                ->latest()
                ->paginate(10);
        }

        return MessageResource::collection($messages);
    }

    public function destroy(Message $message)
    {
        // Ensure the authenticated user is the sender of the message
        if ($message->sender_id !== auth()->id()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }
    
        // Check if the message has an expense_id
        if ($message->expense_id) {
            $expense_id = $message->expense_id;

            //set message's expense_id equal to null;
            $message->expense_id = null;
            $message->save();

            // First, delete related ExpenseMember records
            ExpenseMember::where('expense_id', $expense_id)->delete();
    
            // Now delete the Expense record
            Expense::where('id', $expense_id)->delete();
        }
    
        $lastMessage = null;
        $conversation = null;
        $group = null;
    
        // Determine if the message belongs to a group or one-on-one conversation
        if ($message->group_id) {
            $group = Group::where('last_message_id', $message->id)->first();
    
            if ($group) {
                // Get the last message from the group before the current one
                $lastMessage = Message::where('group_id', $group->id)
                    ->where('id', '!=', $message->id)
                    ->latest()
                    ->first();
    
                // Update the group's last_message_id before deleting the message
                $group->last_message_id = $lastMessage ? $lastMessage->id : null;
                $group->save();
            }
        } else {
            $conversation = Conversation::where('last_message_id', $message->id)->first();
        }
    
        // Delete the message
        $message->delete();
    
        // If the message was in a one-on-one conversation
        if ($conversation) {
            // Get the last message from the conversation after deleting the current message
            $lastMessage = Message::where('id', '!=', $message->id)
                ->where(function ($query) use ($message) {
                    $query->where('sender_id', $message->sender_id)
                          ->where('receiver_id', $message->receiver_id)
                          ->orWhere('sender_id', $message->receiver_id)
                          ->where('receiver_id', $message->sender_id);
                })
                ->latest()
                ->first();
    
            // Delete the conversation if there are no more messages
            if (!$lastMessage) {
                $conversation->delete();
            } else {
                // Update the conversation with the new last message
                $conversation->last_message_id = $lastMessage->id;
                $conversation->save();
            }
        }
    
        // Dispatch an event to notify about the deleted message
        MessageDeleted::dispatch([
            'prevMessage' => $lastMessage ? new MessageResource($lastMessage) : null,
            'deletedMessage' => new MessageResource($message)
        ]);
    
        // Return a response indicating the result
        return response()->json(['message' => $lastMessage ? new MessageResource($lastMessage) : null]);
    }    

    public function store(StoreMessageRequest $request)
{
    try {
        $data = $request->validated();
        $data['sender_id'] = auth()->id();
        $receiverId = $data['receiver_id'] ?? null;
        $groupId = $data['group_id'] ?? null;
        $files = $data['attachments'] ?? [];

        $messageString = $data['message_string'];
        unset($data['message_string']);
        $message = Message::create($data);
        $attachments = [];

        if ($files) {
            foreach ($files as $key => $file) {
                $directory = 'attachments/' . Str::random(32);
                Storage::makeDirectory($directory);

                $model = [
                    'message_id' => $message->id,
                    'name' => $file->getClientOriginalName(),
                    'mime' => $file->getClientMimeType(),
                    'size' => $file->getSize(),
                    'path' => $file->store($directory, 'public'),
                ];

                $attachment = MessageAttachment::create($model);
                $attachments[] = $attachment;
            }

            $message->attachments = $attachments;
        }

        if ($receiverId) {
            Conversation::updateConversationWithMessage($receiverId, auth()->id(), $message);
        }

        if ($groupId) {
            Group::updateGroupWithMessage($groupId, $message);
        }

        SocketMessage::dispatch($message);

        if($receiverId) {
            $receiver = User::find($receiverId);

            $this->sendFirebaseNotification(
                $receiver->device_token, auth()->user()->name, $messageString
            );
        }

        if($groupId) {
            //get all users except auth
            $group = Group::find($groupId);

            foreach($group->members as $member) {
                if($member->id != auth()->id()) {
                    // Firebase push notification
                    $this->sendFirebaseNotification(
                        $member->device_token, auth()->user()->name, $messageString
                    );
                }
            }
        }

        return new MessageResource($message);

    } catch (\Throwable $th) {
        // Log the error for debugging
        Log::error('Error storing message: ' . $th->getMessage(), [
            'exception' => $th,
            'user_id' => auth()->id(),
            'request_data' => $request->all()
        ]);

        // Return a JSON response with a meaningful message
        return response()->json([
            'error' => 'An error occurred while sending the message.',
            'message' => $th->getMessage()
        ], 500);
    }
}

private function sendFirebaseNotification(string $firebaseToken, string $title, string $messageString)
{
    try {
        $title = $title;
        $description = $messageString;

        $credentialsPath = base_path("kwits-push-notification-firebase-adminsdk-f4qyk-c463c2d38f.json");

        $client = new GoogleClient();
        $client->setAuthConfig($credentialsPath);
        $client->addScope("https://www.googleapis.com/auth/firebase.messaging");
        $client->fetchAccessTokenWithAssertion();
        $token = $client->getAccessToken();

        $accessToken = $token['access_token'];

        $headers = [
            "Authorization: Bearer $accessToken",
            'Content-Type: application/json'
        ];

        $data = [
            "message" => [
                "token" => $firebaseToken,
                "notification" => [
                    "title" => $title,
                    "body" => $description,
                ]
            ]
        ];

        $payload = json_encode($data);

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, 'https://fcm.googleapis.com/v1/projects/kwits-push-notification/messages:send');
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
        curl_setopt($ch, CURLOPT_VERBOSE, true);

        curl_exec($ch);
        $err = curl_error($ch);
        curl_close($ch);

        if ($err) {
            Log::error("Firebase notification error: $err");
            throw new \Exception("Error sending Firebase notification: $err");
        }

    } catch (\Throwable $th) {
        throw $th;
    }
}

}
