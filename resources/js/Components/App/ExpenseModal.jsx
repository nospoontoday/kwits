import { useEventBus } from "@/EventBus";
import { usePage } from "@inertiajs/react";
import { useEffect, useState } from "react";
import axios from 'axios';
import Modal from "@/Components/Modal";
import SecondaryButton from "@/Components/SecondaryButton";
import PrimaryButton from "@/Components/PrimaryButton";
import InputLabel from "@/Components/InputLabel";
import TextInput from "@/Components/TextInput";
import InputError from "@/Components/InputError";
import UserPicker from "@/Components/UserPicker";
import { arrayBufferToBase64 } from "@/CryptoUtils";

export default function ExpenseModal({ show = false, onClose = () => {} }) {
    const page = usePage();
    const { on, emit } = useEventBus();
    const [expense, setExpense] = useState(null);
    const [group, setGroup] = useState({});
    const [errors, setErrors] = useState({});
    const [processing, setProcessing] = useState(false);
    const [formData, setFormData] = useState({
        id: "",
        description: "",
        amount: "",
        expense_date: new Date().toISOString().split("T")[0],
        split_type: "equally",
        group_id: "",
        user_ids: []
    });

    const createOrUpdateExpense = async (e) => {
        e.preventDefault();
        setProcessing(true);
        setErrors({});

        try {
            if (expense && expense.id) {
                await axios.put(route("expense.update", expense.id), formData);
                emit("toast.show", `Expense "${formData.description}" was updated`);
            } else {

                // Send the first request to get the owe-me list
                const { data } = await axios.post(route("expense.store"), formData);

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
                messageFormData.append("group_id", formData.group_id);
                messageFormData.append("type", "expense");

                // Send the encrypted message to be stored
                await axios.post(route("message.store"), messageFormData);

                emit("toast.show", `Expense "${data.description}" was created`);
            }

            closeModal();
        } catch (error) {
            if (error.response && error.response.status === 422) {
                setErrors(error.response.data.errors);
            } else {
                console.error("Unexpected error:", error);
            }
        } finally {
            setProcessing(false);
        }
    };

    const closeModal = () => {
        setFormData({
            id: "",
            description: "",
            amount: "",
            expense_date: new Date().toISOString().split("T")[0],
            split_type: "equally",
            group_id: "",
            user_ids: []
        });
        setErrors({});
        onClose();
    };

    useEffect(() => {
        return on("ExpenseModal.show", (data) => {
            if (data.is_group) {
                setFormData({
                    group_id: data.id || "",
                    description: "",
                    amount: "",
                    expense_date: new Date().toISOString().split("T")[0],
                    split_type: "equally",
                    user_ids: data.users
                        .filter((u) => data.owner_id !== u.id)
                        .map((u) => u.id),
                });
                setGroup(data);
            } else {
                setExpense(data);
                setFormData({
                    group_id: data.id || "",
                    description: data.description || "",
                    amount: data.amount || "",
                    expense_date: data.expense_date || "",
                    split_type: "equally",
                    user_ids: []
                });
            }
        });
    }, [on]);

    return (
        <Modal show={show} onClose={closeModal}>
            <form onSubmit={createOrUpdateExpense} className="p-6 overflow-y-auto">
                <h2 className="text-xl font-medium text-gray-900 dark:text-gray-100">
                    {expense
                        ? `Edit Expense "${expense.description || "Untitled"}"`
                        : `Create new Expense with you and:`}
                </h2>

                <div className="mt-4">
                    <UserPicker
                        value={
                            group?.users?.filter(
                                (u) => group.owner_id !== u.id
                            ) || []
                        }
                        options={
                            group?.users?.filter(
                                (u) => group.owner_id !== u.id
                            ) || []
                        }
                        onSelect={(selectedUsers) =>
                            setFormData({
                                ...formData,
                                user_ids: selectedUsers.map((u) => u.id),
                            })
                        }
                    />
                    <InputError className="mt-2" message={errors.user_ids} />
                </div>

                <div className="mt-4">
                    <InputLabel htmlFor="description" value="Description" />
                    <TextInput
                        id="description"
                        className="mt-1 block w-full"
                        value={formData.description}
                        onChange={(e) =>
                            setFormData({ ...formData, description: e.target.value })
                        }
                        required
                        isFocused
                    />
                    <InputError className="mt-2" message={errors.description} />
                </div>

                <div className="mt-4">
                    <InputLabel htmlFor="amount" value="Amount" />
                    <TextInput
                        id="amount"
                        type="number"
                        className="mt-1 block w-full"
                        value={formData.amount}
                        onChange={(e) =>
                            setFormData({ ...formData, amount: e.target.value })
                        }
                        required
                    />
                    <InputError className="mt-2" message={errors.amount} />
                </div>

                <div className="mt-4">
                    <InputLabel htmlFor="expense_date" value="Date" />
                    <input
                        type="date"
                        id="expense_date"
                        value={formData.expense_date}
                        className="mt-1 block w-full"
                        onChange={(e) =>
                            setFormData({ ...formData, expense_date: e.target.value })
                        }
                        required
                    />
                    <InputError className="mt-2" message={errors.expense_date} />
                </div>

                <div className="mt-6 flex justify-end">
                    <SecondaryButton onClick={closeModal}>
                        Cancel
                    </SecondaryButton>
                    <PrimaryButton className="ms-3" disabled={processing}>
                        {expense ? "Update" : "Create"}
                    </PrimaryButton>
                </div>
            </form>
        </Modal>
    );
}
