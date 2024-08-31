import { usePage } from "@inertiajs/react";
import ReactMarkdown from "react-markdown";
import React, { useEffect, useState } from "react";
import UserAvatar from "./UserAvatar";
import { formatMessageDateLong } from '@/helpers';
import MessageAttachments from "./MessageAttachments";
import MessageOptionsDropdown from "./MessageOptionsDropdown";
import { base64ToArrayBuffer } from "@/CryptoUtils";

const MessageItem = ({ message, attachmentClick }) => {
    const currentUser = usePage().props.auth.user.data;
    const [decryptedMessage, setDecryptedMessage] = useState("Decrypting...");

    useEffect(() => {
        async function decryptMessage() {
            try {
                const ivArr = message.iv.split(',').map(Number);
                const iv = new Uint8Array(ivArr);
                const encryptedBuffer = await base64ToArrayBuffer(message.message);
                const jwkKey = {
                    alg: "A128GCM",
                    ext: true,
                    k: message.key,
                    key_ops: ["decrypt"],
                    kty: "oct",
                }
                const cryptoKey = await window.crypto.subtle.importKey(
                    "jwk",
                    jwkKey,
                    {
                        name: "AES-GCM",
                        length: 128,
                    },
                    true,
                    ["decrypt"]
                );
                

                const decryptedBuffer = await window.crypto.subtle.decrypt(
                    {
                        name: "AES-GCM",
                        iv: iv,
                    },
                    cryptoKey,
                    encryptedBuffer
                );

                // Convert decryptedBuffer to a readable text
                const uint8Array = new Uint8Array(decryptedBuffer);
                const decoder = new TextDecoder();
                const decryptedText = decoder.decode(uint8Array);

                // const decrypted = await decryptWithPrivateKey(JSON.parse(message.message), currentUser.id);
                setDecryptedMessage(decryptedText);
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
    }, [message.message]);

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
                {message.sender_id == currentUser.id && (
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
