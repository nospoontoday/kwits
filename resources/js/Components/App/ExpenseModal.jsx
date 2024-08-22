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

export default function ExpenseModal({ show = false, onClose = () => {} }) {
    const page = usePage();
    const conversations = page.props.conversations;
    const { on, emit } = useEventBus();
    const [expense, setExpense] = useState({});
    const [groupName, setGroupName] = useState("");

    const { data, setData, processing, reset, post, put, errors } = useForm({
        id: "",
        name: "",
        description: "",
        amount: "",          
        expense_date: "",    
        split_type: "",      
        exact_amounts: [],   
        user_ids: [],
    });

    const users = conversations.filter((c) => !c.is_group);

    const createOrUpdateExpense = (e) => {
        e.preventDefault();

        if (expense.id) {
            put(route("expense.update", expense.id), {
                onSuccess: () => {
                    closeModal();
                    emit("toast.show", `Expense "${data.name}" was updated`);
                },
            });
            return;
        }
        post(route("expense.store"), {
            onSuccess: () => {
                emit("toast.show", `Expense "${data.name}" was created`);
                closeModal();
            },
        });
    };

    const closeModal = () => {
        reset();
        onClose();
    };

    useEffect(() => {
        return on("ExpenseModal.show", (expense) => {
            setData({
                id: expense.id,
                name: expense.name,
                description: expense.description,
                amount: expense.amount || "", 
                expense_date: expense.expense_date || "", 
                split_type: expense.split_type || "", 
                exact_amounts: expense.exact_amounts || [], 
                user_ids: expense.users.map((u) => u.id),
            });

            setExpense(expense);

            // Set the group name if it's a group expense
            if (expense.is_group) {
                setGroupName(expense.group_name || "the group");
            } else {
                setGroupName("");
            }
        });
    }, [on]);

    return (
        <Modal show={show} onClose={closeModal}>
            <form onSubmit={createOrUpdateExpense} className="p-6 overflow-y-auto">
                <h2 className="text-xl font-medium text-gray-900 dark:text-gray-100">
                    {expense.id ? `Edit Expense "${expense.name}"` : "Create New Expense"}
                </h2>

                {groupName && (
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">
                        With <strong>you</strong> and: All of {groupName}
                    </p>
                )}

                <div className="mt-8">
                    <InputLabel htmlFor="name" value="Name" />
                    <TextInput
                        id="name"
                        className="mt-1 block w-full"
                        value={data.name}
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
                    <InputLabel htmlFor="amount" value="Amount" />
                    <TextInput
                        id="amount"
                        className="mt-1 block w-full"
                        value={data.amount || ""}
                        onChange={(e) => setData("amount", e.target.value)}
                        required
                    />
                    <InputError className="mt-2" message={errors.amount} />
                </div>

                <div className="mt-4">
                    <InputLabel htmlFor="expense_date" value="Expense Date" />
                    <TextInput
                        id="expense_date"
                        type="date"
                        className="mt-1 block w-full"
                        value={data.expense_date || ""}
                        onChange={(e) => setData("expense_date", e.target.value)}
                        required
                    />
                    <InputError className="mt-2" message={errors.expense_date} />
                </div>

                <div className="mt-4">
                    <InputLabel htmlFor="split_type" value="Split Type" />
                    <select
                        id="split_type"
                        className="mt-1 block w-full"
                        value={data.split_type}
                        onChange={(e) => setData("split_type", e.target.value)}
                        required
                    >
                        <option value="equally">Equally</option>
                        <option value="exact">Exact</option>
                        <option value="single_payer">Single Payer</option>
                        <option value="full_amount_each">Full Amount Each</option>
                    </select>
                    <InputError className="mt-2" message={errors.split_type} />
                </div>

                {data.split_type === "exact" && (
                    <div className="mt-4">
                        <InputLabel value="Exact Amounts" />
                        {data.exact_amounts.map((exact, index) => (
                            <div key={index} className="flex items-center mb-2">
                                <TextInput
                                    className="mr-2"
                                    placeholder="User ID"
                                    value={exact.user_id}
                                    onChange={(e) => {
                                        const updatedExactAmounts = [...data.exact_amounts];
                                        updatedExactAmounts[index].user_id = e.target.value;
                                        setData("exact_amounts", updatedExactAmounts);
                                    }}
                                    required
                                />
                                <TextInput
                                    placeholder="Amount"
                                    value={exact.amount}
                                    onChange={(e) => {
                                        const updatedExactAmounts = [...data.exact_amounts];
                                        updatedExactAmounts[index].amount = e.target.value;
                                        setData("exact_amounts", updatedExactAmounts);
                                    }}
                                    required
                                />
                            </div>
                        ))}
                        <InputError className="mt-2" message={errors.exact_amounts} />
                    </div>
                )}

                <div className="mt-4">
                    <InputLabel value="Select Users" />
                    <UserPicker
                        value={users.filter((u) => data.user_ids.includes(u.id))}
                        options={users}
                        onSelect={(selectedUsers) =>
                            setData(
                                "user_ids",
                                selectedUsers.map((u) => u.id)
                            )
                        }
                    />
                    <InputError className="mt-2" message={errors.user_ids} />
                </div>

                <div className="mt-6 flex justify-end">
                    <SecondaryButton onClick={closeModal}>
                        Cancel
                    </SecondaryButton>

                    <PrimaryButton className="ms-3" disabled={processing}>
                        {expense.id ? "Update" : "Create"}
                    </PrimaryButton>
                </div>
            </form>
        </Modal>
    );
}
