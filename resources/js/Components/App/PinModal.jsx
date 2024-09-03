import { useState } from "react";

const PinModal = ({ show, onClose, onSubmit, mode = "encrypt" }) => {
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = () => {
        if (pin.length < 4 || pin.length > 6 || isNaN(pin)) {
            setError('PIN must be a numeric value between 4 and 6 digits.');
        } else {
            onSubmit(pin);
            onClose();
        }
    };

    const renderMessage = () => {
        if (mode === "encrypt") {
            return (
                <p className="mb-4 text-sm text-gray-600">
                    Remember your PIN! It’s crucial for accessing encrypted messages. We don't store it, so if you forget it, you lose access forever. Keep it safe and write it down!
                </p>
            );
        } else if (mode === "decrypt") {
            return (
                <p className="mb-4 text-sm text-gray-600">
                    Enter your PIN to decrypt your encrypted messages.
                </p>
            );
        }
    };

    return (
        show ? (
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
                <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full">
                    <h2 className="text-lg font-semibold mb-4">Enter PIN</h2>
                    {renderMessage()}
                    <input
                        type="password"
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        placeholder="Enter PIN"
                        className="w-full p-2 border border-gray-300 rounded mb-4"
                    />
                    {error && (
                        <p className="text-red-500 text-sm mb-4">{error}</p>
                    )}
                    <div className="flex justify-end gap-2">
                        <button
                            onClick={onClose}
                            className="bg-gray-500 text-white py-2 px-4 rounded hover:bg-gray-600"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
                        >
                            Submit
                        </button>
                    </div>
                </div>
            </div>
        ) : null
    );
};

export default PinModal;
