<x-mail::message>
Hello {{ $user->name }},

@if($user->is_admin)
You are now admin in Kwits. You can add and block users.
@else
Your role was changed to regular user. You are no longer able to add or block users.
@endif
<br>

Thank you, <br>
{{ config('app.name') }}
</x-mail::message>