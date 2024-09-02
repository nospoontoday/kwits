import { Link, usePage } from '@inertiajs/react';
import UserAvatar from "./UserAvatar";
import GroupAvatar from "./GroupAvatar";
import UserOptionsDropdown from "./UserOptionsDropdown";
import { formatMessageDateShort } from '@/helpers';

const ConversationItem = ({
    conversation,
    selectedConversation = null,
    online = null,
}) => {
    const page = usePage();
    const currentUser = page.props.auth.user.data;

    const isSelected = selectedConversation?.id === conversation.id;
    const isGroup = conversation.is_group;
    const isUser = conversation.is_user;
    const isBlocked = isUser && conversation.blocked_at;
    const isAdmin = currentUser.is_admin;

    const classes = `
        conversation-item flex items-center gap-2 p-2 text-gray-300 transition-all cursor-pointer border-l-4
        ${isSelected ? 'border-blue-500 bg-black/20' : 'border-transparent'}
        ${isUser && isAdmin ? 'pr-2' : 'pr-4'}
        ${isBlocked ? 'opacity-50' : ''}
        hover:bg-black/30
    `;

    const linkRoute = isGroup ? 'chat.group' : 'chat.user';

    return (
        <Link
            href={route(linkRoute, conversation)}
            preserveState
            className={classes}
        >
            {isUser && <UserAvatar user={conversation} online={online} />}
            {isGroup && <GroupAvatar />}
            
            <div className="flex-1 text-xs max-w-full overflow-hidden">
                <div className="flex justify-between items-center gap-1">
                    <h3 className="text-sm font-semibold overflow-hidden text-nowrap text-ellipsis">
                        {conversation.name}
                    </h3>
                    {conversation.last_message_date && (
                        <span className="text-nowrap">
                            {formatMessageDateShort(conversation.last_message_date)}
                        </span>
                    )}
                </div>
                {conversation.last_message && (
                    <p className="text-xs overflow-hidden text-nowrap text-ellipsis">
                        {conversation.last_message}
                    </p>
                )}
            </div>
            
            {isAdmin && isUser && (
                <UserOptionsDropdown conversation={conversation} />
            )}
        </Link>
    );
}

export default ConversationItem;
