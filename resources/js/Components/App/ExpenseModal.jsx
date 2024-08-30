import { useEventBus } from "@/EventBus";
import { useForm, usePage } from "@inertiajs/react";
import { useEffect, useState } from "react";
import Modal from "@/Components/Modal";
import SecondaryButton from "@/Components/SecondaryButton";
import PrimaryButton from "@/Components/PrimaryButton";
import InputLabel from "@/Components/InputLabel";
import TextInput from "@/Components/TextInput";
import InputError from "@/Components/InputError";
import UserPicker from "@/Components/UserPicker";

export default function ExpenseModal({ show = false, onClose = () => {} }) {
    const page = usePage();
    const { on, emit } = useEventBus();
    const [expense, setExpense] = useState(null);
    const [group, setGroup] = useState({});

    const { data, setData, processing, reset, post, put, errors } = useForm({
        id: "",
        description: "",
        amount: "",
        expense_date: new Date().toISOString().split("T")[0], // Default to today's date
        split_type: "equally", // Locked to "equally"
        group_id: "",
    });

    const createOrUpdateExpense = (e) => {
        e.preventDefault();

        if (expense && expense.id) {
            put(route("expense.update", expense.id), {
                onSuccess: () => {
                    closeModal();
                    // emit("toast.show", `Expense "${data.description}" was updated`);
                },
            });
        } else {
            post(route("expense.store"), {
                onSuccess: () => {
                    emit("toast.show", `Expense "${data.description}" was created`);
                    closeModal();
                },
            });
        }
    };

    const closeModal = () => {
        reset();
        onClose();
    };

    useEffect(() => {
        return on("ExpenseModal.show", (data) => {

            if (data.is_group) {
                setData({
                    group_id: data.id || "",
                    description: "",
                    amount: "",
                    expense_date: new Date().toISOString().split("T")[0], // Default to today's date
                    split_type: "equally", // Locked to "equally"
                    user_ids: data.users
                        .filter((u) => data.owner_id !== u.id)
                        .map((u) => u.id),
                });
                setGroup(data);
            } else {
                setExpense(data);
                setData({
                    group_id: data.id || "",
                    description: data.description || "",
                    amount: data.amount || "",
                    expense_date: data.expense_date || "",
                    split_type: "equally", // Locked to "equally"
                });
            }
        });
    }, [on]);
    // console.log(data)
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
                                (u) =>
                                    group.owner_id !== u.id
                            ) || []
                        }
                        options={
                            group?.users?.filter(
                                (u) =>
                                    group.owner_id !== u.id
                            ) || []
                        }
                        onSelect={(group) =>
                            setData(
                                "user_ids",
                                group.users.map((u) => u.id)
                            )
                        }
                    />
                    <InputError className="mt-2" message={errors.user_ids} />
                </div>

                <div className="mt-4">
                    <InputLabel htmlFor="description" value="Description" />
                    <TextInput
                        id="description"
                        className="mt-1 block w-full"
                        value={data.description}
                        onChange={(e) => setData("description", e.target.value)}
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
                        value={data.amount}
                        onChange={(e) => setData("amount", e.target.value)}
                        required
                    />
                    <InputError className="mt-2" message={errors.amount} />
                </div>

                <div className="mt-4">
                    <InputLabel htmlFor="expense_date" value="Date" />
                    <input
                        type="date"
                        id="expense_date"
                        value={data.expense_date}
                        className="mt-1 block w-full"
                        onChange={(e) => setData("expense_date", e.target.value)}
                        required
                    />
                    <InputError className="mt-2" message={errors.expense_date} />
                </div>

                {/* Split Type is locked to "equally" */}
                {/* <div className="mt-4">
                    <InputLabel htmlFor="split_type" value="Split Type" />
                    <select
                        id="split_type"
                        className="mt-1 block w-full"
                        value={data.split_type}
                        disabled
                        required
                    >
                        <option value="equally">Equally</option>
                    </select>
                    <InputError className="mt-2" message={errors.split_type} />
                </div> */}

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
