import { useEffect, useState } from "react";
import Modal from "@/Components/Modal";
import SecondaryButton from "@/Components/SecondaryButton";
import PrimaryButton from "@/Components/PrimaryButton";
import { useEventBus } from "@/EventBus";
import axios from "axios";
import { usePage } from "@inertiajs/react";

export default function FriendRequestModal({ show = false, onClose = () => {} }) {
    const page = usePage();
    const currentUser = page.props.auth.user.data;
    const { emit } = useEventBus();
    const [friendRequests, setFriendRequests] = useState([]);

    useEffect(() => {
        if (show) {
            // Fetch friend requests
            fetch(route('friend.requests'))
                .then(response => response.json())
                .then(data => {
                    const userId = currentUser.id;

                    // Filter friend requests to exclude those where the sender is the current user
                    const filteredRequests = data.data.filter(request => request.sender.id !== userId);
                    setFriendRequests(filteredRequests);
                });
        }
    }, [show]);

    const handleConfirm = (id) => {
        axios.post(route('friend.confirm', { id }))
        .then(() => {
            emit('toast.show', 'Friend request confirmed');
            // Remove the confirmed request from the list
            setFriendRequests(friendRequests.filter(request => request.sender.id !== id));
        });
    };

    const handleDeny = (id) => {
        axios.post(route('friend.deny', { id }))
        .then(() => {
            emit('toast.show', 'Friend request denied');
            // Remove the deleted request from the list
            setFriendRequests(friendRequests.filter(request => request.sender.id !== id));
        });
    };

    return (
        <Modal show={show} onClose={onClose}>
            <div className="p-6 overflow-y-auto">
                <h2 className="text-xl font-medium text-gray-900 dark:text-gray-100">Friend Requests</h2>
                <div className="mt-4">
                    {friendRequests.length === 0 ? (
                        <p>No friend requests</p>
                    ) : (
                        <ul>
                            {friendRequests.map((request) => (
                                <li key={request.id} className="flex justify-between items-center mt-4">
                                    <div className="flex items-center">
                                        {request.sender.avatar_url && (
                                            <img
                                                src={request.sender.avatar_url}
                                                alt={request.sender.name}
                                                className="w-8 h-8 rounded-full mr-2"
                                            />
                                        )}
                                        <span>{request.sender.name} wants to be friends with you.</span>
                                    </div>
                                    <div>
                                        <SecondaryButton onClick={() => handleDeny(request.sender.id)}>Deny</SecondaryButton>
                                        <PrimaryButton className="ms-3" onClick={() => handleConfirm(request.sender.id)}>Confirm</PrimaryButton>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </Modal>
    );
}
