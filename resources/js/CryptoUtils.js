export async function base64ToArrayBuffer(base64) {
    // Decode Base64 to a binary string
    const binaryString = atob(base64);
    
    // Create a Uint8Array from the binary string
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Create an ArrayBuffer from the Uint8Array
    return bytes.buffer;
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