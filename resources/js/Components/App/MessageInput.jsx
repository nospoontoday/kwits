import { useEffect, useState } from "react";
import { PaperClipIcon, PhotoIcon, FaceSmileIcon, HandThumbUpIcon, PaperAirplaneIcon, XCircleIcon, TrashIcon, ReceiptPercentIcon, WalletIcon, CreditCardIcon, UserGroupIcon } from "@heroicons/react/24/solid"; // Import WalletIcon
import NewMessageInput from './NewMessageInput';
import axios from "axios";
import EmojiPicker from "emoji-picker-react";
import { Popover } from "@headlessui/react";
import { isAudio, isImage } from "@/helpers";
import AttachmentPreview from "./AttachmentPreview";
import CustomAudioPlayer from "./CustomAudioPlayer";
import AudioRecorder from "./AudioRecorder";
import { useEventBus } from "@/EventBus";
import { arrayBufferToBase64 } from "@/CryptoUtils";
import { usePage } from "@inertiajs/react";

const MessageInput = ({ conversation = null }) => {
    const [newMessage, setNewMessage] = useState("");
    const [inputErrorMessage, setInputErrorMessage] = useState("");
    const [messageSending, setMessageSending] = useState(false);
    const [chosenFiles, setChosenFiles] = useState([]);
    const [uploadProgress, setUploadProgress] = useState(0);
    const { emit } = useEventBus();

    const onFileChange = (event) => {
        const files = event.target.files;

        const updatedFiles = [...files].map((file) => {
            return {
                file: file,
                url: URL.createObjectURL(file),
            };
        });
        event.target.value = null;

        setChosenFiles((previousFiles) => {
            return [...previousFiles, ...updatedFiles];
        });
    };

    async function onSendClick() {
        if (messageSending) return;

        if (newMessage.trim() === "" && chosenFiles.length === 0) {
            setInputErrorMessage("Message is required");

            setTimeout(() => setInputErrorMessage(""), 3000);
            return;
        }

        try {
            const formData = new FormData();

            const arr = new Uint8Array(12);
            const iv = window.crypto.getRandomValues(arr);
            const cryptoKey = await window.crypto.subtle.generateKey(
                {
                    name: 'AES-GCM',
                    length: 128,
                },
                true,
                ["encrypt", "decrypt"]
            );
            const jwkKey = await window.crypto.subtle.exportKey("jwk", cryptoKey);
            const encryptionKey = jwkKey.k
            const messageInBytes = new TextEncoder().encode(newMessage);
            const encryptedBuffer = await window.crypto.subtle.encrypt(
                {
                    name: "AES-GCM",
                    iv,
                },
                cryptoKey,
                messageInBytes
            )

            const encryptedBase64 = await arrayBufferToBase64(encryptedBuffer);

            formData.append("message", encryptedBase64);
            formData.append("iv", iv);
            formData.append("key", encryptionKey);
        
            chosenFiles.forEach((file) => {
                formData.append("attachments[]", file.file);
            });
        
            if (conversation.is_group) {
                formData.append("group_id", conversation.id);
            }

            if (conversation.is_user) {
                formData.append("receiver_id", conversation.id);
            }
        
            setMessageSending(true);
        
            await axios.post(route("message.store"), formData, {
                onUploadProgress: (progressEvent) => {
                    const progress = Math.round(
                        (progressEvent.loaded / progressEvent.total) * 100
                    );
                    setUploadProgress(progress);
                },
            });
        
            setNewMessage("");
            setMessageSending(false);
            setUploadProgress(0);
            setChosenFiles([]);
        } catch (err) {
            setMessageSending(false);
            setUploadProgress(0);
            setChosenFiles([]);
            const message = err?.response?.data?.message;
            setInputErrorMessage(message || "An error occurred while sending the message");
            console.error(err);
        }
    }

    async function onLikeClick() {
        if (messageSending) {
            return;
        }

        try {
            const formData = new FormData();

            const arr = new Uint8Array(12);
            const iv = window.crypto.getRandomValues(arr);
            const cryptoKey = await window.crypto.subtle.generateKey(
                {
                    name: 'AES-GCM',
                    length: 128,
                },
                true,
                ["encrypt", "decrypt"]
            );
            const jwkKey = await window.crypto.subtle.exportKey("jwk", cryptoKey);
            const encryptionKey = jwkKey.k
            const messageInBytes = new TextEncoder().encode("👍");
            const encryptedBuffer = await window.crypto.subtle.encrypt(
                {
                    name: "AES-GCM",
                    iv,
                },
                cryptoKey,
                messageInBytes
            )

            const encryptedBase64 = await arrayBufferToBase64(encryptedBuffer);

            formData.append("message", encryptedBase64);
            formData.append("iv", iv);
            formData.append("key", encryptionKey);
        
            if (conversation.is_group) {
                formData.append("group_id", conversation.id);
            }

            if (conversation.is_user) {
                formData.append("receiver_id", conversation.id);
            }
        
            setMessageSending(true);
        
            await axios.post(route("message.store"), formData, {
                onUploadProgress: (progressEvent) => {
                    const progress = Math.round(
                        (progressEvent.loaded / progressEvent.total) * 100
                    );
                    setUploadProgress(progress);
                },
            });
        
            setNewMessage("");
            setMessageSending(false);
            setUploadProgress(0);
        } catch (err) {
            setMessageSending(false);
            setUploadProgress(0);
            const message = err?.response?.data?.message;
            setInputErrorMessage(message || "An error occurred while sending the message");
            console.error(err);
        }
    };

    async function onYouOweMeClick() {
        if (messageSending) {
            return;
        }

        const groupId = conversation.id; // or however you access the group ID

        try {
            const formData = new FormData();
            formData.append("group_id", groupId);

            setMessageSending(true);

            // Send the first request to get the owe-me list
            const { data } = await axios.post(route("group.owe-me"), formData, {
                onUploadProgress: (progressEvent) => {
                    const progress = Math.round(
                        (progressEvent.loaded / progressEvent.total) * 100
                    );
                    setUploadProgress(progress);
                },
            });

            // Encrypt the returned message
            const arr = new Uint8Array(12);
            const iv = window.crypto.getRandomValues(arr);
            const cryptoKey = await window.crypto.subtle.generateKey(
                {
                    name: 'AES-GCM',
                    length: 128,
                },
                true,
                ["encrypt", "decrypt"]
            );
            const jwkKey = await window.crypto.subtle.exportKey("jwk", cryptoKey);
            const encryptionKey = jwkKey.k
            const messageInBytes = new TextEncoder().encode(data.message);
            const encryptedBuffer = await window.crypto.subtle.encrypt(
                {
                    name: "AES-GCM",
                    iv,
                },
                cryptoKey,
                messageInBytes
            );

            const encryptedBase64 = await arrayBufferToBase64(encryptedBuffer);

            // Prepare the form data for the second request
            const messageFormData = new FormData();
            messageFormData.append("message", encryptedBase64);
            messageFormData.append("iv", iv);
            messageFormData.append("key", encryptionKey);
            messageFormData.append("group_id", groupId);

            // Send the encrypted message to be stored
            await axios.post(route("message.store"), messageFormData, {
                onUploadProgress: (progressEvent) => {
                    const progress = Math.round(
                        (progressEvent.loaded / progressEvent.total) * 100
                    );
                    setUploadProgress(progress);
                },
            });

            setMessageSending(false);
            setUploadProgress(0);

        } catch (error) {
            const message = error?.response?.data?.message;
            setInputErrorMessage(message || "An error occurred while sending the message");
            console.error(error);
        }
    }

    async function onIOweYouClick() {
        if (messageSending) {
            return;
        }

        const groupId = conversation.id; // or however you access the group ID

        try {
            const formData = new FormData();
            formData.append("group_id", groupId);

            setMessageSending(true);

            // Send the first request to get the owe-me list
            const { data } = await axios.post(route("group.owe-you"), formData, {
                onUploadProgress: (progressEvent) => {
                    const progress = Math.round(
                        (progressEvent.loaded / progressEvent.total) * 100
                    );
                    setUploadProgress(progress);
                },
            });

            // Encrypt the returned message
            const arr = new Uint8Array(12);
            const iv = window.crypto.getRandomValues(arr);
            const cryptoKey = await window.crypto.subtle.generateKey(
                {
                    name: 'AES-GCM',
                    length: 128,
                },
                true,
                ["encrypt", "decrypt"]
            );
            const jwkKey = await window.crypto.subtle.exportKey("jwk", cryptoKey);
            const encryptionKey = jwkKey.k
            const messageInBytes = new TextEncoder().encode(data.message);
            const encryptedBuffer = await window.crypto.subtle.encrypt(
                {
                    name: "AES-GCM",
                    iv,
                },
                cryptoKey,
                messageInBytes
            );

            const encryptedBase64 = await arrayBufferToBase64(encryptedBuffer);

            // Prepare the form data for the second request
            const messageFormData = new FormData();
            messageFormData.append("message", encryptedBase64);
            messageFormData.append("iv", iv);
            messageFormData.append("key", encryptionKey);
            messageFormData.append("group_id", groupId);

            // Send the encrypted message to be stored
            await axios.post(route("message.store"), messageFormData, {
                onUploadProgress: (progressEvent) => {
                    const progress = Math.round(
                        (progressEvent.loaded / progressEvent.total) * 100
                    );
                    setUploadProgress(progress);
                },
            });

            setMessageSending(false);
            setUploadProgress(0);

        } catch (error) {
            const message = error?.response?.data?.message;
            setInputErrorMessage(message || "An error occurred while sending the message");
            console.error(error);
        }
    }

    const recordedAudioReady = (file, url) => {
        setChosenFiles((previousFiles) => [...previousFiles, {file, url}]);
    }

    return (
        <div className="flex flex-wrap items-start border-t border-slate-700 py-3">
            <div className="order-2 flex-1 xs:flex-none xs:order-1 p-2">
                <button className="p-1 text-gray-400 hover:text-gray-300 relative">
                    <PaperClipIcon className="w-6" />
                    <input
                        type="file"
                        multiple
                        onChange={onFileChange}
                        className="absolute left-0 top-0 right-0 bottom-0 z-20 opacity-0 cursor-pointer"
                    />
                </button>
                <button className="p-1 text-gray-400 hover:text-gray-300 relative">
                    <PhotoIcon className="w-6" />
                    <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={onFileChange}
                        className="absolute left-0 top-0 right-0 bottom-0 z-20 opacity-0 cursor-pointer"
                    />
                </button>
                <Popover className="p-1 text-gray-400 hover:text-gray-300 relative inline-block">
                    <Popover.Button className="p-1 text-gray-400 hover:text-gray-300">
                        <FaceSmileIcon className="w-6 h-6" />
                    </Popover.Button>
                    <Popover.Panel className="absolute z-10 left-0 bottom-full">
                        <EmojiPicker theme="dark" onEmojiClick={event => setNewMessage(newMessage + event.emoji)} />
                    </Popover.Panel>
                </Popover>
                <AudioRecorder fileReady={recordedAudioReady} />
                <div
                    className="tooltip tooltip-top"
                    data-tip="Add an expense"
                >
                    <button
                        onClick={(event) =>
                            emit(
                                "ExpenseModal.show",
                                conversation
                            )
                        }
                        className="p-1 text-gray-400 hover:text-gray-300"
                    >
                        <ReceiptPercentIcon className="w-6 h-6" />
                    </button>
                </div>
            </div>
            <div className="order-1 px-3 xs:p-0 min-w-[220px] basis-full xs:basis-0 xs:order-2 flex-1 relative">
                <div className="flex">
                    <NewMessageInput
                        value={newMessage}
                        onSend={onSendClick}
                        onChange={(ev) => setNewMessage(ev.target.value)}
                    />
                    <button
                        onClick={onSendClick}
                        disabled={messageSending}
                        className="btn btn-info rounded-1-none"
                    >
                        <PaperAirplaneIcon className="w-6" />
                        <span className="hidden-sm:inline">Send</span>
                    </button>
                </div>
                {uploadProgress > 0 && (
                    <progress
                        className="progress progress-info w-full"
                        value={uploadProgress}
                        max="100"
                    />
                )}
                {inputErrorMessage && (
                    <p className="text-xs text-red-400">{inputErrorMessage}</p>
                )}
                <div className="flex flex-wrap gap-1 mt-2 yawamotanan">
                    {chosenFiles.map((file) => (
                        <div
                            key={file.file.name}
                            className={
                                `relative flex justify-between cursor-pointer ` +
                                (!isImage(file.file) ? " w-[240px]" : "")
                            }
                        >
                            {isImage(file.file) && (
                                <img
                                    src={file.url}
                                    alt=""
                                    className="w-16 h-16 object-cover"
                                />
                            )}

                            {isAudio(file.file) && (
                                <CustomAudioPlayer
                                    file={file}
                                    showVolume={false}
                                />
                            )}

                            {!isAudio(file.file) && !isImage(file.file) && (
                                <AttachmentPreview file={file} />
                            )}

                            <button
                                onClick={() =>
                                    setChosenFiles(
                                        chosenFiles.filter(
                                            (f) =>
                                                f.file.name !== file.file.name
                                        )
                                    )
                                }
                                className="absolute w-6 h-6 rounded-full bg-gray-800 -right-2 top-2 text-gray-300 hover:text-gray-100 z-10"
                            >
                                <XCircleIcon className="w-6" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
            <div className="order-3 xs:order-3 p-2 flex">
                <button onClick={onLikeClick} className="p-1 text-gray-400 hover:text-gray-300">
                    <HandThumbUpIcon className="w-6 h-6" />
                </button>
                {conversation.is_group && (
                    <button onClick={onYouOweMeClick} className="p-1 text-gray-400 hover:text-gray-300">
                        <WalletIcon className="w-6 h-6" />
                    </button>
                )}
                {conversation.is_group && (
                    <button onClick={onIOweYouClick} className="p-1 text-gray-400 hover:text-gray-300">
                        <CreditCardIcon className="w-6 h-6" />
                    </button>
                )}
            </div>
        </div>
    );
}

export default MessageInput;
