import { usePage } from "@inertiajs/react";
import ReactMarkdown from "react-markdown";
import React, { useEffect, useState } from "react";
import UserAvatar from "./UserAvatar";
import { formatMessageDateLong } from '@/helpers';
import MessageAttachments from "./MessageAttachments";
import MessageOptionsDropdown from "./MessageOptionsDropdown";
import { base64ToArrayBuffer, decryptPrivateKey, decryptWithPrivateKey, deriveKey, encryptPrivateKey } from "@/CryptoUtils";
import secureStorage from 'react-secure-storage';

const MessageItem = ({ message, attachmentClick }) => {
    const currentUser = usePage().props.auth.user.data;
    const [decryptedMessage, setDecryptedMessage] = useState("Decrypting...");

    useEffect(() => {
        async function decryptMessage() {
            try {
                // check pin availability
                const encryptedPin = secureStorage.getItem("encryptedPin");

                if (!encryptedPin || (typeof encryptedPin === 'object' && Object.keys(encryptedPin).length === 0)) {
                    throw new Error('Decryption failed');
                }
                const salt = await base64ToArrayBuffer(currentUser.salt);
                const derivedPinKey = await deriveKey(import.meta.env.VITE_MASTER_KEY, salt);

                const storedPin = await decryptPrivateKey(derivedPinKey, encryptedPin, currentUser.pin_iv);
                
                // Decrypt the message based on the user's ID
                const decrypted = await decryptWithPrivateKey(
                    JSON.parse(message.message), 
                    currentUser.id, 
                    currentUser.iv, 
                    currentUser.salt, 
                    storedPin
                );
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
        </div>
    );
}

export default MessageItem;
