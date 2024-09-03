import { usePage } from "@inertiajs/react";
import ReactMarkdown from "react-markdown";
import React, { useEffect, useState } from "react";
import UserAvatar from "./UserAvatar";
import { formatMessageDateLong } from '@/helpers';
import MessageAttachments from "./MessageAttachments";
import MessageOptionsDropdown from "./MessageOptionsDropdown";
import { decryptWithPrivateKey } from "@/CryptoUtils";
import secureStorage from 'react-secure-storage';
import PinModal from "./PinModal";

const MessageItem = ({ message, attachmentClick }) => {
    const currentUser = usePage().props.auth.user.data;
    const [decryptedMessage, setDecryptedMessage] = useState("Decrypting...");
    const [showPinModal, setShowPinModal] = useState(false);

    const handlePinSubmit = async (pin) => {
        secureStorage.setItem("pin", pin);
    }

    useEffect(() => {
        async function decryptMessage() {
            try {
                // check pin availability
                let storedPin = secureStorage.getItem("pin");

                if (!storedPin || (typeof storedPin === 'object' && Object.keys(storedPin).length === 0)) {
                    setShowPinModal(true, "decrypt");
                    storedPin = secureStorage.getItem("pin");
                }

                // Decrypt the message based on the user's ID
                const decrypted = await decryptWithPrivateKey(JSON.parse(message.message), currentUser.id, currentUser.iv, currentUser.salt, storedPin);
                setDecryptedMessage(decrypted);
            } catch (error) {
                console.error("Failed to decrypt message:", error);
                setDecryptedMessage("Decryption failed");
            }
        }

        if (message.message) {
            decryptMessage();
        } else {
            setDecryptedMessage("No message");
        }
    }, [message.message, currentUser.id]);

    return (
        <div
            className={
                "chat " +
                (message.sender_id === currentUser.id
                    ? "chat-end"
                    : "chat-start"
                )
            }
        >
            {<UserAvatar user={message.sender} />}
            <div className="chat-header">
                {message.sender_id !== currentUser.id
                    ? message.sender.name
                    : ""
                }
                <time className="text-xs opacity-50 ml-2">
                    {formatMessageDateLong(message.created_at)}
                </time>
            </div>

            <div
                className={
                    "chat-bubble relative " +
                    (message.sender_id === currentUser.id
                        ? " chat-bubble-info"
                        : ""
                    )
                }
            >
                {message.sender_id === currentUser.id && (
                    <MessageOptionsDropdown message={message} />
                )}
                <div className="chat-message">
                    <div className="chat-message-content">
                        <ReactMarkdown>{decryptedMessage}</ReactMarkdown>
                    </div>
                    <MessageAttachments 
                        attachments={message.attachments}
                        attachmentClick={attachmentClick}
                    />
                </div>
            </div>
            <PinModal show={showPinModal} onClose={() => setShowPinModal(false)} onSubmit={handlePinSubmit} />
        </div>
    );
}

export default MessageItem;
