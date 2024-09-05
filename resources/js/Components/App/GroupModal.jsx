import { useEventBus } from "@/EventBus";
import { useForm, usePage } from "@inertiajs/react";
import { useEffect, useState } from "react";
import Modal from "@/Components/Modal";
import SecondaryButton from "@/Components/SecondaryButton";
import PrimaryButton from "@/Components/PrimaryButton";
import InputLabel from "@/Components/InputLabel";
import TextInput from "@/Components/TextInput";
import InputError from "@/Components/InputError";
import TextAreaInput from "@/Components/TextAreaInput";
import UserPicker from "@/Components/UserPicker";
import axios from 'axios';

export default function GroupModal({ show = false, onClose = () => {} }) {

    const page = usePage();
    const conversations = page.props.conversations;
    const { on, emit } = useEventBus();
    const [group, setGroup] = useState({});
    const [currencies, setCurrencies] = useState([]);

    const { data, setData, processing, reset, post, put, errors } = useForm({
        id: "",
        name: "",
        description: "",
        user_ids: [],
        default_currency: "php",  // Default currency set to PHP
    });

    const users = conversations.filter((c) => !c.is_group);

    const fetchCurrencies = async () => {
        try {
            const response = await axios.get('/api/currencies');
            setCurrencies(response.data);
        } catch (error) {
            console.error("Failed to fetch currencies", error);
        }
    };

    useEffect(() => {
        fetchCurrencies();
    }, []);

    const createOrUpdateGroup = (e) => {
        e.preventDefault();

        if (group.id) {
            put(route("group.update", group.id), {
                onSuccess: () => {
                    closeModal();
                    emit("toast.show", `Group "${data.name}" was updated`);
                }
            });
            return;
        }

        post(route("group.store"), {
            onSuccess: () => {
                emit("toast.show", `Group "${data.name}" was created`);
                closeModal();
            },
            onError: (error) => {
                emit("toast.show", `Failed to create group: ${error.message}`);
                console.error("Error creating group:", error);
            }
        });
    };

    const closeModal = () => {
        reset();
        onClose();
    };

    useEffect(() => {
        return on("GroupModal.show", (group) => {
            setData({
                name: group.name,
                description: group.description,
                user_ids: group.users
                    .filter((u) => group.owner_id !== u.id)
                    .map((u) => u.id),
                default_currency: group.default_currency || "php",  // Set default currency
            });

            setGroup(group);
        });
    }, [on]);

    return (
        <Modal show={show} onClose={closeModal} className="w-full sm:max-w-md">
            <form
                onSubmit={createOrUpdateGroup}
                className="p-6 overflow-y-auto"
            >
                <h2 className="text-xl font-medium text-gray-900 dark:text-gray-100">
                    {group.id ? `Edit Group "${group.name}"` : "Create new Group"}
                </h2>
                
                <div className="mt-8">
                    <InputLabel htmlFor="name" value="Name" />
                    <TextInput
                        id="name"
                        className="mt-1 block w-full"
                        value={data.name}
                        disabled={!!group.id}
                        onChange={(e) => setData("name", e.target.value)}
                        required
                        isFocused
                    />
                    <InputError className="mt-2" message={errors.name} />
                </div>

                <div className="mt-4">
                    <InputLabel htmlFor="description" value="Description" />
                    <TextAreaInput
                        id="description"
                        rows="3"
                        className="mt-1 block w-full"
                        value={data.description || ""}
                        onChange={(e) => setData("description", e.target.value)}
                    />
                    <InputError className="mt-2" message={errors.description} />
                </div>

                <div className="mt-4">
                    <InputLabel value="Select Users" />
                    <UserPicker 
                        value={
                            users.filter(
                                (u) => group.owner_id !== u.id && data.user_ids.includes(u.id)
                            ) || []
                        }
                        options={users}
                        onSelect={(users) =>
                            setData(
                                "user_ids",
                                users.map((u) => u.id)
                            )
                        }
                    />
                    <InputError className="mt-2" message={errors.user_ids} />
                </div>

                <div className="mt-4">
                    <InputLabel htmlFor="default_currency" value="Default Currency" />
                    <select
                        id="default_currency"
                        value={data.default_currency}
                        onChange={(e) => setData("default_currency", e.target.value)}
                        className="mt-1 block w-full"
                        required
                    >
                        {currencies.map((currency) => (
                            <option key={currency.code} value={currency.code}>
                                {currency.code.toUpperCase()}
                            </option>
                        ))}
                    </select>
                    <InputError className="mt-2" message={errors.default_currency} />
                </div>

                <div className="mt-6 flex justify-end">
                    <SecondaryButton onClick={closeModal}>
                        Cancel
                    </SecondaryButton>

                    <PrimaryButton className="ms-3" disabled={processing}>
                        {group.id ? "Update" : "Create"}
                    </PrimaryButton>
                </div>
            </form>
        </Modal>
    );
}
