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
    const keyPair = await window.crypto.subtle.generateKey({
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: { name: "SHA-256" },
    }, true, ["encrypt", "decrypt"]);

    // Export the public key to send to the server
    const publicKeyBuffer = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);

    // Convert the public key ArrayBuffer to a Base64-encoded string
    const publicKeyBytes = new Uint8Array(publicKeyBuffer);
    const base64PublicKey = btoa(String.fromCharCode(...publicKeyBytes));

    // Securely store the private key
    const privateKey = keyPair.privateKey;
    await securelyStorePrivateKey(privateKey);

    return base64PublicKey; // Send this to the server
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

export async function decryptWithPrivateKey(encryptedMessages, userId) {
    // Retrieve the private key from secure storage
    const storedPrivateKey = secureStorage.getItem("privateKey");

    if (!storedPrivateKey) {
        throw new Error("Private key not found");
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


export async function checkAndGenerateKeys(user) {
    try {
        // Check if the user has keys in the database
        if (!user.public_key) {
            console.log('No keys found, generating new key pair...');

            const keyPair = await generateKeyPair();

            // Export both public and private keys
            const publicKeyBase64 = await exportPublicKey(keyPair.publicKey);
            const privateKeyBase64 = await exportPrivateKey(keyPair.privateKey);

            // Store both keys in the database
            await axios.post(route("key.store"), {
                public_key: publicKeyBase64,
                private_key: privateKeyBase64
            });

            // Store the private key in localStorage
            localStorage.setItem('privateKey', privateKeyBase64);

            console.log('Key pair generated and both keys stored.');
        } else {
            console.log('Keys already exist.');
        }
    } catch (error) {
        console.error('Error checking or generating keys:', error);
    }
}

// Function to export the public key
export async function exportPublicKey(publicKey) {
    const exported = await window.crypto.subtle.exportKey('jwk', publicKey);

    // Ensure the exported key includes the necessary properties
    return JSON.stringify({
        kty: exported.kty,
        e: exported.e,
        n: exported.n,
        alg: 'RSA-OAEP', // Ensure this matches the algorithm used for importing
        ext: exported.ext
    });
}

// Function to export the private key
export async function exportPrivateKey(privateKey) {
    const exported = await window.crypto.subtle.exportKey('pkcs8', privateKey);
    return arrayBufferToBase64(exported);
}

async function generateKeyPair() {
    return await window.crypto.subtle.generateKey(
        {
            name: "RSA-OAEP",
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]), // 65537
            hash: "SHA-256"
        },
        true,
        ["encrypt", "decrypt"]
    );
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


export async function securelyStorePrivateKey(privateKey) {
    const exportedPrivateKey = await window.crypto.subtle.exportKey("pkcs8", privateKey);
    secureStorage.setItem("privateKey", btoa(String.fromCharCode(...new Uint8Array(exportedPrivateKey))));
}

async function encryptPrivateKey(privateKey, pin) {
    // Convert the pin to an ArrayBuffer
    const enc = new TextEncoder();
    const pinBuffer = enc.encode(pin);

    // Derive a key from the pin using PBKDF2
    const keyMaterial = await window.crypto.subtle.importKey(
        "raw",
        pinBuffer,
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
    );

    const derivedKey = await window.crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: window.crypto.getRandomValues(new Uint8Array(16)), // Add a salt
            iterations: 100000, // Number of iterations
            hash: "SHA-256"
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt"]
    );

    // Export the private key to an ArrayBuffer
    const privateKeyBuffer = await window.crypto.subtle.exportKey('pkcs8', privateKey);

    // Encrypt the private key ArrayBuffer
    const iv = window.crypto.getRandomValues(new Uint8Array(12)); // Initialization vector
    const encryptedPrivateKey = await window.crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv: iv,
        },
        derivedKey,
        privateKeyBuffer // Use ArrayBuffer here
    );

    return {
        iv: arrayBufferToBase64(iv), // Convert to Base64 for storage
        encryptedPrivateKey: arrayBufferToBase64(encryptedPrivateKey) // Convert to Base64 for storage
    };
}

// Encrypt message for each user
export async function encryptMessageForUsers(message, publicKeys) {
    const encryptedMessages = {};

    for (const { userId, publicKeyBase64 } of publicKeys) {
        const publicKey = await importPublicKey(publicKeyBase64);
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const messageInBytes = new TextEncoder().encode(message);

        const encryptedBuffer = await window.crypto.subtle.encrypt(
            {
                name: "AES-GCM",
                iv,
            },
            publicKey,
            messageInBytes
        );

        encryptedMessages[userId] = await arrayBufferToBase64(encryptedBuffer);

    }

    return encryptedMessages;
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



async function encryptMessage(message, publicKeyBase64) {
    const publicKey = await importPublicKey(publicKeyBase64);

    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const messageInBytes = new TextEncoder().encode(message);

    return await window.crypto.subtle.encrypt(
        {
            name: "RSA-OAEP",
            iv
        },
        publicKey,
        messageInBytes
    );
}