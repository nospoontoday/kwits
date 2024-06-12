<?php

namespace App\Http\Controllers\Api;

use App\Models\Contact;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\AcceptContactRequest;
use App\Http\Requests\Api\SendContactRequest;

class ContactController extends Controller
{
    public function sendRequest(SendContactRequest $request)
    {
        $contactUser = User::where('email', $request->email)->first();

        if (Auth::id() == $contactUser->id) {
            return response()->json([
                'success' => false,
                'message' => 'You cannot add yourself as a contact.',
            ], 400);
        }

        $existingContact = Contact::where('user_id', Auth::id())
            ->where('contact_id', $contactUser->id)
            ->where('status', 'pending')
            ->first();

        if ($existingContact) {
            return response()->json([
                'success' => false,
                'message' => 'A contact request is already pending.',
            ], 400);
        }

        $contact = Contact::updateOrCreate(
            [
                'user_id' => Auth::id(),
                'contact_id' => $contactUser->id,
            ],
            [
                'status' => 'pending'
            ]
        );

        return response()->json([
            'success' => true,
            'message' => 'Contact request sent successfully.',
            'data' => $contact,
        ], 201);
    }

    public function acceptRequest(AcceptContactRequest $request)
    {
        $contactId = $request->contact_id;

        $contact = Contact::where('contact_id', Auth::id())
            ->where('user_id', $contactId)
            ->where('status', 'pending')
            ->first();

        if (!$contact) {
            return response()->json([
                'success' => false,
                'message' => 'No pending contact request found.',
            ], 404);
        }

        $contact->status = 'accepted';
        $contact->save();

        return response()->json([
            'success' => true,
            'message' => 'Contact request accepted.',
            'data' => $contact,
        ]);
    }
}
