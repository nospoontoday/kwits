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
        fetch(route('friend.confirm', { id }), {
            method: 'POST',
            headers: {
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content'),
                'Content-Type': 'application/json'
            }
        })
        .then(() => {
            emit('toast.show', 'Friend request confirmed');
            setFriendRequests(friendRequests.filter(request => request.id !== id));
        });
    };

    const handleDelete = (id) => {
        fetch(route('friend.delete', { id }), {
            method: 'DELETE',
            headers: {
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
            }
        })
        .then(() => {
            emit('toast.show', 'Friend request deleted');
            setFriendRequests(friendRequests.filter(request => request.id !== id));
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
                                        <SecondaryButton onClick={() => handleDelete(request.id)}>Delete</SecondaryButton>
                                        <PrimaryButton className="ms-3" onClick={() => handleConfirm(request.id)}>Confirm</PrimaryButton>
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