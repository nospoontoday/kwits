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

// Utility function to derive a key from a PIN
async function deriveKey(pin, salt) {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(pin),
        'PBKDF2',
        false,
        ['deriveKey']
    );

    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: 100000,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
    );
}


export async function createKeyPair(pin) {
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
    const base64PrivateKey = btoa(String.fromCharCode(...new Uint8Array(privateKeyBuffer)));

    const salt = crypto.getRandomValues(new Uint8Array(16));
    const base64Salt = await arrayBufferToBase64(salt);

    // Derive a key from PIN
    const derivedKey = await deriveKey(pin, salt);

    // Encrypt the private key
    const { encryptedPrivateKey, iv } = await encryptPrivateKey(derivedKey, base64PrivateKey);

    // Decrypt the private key for testing
    const decryptedBase64PrivateKey = await decryptPrivateKey(derivedKey, encryptedPrivateKey, iv);
    
    // Ensure the original and decrypted private keys match
    if (decryptedBase64PrivateKey === base64PrivateKey) {
        console.log("Private key encryption/decryption successful.");
    } else {
        console.error("Private key encryption/decryption failed.");
    }

    // Store the encrypted private key and IV securely
    secureStorage.setItem("encryptedPrivateKey", encryptedPrivateKey);

    return {
        base64PublicKey,
        iv,
        encryptedPrivateKey,
        base64Salt,
    };
}


// Encrypt private key using a derived key
async function encryptPrivateKey(key, base64PrivateKey) {
    const iv = crypto.getRandomValues(new Uint8Array(12)); // Initialization vector
    const encoder = new TextEncoder();
    const data = encoder.encode(base64PrivateKey); // Convert to bytes for encryption
    const encryptedPrivateKey = await crypto.subtle.encrypt(
        {
            name: 'AES-GCM',
            iv: iv
        },
        key,
        data
    );

    return {
        encryptedPrivateKey: await arrayBufferToBase64(encryptedPrivateKey),
        iv: await arrayBufferToBase64(iv)
    };
}


async function decryptPrivateKey(key, encryptedPrivateKeyBase64, ivBase64) {
    try {
        // Decode Base64 strings to binary
        const encryptedPrivateKey = await base64ToArrayBuffer(encryptedPrivateKeyBase64);
        const iv = await base64ToArrayBuffer(ivBase64);

        // Decrypt the data using the derived key and IV
        const decryptedData = await crypto.subtle.decrypt(
            {
                name: 'AES-GCM',
                iv: new Uint8Array(iv)
            },
            key,
            new Uint8Array(encryptedPrivateKey)
        );

        const decoder = new TextDecoder();
        return decoder.decode(decryptedData); // Convert bytes back to string
    } catch (e) {
        console.error('Decryption error:', e);
        throw new Error('Decryption failed');
    }
}

export async function arrayBufferToBase64(buffer) {
    const uint8Array = new Uint8Array(buffer);
    const binaryString = String.fromCharCode(...uint8Array);
    return btoa(binaryString);
}

const requestPrivateKey = async (userId) => {
    
    const response = await axios.post(route('key.retrieve.private'), {
        user_id: userId,
    });
    
    const base64PrivateKey = response.data.private_key;

    secureStorage.setItem("encryptedPrivateKey", base64PrivateKey);
};
export async function decryptWithPrivateKey(message, userId, ivBase64, saltBase64, pin) {
    try {
        // Retrieve the private key from secure storage
        let storedEncryptedPrivateKey = secureStorage.getItem("encryptedPrivateKey");

        if (!storedEncryptedPrivateKey || (typeof storedEncryptedPrivateKey === 'object' && Object.keys(storedEncryptedPrivateKey).length === 0)) {
            await requestPrivateKey(userId);

            // Verify if the private key is stored after requesting
            storedEncryptedPrivateKey = secureStorage.getItem("encryptedPrivateKey");
            if (!storedEncryptedPrivateKey || (typeof storedEncryptedPrivateKey === 'object' && Object.keys(storedEncryptedPrivateKey).length === 0)) {
                throw new Error("Private key not found after requesting");
            }
        }

        // Convert Base64-encoded salt to ArrayBuffer
        const salt = await base64ToArrayBuffer(saltBase64);

        // Derive the key from PIN and salt
        const derivedKey = await deriveKey(pin, salt);

        // Decrypt the private key using the derived key
        const decryptedPrivateKeyBase64 = await decryptPrivateKey(derivedKey, storedEncryptedPrivateKey, ivBase64);

        const privateKeyArrayBuffer = Uint8Array.from(atob(decryptedPrivateKeyBase64), c => c.charCodeAt(0)).buffer;
        
        // Import the private key as a CryptoKey object
        const privateKey = await crypto.subtle.importKey(
            'pkcs8', // Private key format
            privateKeyArrayBuffer,
            {
                name: 'RSA-OAEP',
                hash: { name: 'SHA-256' }
            },
            true, // Whether the key is extractable
            ['decrypt'] // Key usages
        );

        // Extract and decode Base64 encoded encrypted AES key, encrypted message, and IV from the message
        const { encryptedMessage, iv, encryptedAesKey } = message[userId];

        // Validate and decode Base64 encoded encrypted AES key
        if (!isBase64(encryptedAesKey)) {
            throw new Error('Invalid Base64 encoding for encryptedAesKey');
        }
        const encryptedAesKeyBuffer = await base64ToArrayBuffer(encryptedAesKey);

        // Validate and decode Base64 encoded encrypted message
        if (!isBase64(encryptedMessage)) {
            throw new Error('Invalid Base64 encoding for encryptedMessage');
        }
        const encryptedMessageBuffer = await base64ToArrayBuffer(encryptedMessage);

        // Validate and decode Base64 encoded IV
        if (!isBase64(iv)) {
            throw new Error('Invalid Base64 encoding for iv');
        }
        const ivArray = new Uint8Array(await base64ToArrayBuffer(iv));

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