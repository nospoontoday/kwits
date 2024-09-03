import ConversationItem from "@/Components/App/ConversationItem";
import ExpenseModal from "@/Components/App/ExpenseModal";
import FriendRequestModal from "@/Components/App/FriendRequestModal";
import GroupModal from "@/Components/App/GroupModal";
import TextInput from "@/Components/TextInput";
import { base64ToArrayBuffer, createKeyPair, decryptPrivateKey, decryptWithPrivateKey, deriveKey, encryptPrivateKey } from "@/CryptoUtils"; // Import decryptWithPrivateKey
import { useEventBus } from "@/EventBus";
import { PencilSquareIcon, UsersIcon } from "@heroicons/react/24/solid";
import { router, usePage } from "@inertiajs/react";
import { useEffect, useState } from "react";
import axios from "axios"; // Make sure axios is imported
import PinModal from "@/Components/App/PinModal";
import secureStorage from 'react-secure-storage';

const ChatLayout = ({ children }) => {
    const page = usePage();
    const conversations = page.props.conversations;
    const selectedConversation = page.props.selectedConversation;
    const [localConversations, setLocalConversations] = useState([]);
    const [sortedConversations, setSortedConversations] = useState([]);
    const [onlineUsers, setOnlineUsers] = useState({});
    const [showGroupModal, setShowGroupModal] = useState(false);
    const [showPinModal, setShowPinModal] = useState(false);
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [showFriendRequestModal, setShowFriendRequestModal] = useState(false);
    const [keyPairGenerated, setKeyPairGenerated] = useState(false);
    const { on, emit } = useEventBus();

    const currentUser = page.props.auth.user.data;
    const isUserOnline = (userId) => onlineUsers[userId];

    const onSearch = async (ev) => {
        const search = ev.target.value.toLowerCase();
    
        const decryptConversations = async () => {
            try {
                const decryptedConversations = await Promise.all(
                    conversations.map(async (conversation) => {
                        if (!conversation.last_message) {
                            return conversation;
                        }
                        try {
                            // check pin availability
                            const encryptedPin = secureStorage.getItem("encryptedPin");

                            if (!encryptedPin || (typeof encryptedPin === 'object' && Object.keys(encryptedPin).length === 0)) {
                                throw new Error('Decryption failed');
                            }
                            const salt = await base64ToArrayBuffer(currentUser.salt);
                            const derivedPinKey = await deriveKey(import.meta.env.VITE_MASTER_KEY, salt);
            
                            const storedPin = await decryptPrivateKey(derivedPinKey, encryptedPin, currentUser.pin_iv);
 
                            const decryptedLastMessage = await decryptWithPrivateKey(
                                JSON.parse(conversation.last_message),
                                currentUser.id,
                                currentUser.iv,
                                currentUser.salt,
                                storedPin
                            );
                            return {
                                ...conversation,
                                last_message: decryptedLastMessage,
                            };
                        } catch (error) {
                            console.error("Failed to decrypt message: ", error);
                            return conversation; // Return the original conversation if decryption fails
                        }
                    })
                );
    
                setLocalConversations(
                    decryptedConversations.filter((conversation) =>
                        conversation.name.toLowerCase().includes(search)
                    )
                );
            } catch (error) {
                console.error("Failed to decrypt conversations: ", error);
            }
        };
    
        await decryptConversations();
    };
    
    const handlePinSubmit = async (pin) => {
        if(currentUser.has_created_pin) {

            // Derive a key from Master Key
            const salt = await base64ToArrayBuffer(currentUser.salt);
            const derivedPinKey = await deriveKey(import.meta.env.VITE_MASTER_KEY, salt);

            const { encryptedPrivateKey: encryptedPin, iv: pinIv  } = await encryptPrivateKey(derivedPinKey, pin);

            secureStorage.setItem("encryptedPin", encryptedPin);

            // update pin_iv
            const formData = new FormData();
            formData.append("_method", "PUT");
            formData.append("pin_iv", pinIv);

            await axios.post(route("key.update", currentUser.id), formData);
        } else {
            // Generate key pair and get both public and private keys
            const { base64PublicKey, encryptedPrivateKey, iv, base64Salt, pinIv } = await createKeyPair(pin);
            setKeyPairGenerated(true);

            // Send both public and private keys to the server
            const formData = new FormData();

            formData.append("public_key", base64PublicKey);
            formData.append("private_key", encryptedPrivateKey);
            formData.append("iv", iv);
            formData.append("pin_iv", pinIv);
            formData.append("salt", base64Salt);
            formData.append("has_created_pin", 1);
            await axios.post(route("key.store"), formData);
        }
    }

    const updateLastMessage = async (conversations, message) => {
        // check pin availability
        let encryptedPin = secureStorage.getItem("encryptedPin");

        if (!encryptedPin || (typeof encryptedPin === 'object' && Object.keys(encryptedPin).length === 0)) {
            setShowPinModal(true, "decrypt");
            encryptedPin = secureStorage.getItem("encryptedPin");
        }
        const salt = await base64ToArrayBuffer(currentUser.salt);
        const derivedPinKey = await deriveKey(import.meta.env.VITE_MASTER_KEY, salt);

        const storedPin = await decryptPrivateKey(derivedPinKey, encryptedPin, currentUser.pin_iv);

        const decryptedMessage = await decryptWithPrivateKey(
            JSON.parse(message.message),
            currentUser.id,
            currentUser.iv,
            currentUser.salt,
            storedPin
        );

        return conversations.map((conversation) => {
            if (
                (message.receiver_id && !conversation.is_group && (conversation.id === message.sender_id || conversation.id === message.receiver_id)) ||
                (message.group_id && conversation.is_group && conversation.id === message.group_id)
            ) {
                return {
                    ...conversation,
                    last_message: decryptedMessage,
                    last_message_date: message.created_at,
                };
            }
            return conversation;
        });
    };

    const messageCreated = async (message) => {
        // Update conversations with the newly created message
        const updatedConversations = await updateLastMessage(localConversations, message);
        setLocalConversations(updatedConversations);
    };

    const messageDeleted = async ({ prevMessage }) => {
        console.log(prevMessage);
        if (prevMessage) {
            // Update conversations with the deleted message
            const updatedConversations = await updateLastMessage(localConversations, prevMessage);
            setLocalConversations(updatedConversations);
        } else {
            // Handle the case where all messages are deleted in the conversation
            const updatedConversations = localConversations.map((conversation) => {
                if (conversation.id === selectedConversation?.id) {
                    return {
                        ...conversation,
                        last_message: null, // Set last_message to null
                        last_message_date: null, // Set last_message_date to null
                    };
                }
                return conversation;
            });
    
            setLocalConversations(updatedConversations);
        }
    };

    useEffect(() => {
        const decryptConversations = async () => {
            try {
                const decryptedConversations = await Promise.all(
                    conversations.map(async (conversation) => {
                        if (!conversation.last_message) {
                            return conversation;
                        }
                        try {
                            // check pin availability
                            let encryptedPin = secureStorage.getItem("encryptedPin");

                            if (!encryptedPin || (typeof encryptedPin === 'object' && Object.keys(encryptedPin).length === 0)) {
                                setShowPinModal(true, "decrypt");
                                encryptedPin = secureStorage.getItem("encryptedPin");
                            }
                            const salt = await base64ToArrayBuffer(currentUser.salt);
                            const derivedPinKey = await deriveKey(import.meta.env.VITE_MASTER_KEY, salt);
            
                            const storedPin = await decryptPrivateKey(derivedPinKey, encryptedPin, currentUser.pin_iv);

                            const decryptedLastMessage = await decryptWithPrivateKey(
                                JSON.parse(conversation.last_message),
                                currentUser.id,
                                currentUser.iv,
                                currentUser.salt,
                                storedPin
                            );
    
                            return {
                                ...conversation,
                                last_message: decryptedLastMessage,
                            };
                        } catch (error) {
                            console.error("Failed to decrypt message:", error);
                            return conversation;
                        }
                    })
                );

                setLocalConversations(decryptedConversations);
            } catch (error) {
                console.error("Failed to decrypt conversations:", error);
            }
        };
    
        decryptConversations();
    }, [conversations, currentUser.id]);
    

    useEffect(() => {
        setSortedConversations(
            localConversations.sort((a, b) => {
                if (a.blocked_at && b.blocked_at) {
                    return a.blocked_at > b.blocked_at ? 1 : -1;
                } else if (a.blocked_at) {
                    return 1;
                } else if (b.blocked_at) {
                    return -1;
                }

                if (a.last_message_date && b.last_message_date) {
                    return b.last_message_date.localeCompare(a.last_message_date);
                } else if (a.last_message_date) {
                    return -1;
                } else if (b.last_message_date) {
                    return 1;
                } else {
                    return 0;
                }
            })
        );
    }, [localConversations]);

    useEffect(() => {
        const offCreated = on("message.created", async (message) => {
            await messageCreated(message);
        });
        const offDeleted = on("message.deleted", async (message) => {
            await messageDeleted(message);
        });
        const offModalShow = on("GroupModal.show", () => setShowGroupModal(true));
        const offExpenseModalShow = on("ExpenseModal.show", () => setShowExpenseModal(true));
        const offGroupDelete = on("group.deleted", ({ id, name }) => {
            setLocalConversations((oldConversations) =>
                oldConversations.filter((con) => con.id !== id)
            );

            emit("toast.show", `Group ${name} was deleted`);

            setTimeout(() => {
                if (!selectedConversation || (selectedConversation.is_group && selectedConversation.id === id)) {
                    router.visit(route("dashboard"));
                }
            }, 100);
        });

        return () => {
            offCreated();
            offDeleted();
            offModalShow();
            offExpenseModalShow();
            offGroupDelete();
        };
    }, [on, localConversations]);

    useEffect(() => {
        Echo.join("online")
            .here((users) => {
                const onlineUsersObj = Object.fromEntries(users.map((user) => [user.id, user]));
                setOnlineUsers((previousOnlineUsers) => ({
                    ...previousOnlineUsers,
                    ...onlineUsersObj,
                }));
            })
            .joining((user) => {
                setOnlineUsers((previousOnlineUsers) => ({
                    ...previousOnlineUsers,
                    [user.id]: user,
                }));
            })
            .leaving((user) => {
                setOnlineUsers((previousOnlineUsers) => {
                    const updatedUsers = { ...previousOnlineUsers };
                    delete updatedUsers[user.id];
                    return updatedUsers;
                });
            })
            .error((error) => {
                console.error("error", error);
            });
    }, []);

    useEffect(() => {
        const fetchAndSetKeyPair = async () => {
            
            try {
                if (keyPairGenerated) return; // Skip if key pair already generated
                
                if (currentUser && currentUser.public_key) {
                    return;
                } else {
                    const hasKey = await axios.post(route("has.key"));

                    if(hasKey.data.public_key) {
                        return;
                    } else {
                        setShowPinModal(true);
                    }
                }  
            } catch (error) {
                console.error(error);         
            }
        };
    
        fetchAndSetKeyPair();
    }, [currentUser, keyPairGenerated]);
    

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
                        <div className="tooltip tooltip-left" data-tip="Create new Group">
                            <button
                                onClick={() => setShowGroupModal(true)}
                                className="text-gray-400 hover:text-gray-200"
                            >
                                <PencilSquareIcon className="w-4 h-4 inline-block l-2" />
                            </button>
                        </div>
                        <div className="tooltip tooltip-left" data-tip="Friend requests">
                            <button
                                onClick={() => setShowFriendRequestModal(true)}
                                className="text-gray-400 hover:text-gray-200"
                            >
                                <UsersIcon className="w-4 h-4 inline-block l-2" />
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
            <ExpenseModal show={showExpenseModal} onClose={() => setShowExpenseModal(false)} />
            <FriendRequestModal show={showFriendRequestModal} onClose={() => setShowFriendRequestModal(false)} />
            <PinModal show={showPinModal} onClose={() => setShowPinModal(false)} onSubmit={handlePinSubmit} />
        </>
    );
};

export default ChatLayout;
