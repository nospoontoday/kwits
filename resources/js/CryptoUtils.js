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

    // Export the public key to send to the server
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

export async function decryptMessage(message, message_iv, message_key) {
    try {
        const ivArr = message_iv.split(',').map(Number);
        const iv = new Uint8Array(ivArr);
        const encryptedBuffer = await base64ToArrayBuffer(message);
        const jwkKey = {
            alg: "A128GCM",
            ext: true,
            k: message_key,
            key_ops: ["decrypt"],
            kty: "oct",
        }
        const cryptoKey = await window.crypto.subtle.importKey(
            "jwk",
            jwkKey,
            {
                name: "AES-GCM",
                length: 128,
            },
            true,
            ["decrypt"]
        );
        

        const decryptedBuffer = await window.crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: iv,
            },
            cryptoKey,
            encryptedBuffer
        );

        // Convert decryptedBuffer to a readable text
        const uint8Array = new Uint8Array(decryptedBuffer);
        const decoder = new TextDecoder();
        const decryptedText = decoder.decode(uint8Array);

        // const decrypted = await decryptWithPrivateKey(JSON.parse(message.message), currentUser.id);
        return decryptedText;
    } catch (error) {
        console.error("Failed to decrypt message:", error);
        return "Decryption failed";
    }
}

const requestPrivateKey = async (userId) => {
    
    const response = await axios.post(route('key.retrieve.private'), {
        user_id: userId,
    });
    
    // Assuming the response contains the Base64 encoded private key
    const base64PrivateKey = response.data.private_key;
    // console.log("INCOGNITO", base64PrivateKey); debugger;
    // console.log("INCOGNITO", base64PrivateKey); debugger;
    secureStorage.setItem("privateKey", base64PrivateKey);
};

export async function decryptWithPrivateKey(encryptedMessages, userId) {
    // if (!secureStorage.getItem("privateKey")) {
        await requestPrivateKey(userId);

        // Verify if the private key is stored after requesting
        if(!secureStorage.getItem("privateKey")) {
            throw new Error("Private key not found");
        }
    // }
    
    const storedPrivateKey = secureStorage.getItem("privateKey");

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
    
    // Check if we have the encrypted message for the user
    const encryptedMessage = encryptedMessages[userId];

    if (!encryptedMessage) {
        throw new Error("No encrypted message found for this user");
    }

    // Convert Base64 encoded encrypted message to ArrayBuffer
    const encryptedBuffer = Uint8Array.from(atob(encryptedMessage), c => c.charCodeAt(0)).buffer;

    // Decrypt the message
    const decryptedBuffer = await window.crypto.subtle.decrypt(
        { name: "RSA-OAEP" },
        privateKey,
        encryptedBuffer
    );

    // Convert decrypted ArrayBuffer to string
    const decoder = new TextDecoder();

    return decoder.decode(decryptedBuffer);
}

export async function encryptWithPublicKey(base64PublicKey, message) {
    // Decode the Base64 public key to a Uint8Array
    const publicKeyBytes = Uint8Array.from(atob(base64PublicKey), c => c.charCodeAt(0));

    // Import the public key for encryption
    const publicKey = await window.crypto.subtle.importKey(
        "spki",
        publicKeyBytes.buffer,
        { name: "RSA-OAEP", hash: "SHA-256" },
        false,
        ["encrypt"]
    );

    // Encrypt the message
    const encrypted = await window.crypto.subtle.encrypt(
        { name: "RSA-OAEP" },
        publicKey,
        new TextEncoder().encode(message)
    );

    // Convert the encrypted ArrayBuffer to a Base64-encoded string
    const encryptedBytes = new Uint8Array(encrypted);
    const base64Encrypted = btoa(String.fromCharCode(...encryptedBytes));

    return base64Encrypted;  // Return the Base64-encoded string
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