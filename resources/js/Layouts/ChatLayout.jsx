import ConversationItem from "@/Components/App/ConversationItem";
import GroupModal from "@/Components/App/GroupModal";
import TextInput from "@/Components/TextInput";
import { useEventBus } from "@/EventBus";
import { PencilSquareIcon } from "@heroicons/react/24/solid";
import { router, usePage } from "@inertiajs/react";
import { useEffect, useState } from "react";

const ChatLayout = ({ children }) => {
    const page = usePage();
    const conversations = page.props.conversations;
    const selectedConversation = page.props.selectedConversation;
    const [localConversations, setLocalConversations] = useState([]);
    const [sortedConversations, setSortedConversations] = useState([]);
    const [onlineUsers, setOnlineUsers] = useState({});
    const [showGroupModal, setShowGroupModal] = useState(false);
    const { on, emit } = useEventBus();

    const isUserOnline = (userId) => onlineUsers[userId];

    const onSearch = (ev) => {
        const search = ev.target.value.toLowerCase();
        setLocalConversations(
            conversations.filter((conversation) => {
                return conversations.name.toLowerCase().includes(search);
            })
        )
    }

    const messageCreated = (message) => {
        setLocalConversations((oldUsers) => {
            return oldUsers.map((user) => {
                if(message.receiver_id && !user.is_group && (user.id == message.sender_id || user.id == message.receiver_id)) {
                    user.last_message = message.message;
                    user.last_message_date = message.created_at;
                    return user;
                }

                if(message.group_id && user.is_group && user.id == message.group_id) {
                    user.last_message = message.message;
                    user.last_message_date = message.created_at;
                    return user;
                }

                return user;
            })
        })
    }

    const messageDeleted = ({prevMessage}) => {
        if(!prevMessage) {
            return;
        }
        
        setLocalConversations((oldUsers) => {
            return oldUsers.map((u) => {
                if(prevMessage.receiver_id && !u.is_group && (u.id == prevMessage.sender_id || u.id == prevMessage.receiver_id)) {
                    u.last_message = prevMessage.message;
                    u.last_mesage_date = prevMessage.created_at;
                    return u;
                }

                if(prevMessage.group_id && u.is_group && u.id == prevMessage.group_id) {
                    u.last_message = prevMessage.message;
                    u.last_mesage_date = prevMessage.created_at;
                    return u;
                }

                return u;
            })
        })
    }

    useEffect(() => {
        const offCreated = on("message.created", messageCreated);
        const offDeleted = on("message.deleted", messageDeleted);
        const offModalShow = on("GroupModal.show", (group) => {
            setShowGroupModal(true);
        });
        const offGroupDelete = on("group.deleted", ({id, name}) => {
            setLocalConversations((olddConversations) => {
                return olddConversations.filter((con) => con.id != id);
            });

            emit('toast.show', `Group ${name} was deleted`);

            if(!selectedConversation || selectedConversation.is_group && selectedConversation.id == id) {
                router.visit(route("dashboard"));
            } else {
                console.log("Condition not met");
            }
        });

        return () => {
            offCreated();
            offDeleted();
            offModalShow();
            offGroupDelete();
        }
    }, [on])

    useEffect(() => {
        setSortedConversations(
            localConversations.sort((a, b) => {
                if(a.blocked_at && b.blocked_at) {
                    return a.blocked_at > b.blocked_at ? 1: -1;
                } else if (a.blocked_at) {
                    return 1;
                } else if (b.blocked_at) {
                    return -1;
                }

                if(a.last_message_date && b.last_message_date) {
                    return b.last_message_date.localeCompare(
                        a.last_message_date
                    );
                } else if (a.last_message_date) {
                    return -1;
                } else if(b.last_message_date) {
                    return 1;
                } else {
                    return 0;
                }
            })
        );
    }, [localConversations]);

    useEffect(() => {
        setLocalConversations(conversations);
    }, [conversations]);

    useEffect(() => {
        Echo.join('online')
            .here((users) => {
                const onlineUsersObj = Object.fromEntries(
                    users.map((user) => [user.id, user])
                );

                setOnlineUsers((previousOnlineUsers) => {
                    return {...previousOnlineUsers, ...onlineUsersObj };
                });
            })
            .joining((user) => {
                setOnlineUsers((previousOnlineUsers) => {
                    const updatedUsers = { ...previousOnlineUsers };
                    updatedUsers[user.id] = user;
                    return updatedUsers;
                });
            })
            .leaving((user) => {
                setOnlineUsers((previousOnlineUsers) => {
                    const updatedUsers = { ...previousOnlineUsers }
                    delete updatedUsers[user.id];
                    return updatedUsers;
                });
            })
            .error((error) => {
                console.error('error', error);
            })
    }, []);

    return (
        <>
            <div className="flex-1 w-full flex overflow-hidden">
            <div
    className={`transition-all w-full sm:w-[220px] md:w-[300px] bg-slate-800 flex flex-col overflow-hidden ${
        selectedConversation ? "sm:ml-0 -ml-[100%]" : ""
    }`}
>
                    <div className="flex items-center justify-between py-2 px-3 text-xl font-medium text-gray-200">
                        My Conversations
                        <div 
                            className="tooltip tooltip-left"
                            data-tip="Create new Group"
                        >
                            <button
                                onClick={ev => setShowGroupModal(true)}
                                className="text-gray-400 hover:text-gray-200"
                            >
                                <PencilSquareIcon className="w-4 h-4 inline-block l-2" />
                            </button>
                        </div>
                    </div>
                    <div className="p-3">
                        <TextInput
                            onKeyUp={onSearch}
                            placeholder="Filter users and groups"
                            className="w-full"
                        />
                    </div>
                    <div className="flex-1 overflow-auto">
                        {sortedConversations &&
                            sortedConversations.map((conversation) => (
                                <ConversationItem 
                                    key={`${
                                        conversation.is_group
                                            ? "group_"
                                            : "user_"
                                    }${conversation.id}`}
                                    conversation={conversation}
                                    online={!!isUserOnline(conversation.id)}
                                    selectedConversation={selectedConversation}
                                />
                            ))}
                    </div>
                </div>
                <div className="flex-1 flex flex-col overflow-hidden">
                    {children}
                </div>
            </div>
            <GroupModal show={showGroupModal} onClose={() => setShowGroupModal(false)} />
        </>
    );
}

export default ChatLayout;