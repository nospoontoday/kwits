import secureStorage from 'react-secure-storage';

export async function base64ToArrayBuffer(base64) {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

export async function createKeyPair() {
    const keyPair = await window.crypto.subtle.generateKey(
        {
            name: "RSA-OAEP",
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: { name: "SHA-256" },
        },
        true, // Key is extractable
        ["encrypt", "decrypt"]
    );

    const publicKeyBuffer = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
    const publicKeyBytes = new Uint8Array(publicKeyBuffer);
    const base64PublicKey = btoa(String.fromCharCode(...publicKeyBytes));

    // Export the private key
    const privateKeyBuffer = await window.crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
    const privateKeyBytes = new Uint8Array(privateKeyBuffer);
    const base64PrivateKey = btoa(String.fromCharCode(...privateKeyBytes));

    // Securely store the private key
    await securelyStorePrivateKey(privateKeyBytes);

    return {
        base64PublicKey,  // Send this to the server
        base64PrivateKey, // This will be securely stored locally
    };
}

export async function arrayBufferToBase64(buffer) {
    // Create a Uint8Array from the ArrayBuffer
    const uint8Array = new Uint8Array(buffer);
    
    // Create a binary string from the Uint8Array
    const binaryString = String.fromCharCode.apply(null, uint8Array);
    
    // Convert binary string to Base64
    return btoa(binaryString);
}


const requestPrivateKey = async (userId) => {
    
    const response = await axios.post(route('key.retrieve.private'), {
        user_id: userId,
    });
    
    const base64PrivateKey = response.data.private_key;

    secureStorage.setItem("privateKey", base64PrivateKey);
};

export async function decryptWithPrivateKey(message, userId) {

    try {
        // Retrieve the private key from secure storage
        const storedPrivateKey = secureStorage.getItem("privateKey");

        if (!storedPrivateKey) {
            await requestPrivateKey(userId);

            // Verify if the private key is stored after requesting
            if (!secureStorage.getItem("privateKey")) {
                throw new Error("Private key not found");
            }
        }

        // Decode the Base64 encoded private key
        const privateKeyBinary = Uint8Array.from(atob(storedPrivateKey), c => c.charCodeAt(0)).buffer;

        // Import the private key
        const privateKey = await window.crypto.subtle.importKey(
            "pkcs8",
            privateKeyBinary,
            { name: "RSA-OAEP", hash: "SHA-256" },
            false,
            ["decrypt"]
        );

        // Extract and decode Base64 encoded encrypted AES key, encrypted message, and IV from the message
        const { encryptedMessage, iv, encryptedAesKey } = message[userId];

        // Validate and decode Base64 encoded encrypted AES key
        if (!isBase64(encryptedAesKey)) {
            throw new Error('Invalid Base64 encoding for encryptedAesKey');
        }
        const encryptedAesKeyBuffer = Uint8Array.from(atob(encryptedAesKey), c => c.charCodeAt(0)).buffer;

        // Validate and decode Base64 encoded encrypted message
        if (!isBase64(encryptedMessage)) {
            throw new Error('Invalid Base64 encoding for encryptedMessage');
        }
        const encryptedMessageBuffer = Uint8Array.from(atob(encryptedMessage), c => c.charCodeAt(0)).buffer;

        // Validate and decode Base64 encoded IV
        if (!isBase64(iv)) {
            throw new Error('Invalid Base64 encoding for iv');
        }
        const ivArray = Uint8Array.from(atob(iv), c => c.charCodeAt(0));

        // Decrypt the AES key using the private key
        const aesKeyBuffer = await window.crypto.subtle.decrypt(
            { name: "RSA-OAEP" },
            privateKey,
            encryptedAesKeyBuffer
        );

        // Import the decrypted AES key
        const aesKey = await window.crypto.subtle.importKey(
            "raw",
            aesKeyBuffer,
            { name: "AES-GCM", length: 128 },
            false,
            ["decrypt"]
        );

        // Decrypt the message using the decrypted AES key and IV
        const decryptedBuffer = await window.crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: ivArray,
            },
            aesKey,
            encryptedMessageBuffer
        );

        // Convert decrypted ArrayBuffer to string
        const decoder = new TextDecoder();
        return decoder.decode(decryptedBuffer);

    } catch (error) {
        console.error('Decryption error:', error);
        throw new Error('Decryption failed');
    }
}

// Utility function to check if a string is Base64 encoded
function isBase64(str) {
    const base64Pattern = /^(?:[A-Z0-9+\/]{4}){1,}(?:[A-Z0-9+\/]{2}==|[A-Z0-9+\/]{3}=)?$/i;
    return base64Pattern.test(str);
}




export async function encryptWithPublicKey(base64PublicKey, message) {
    try {
        // Generate a random AES key (128-bit)
        const aesKey = window.crypto.getRandomValues(new Uint8Array(16)); // 128-bit AES key

        // Import the AES key for encryption
        const aesCryptoKey = await window.crypto.subtle.importKey(
            'raw',
            aesKey,
            { name: 'AES-GCM', length: 128 },
            true,
            ['encrypt']
        );

        // Generate a random IV for AES-GCM
        const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 12 bytes IV for AES-GCM

        // Encode the message to Uint8Array
        const encoder = new TextEncoder();
        const encodedMessage = encoder.encode(message);

        // Encrypt the message with AES
        const encryptedMessage = await window.crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: iv },
            aesCryptoKey,
            encodedMessage
        );

        // Decode the Base64 public key to a Uint8Array
        const publicKeyBytes = Uint8Array.from(atob(base64PublicKey), c => c.charCodeAt(0));

        // Import the public key for encryption
        const publicKey = await window.crypto.subtle.importKey(
            'spki',
            publicKeyBytes.buffer,
            { name: 'RSA-OAEP', hash: 'SHA-256' },
            false,
            ['encrypt']
        );

        // Encrypt the AES key with RSA
        const encryptedAesKey = await window.crypto.subtle.encrypt(
            { name: 'RSA-OAEP' },
            publicKey,
            aesKey
        );

        // Convert encrypted AES key, message, and IV to base64
        const base64EncryptedAesKey = await arrayBufferToBase64(encryptedAesKey);
        const base64EncryptedMessage = await arrayBufferToBase64(encryptedMessage);
        const base64Iv = await arrayBufferToBase64(iv);

        return {
            iv: base64Iv,
            encryptedMessage: base64EncryptedMessage,
            encryptedAesKey: base64EncryptedAesKey
        };
    } catch (error) {
        console.error('Encryption error:', error);
        throw new Error('Encryption failed');
    }
}


export async function securelyStorePrivateKey(privateKeyBytes) {
    // Example implementation: storing Base64 encoded string
    const base64PrivateKey = btoa(String.fromCharCode(...privateKeyBytes));
    // Use a secure storage method appropriate for your environment
    secureStorage.setItem("privateKey", base64PrivateKey);
}

// Import a public key from Base64
export async function importPublicKey(publicKeyBase64) {
    // Convert Base64 public key to ArrayBuffer
    const publicKeyBuffer = await base64ToArrayBuffer(publicKeyBase64);

    // Parse the public key Buffer as JWK
    const jwkKey = JSON.parse(new TextDecoder().decode(publicKeyBuffer));

    // Import the public key using Web Crypto API
    return window.crypto.subtle.importKey(
        'jwk',
        jwkKey,
        {
            name: 'RSA-OAEP',
            hash: 'SHA-256'
        },
        true,
        ['encrypt']
    );
}